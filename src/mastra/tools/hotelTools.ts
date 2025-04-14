/**
 * Hotel Booking Tools Implementation
 * 
 * This module provides a set of tools for hotel search, booking, and management using the LiteAPI.travel API.
 * It includes functionality for searching hotels, checking availability, managing bookings, and handling errors.
 */

import { createTool } from '@mastra/core/tools';
import axios from 'axios';
import { z } from 'zod';
import { handleApiError, validateDates, validateGuests, HotelApiError, validatePriceRange, validateStarRating, validateHotelId, validateRoomId, validateChildrenAges, validateName, validatePhoneNumber, validateBookingId } from '../utils/errorHandler.js';
import { ValidationError } from '../utils/errorHandler.js';

// API Configuration
const LITEAPI_BASE_URL = 'https://api.liteapi.travel/v3.0';
const apiKey = process.env.LITEAPI_KEY;

// API Key validation
if (!apiKey) {
  throw new HotelApiError('LITEAPI_KEY environment variable is not set');
}

if (!/^[A-Za-z0-9-_]+$/.test(apiKey)) {
  throw new HotelApiError('Invalid LITEAPI_KEY format');
}

/**
 * Interface for search parameters used in hotel searches
 */
interface SearchParams {
  city: string;
  country: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  currency: string;
  language: string;
  minPrice?: number;
  maxPrice?: number;
  starRating?: number;
  amenities?: string;
}

/**
 * Date Utility Functions
 */

/**
 * Formats a Date object to YYYY-MM-DD string
 */
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Returns the first day of a given month and year
 */
const getFirstDayOfMonth = (month: number, year: number): Date => {
  return new Date(year, month, 1);
};

/**
 * Adds specified number of days to a date
 */
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Gets a future date based on month name and year
 * If no month provided, returns tomorrow's date
 */
const getFutureDate = (monthName?: string, year?: number): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!monthName) {
    // Ensure we're getting tomorrow in the user's timezone
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  const targetMonth = new Date(Date.parse(`${monthName} 1, ${year || today.getFullYear()}`)).getMonth();
  const targetYear = year || today.getFullYear();
  const firstDayOfMonth = getFirstDayOfMonth(targetMonth, targetYear);

  // If the first day of the target month is in the past, use next year
  if (firstDayOfMonth < today) {
    return getFirstDayOfMonth(targetMonth, targetYear + 1);
  }

  return firstDayOfMonth;
};

/**
 * Interface Definitions
 */

/**
 * Represents hotel rate information
 */
interface HotelRate {
  price: number;
  currency: string;
}

/**
 * Represents hotel data as received from the API
 */
interface ApiHotel {
  id: string;
  name: string;
  rating: number;
  address: string;
  rates?: HotelRate[];
  description?: string;
  amenities?: string[];
  images?: string[];
}

/**
 * Represents formatted hotel data for display
 */
interface FormattedHotel {
  hotelId: string;
  name: string;
  rating: number | string;
  address: string;
  price: number | string;
  currency: string;
  description: string;
  amenities: string[];
  images: string[];
}

/**
 * Tool Implementations
 */

/**
 * Search Hotels Tool
 * Allows searching for hotels based on location, dates, and guest requirements
 */
export const searchHotelsTool = createTool({
  id: 'searchHotels',
  description: `Search for hotels based on location, dates, and guest requirements.
    Supports:
    - Location must be a specific city or area
    - Dates must be in YYYY-MM-DD format and cannot be in the past
    - If dates not provided, defaults to tomorrow for check-in and day after for check-out
    - Check-out date must be after check-in date
    - At least one adult is required (defaults to 1 if not specified)
    - Price range filtering (optional)
    - Star rating must be between 1 and 5 (optional)
    - Amenity filtering (optional)
    Returns up to 20 best matches sorted by relevance.`,
  inputSchema: z.object({
    location: z.string().describe('City or location to search in'),
    checkIn: z.string().optional().describe('Check-in date (YYYY-MM-DD format, defaults to tomorrow if not provided)'),
    checkOut: z.string().optional().describe('Check-out date (YYYY-MM-DD format, defaults to day after check-in if not provided)'),
    adults: z.number().min(1).default(1).describe('Number of adults (minimum 1, defaults to 1)'),
    children: z.number().optional().describe('Number of children'),
    month: z.string().optional().describe('Target month for check-in (e.g., "June")'),
    year: z.number().optional().describe('Target year for check-in'),
    stayDuration: z.number().optional().describe('Number of nights to stay'),
    filters: z.object({
      priceRange: z.object({
        min: z.number().optional(),
        max: z.number().optional()
      }).optional(),
      starRating: z.number().min(1).max(5).optional(),
      amenities: z.array(z.string()).optional()
    }).optional()
  }),
  async execute({ context }) {
    try {
      // Log masked API key for debugging
      const maskedKey = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'not set';
      console.log('Using API key:', maskedKey);

      // Location validation and formatting
      if (!context.location || context.location.toLowerCase() === 'anywhere') {
        throw new ValidationError('Please provide a specific city or location');
      }

      const locationParts = context.location.split(',').map(part => part.trim());
      const cityName = locationParts[0];
      const countryName = locationParts[1]?.trim() || '';
      
      // Map common country names to ISO codes
      const countryCodeMap: { [key: string]: string } = {
        'romania': 'RO',
        'united kingdom': 'GB',
        'uk': 'GB',
        'united states': 'US',
        'usa': 'US',
        'france': 'FR',
        'germany': 'DE',
        'italy': 'IT',
        'spain': 'ES'
        // Add more mappings as needed
      };

      // Determine country code
      let countryCode = 'GB'; // Default fallback
      if (countryName) {
        const normalizedCountry = countryName.toLowerCase();
        countryCode = countryCodeMap[normalizedCountry] || countryCode;
      }

      // Store original location for error messages
      const originalLocation = countryName ? `${cityName}, ${countryName}` : cityName;

      // Date handling logic
      let checkInDate: Date;
      let checkOutDate: Date;

      if (context.month) {
        // Handle month-based booking
        checkInDate = getFutureDate(context.month, context.year);
        checkOutDate = addDays(checkInDate, context.stayDuration || 1);
        
        console.log('Month-based dates:', {
          requestedMonth: context.month,
          requestedYear: context.year,
          calculatedCheckIn: checkInDate,
          calculatedCheckOut: checkOutDate
        });
      } else if (context.checkIn) {
        // Handle specific dates
        checkInDate = new Date(context.checkIn);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (checkInDate < today) {
          checkInDate = getFutureDate();
        }
        checkOutDate = context.checkOut ? new Date(context.checkOut) : addDays(checkInDate, context.stayDuration || 1);
      } else {
        // Default to tomorrow
        checkInDate = getFutureDate();
        checkOutDate = addDays(checkInDate, context.stayDuration || 1);
      }

      const checkin = formatDate(checkInDate);
      const checkout = formatDate(checkOutDate);

      console.log('Using dates:', { checkin, checkout });

      // Validation
      validateDates(checkin, checkout);
      const adults = context.adults || 1;
      validateGuests(adults, context.children);

      if (context.filters?.priceRange) {
        validatePriceRange(context.filters.priceRange.min, context.filters.priceRange.max);
      }
      if (context.filters?.starRating) {
        validateStarRating(context.filters.starRating);
      }

      // Prepare API request parameters
      const searchParams = {
        hotelIds: [],
        occupancies: [
          {
            adults: adults,
            children: context.children ? [context.children] : [],
            rooms: 1
          }
        ],
        checkin,
        checkout,
        currency: 'USD',
        guestNationality: 'RO',
        cityName,
        countryCode,
        limit: 20,
        sort: [
          {
            field: "price",
            direction: "ascending"
          }
        ]
      };

      // Add star rating filter if specified
      if (context.filters?.starRating) {
        Object.assign(searchParams, {
          minRating: context.filters.starRating
        });
      }

      console.log('Search request:', JSON.stringify(searchParams, null, 2));

      // Make API call
      const response = await axios.post(`${LITEAPI_BASE_URL}/hotels/rates`, searchParams, {
        headers: {
          'X-API-KEY': apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('Search response status:', response.status);
      
      // Validate response
      if (!response.data || !response.data.hotels || response.data.hotels.length === 0) {
        throw new ValidationError(`No available hotels found in ${originalLocation} for the specified dates. Please try different dates or verify the location.`);
      }

      // Format hotel data
      const hotels = response.data.hotels.map((hotel: ApiHotel): FormattedHotel => ({
        hotelId: hotel.id || '',
        name: hotel.name,
        rating: hotel.rating || 'Not rated',
        address: hotel.address,
        price: hotel.rates?.[0]?.price || 'Price not available',
        currency: hotel.rates?.[0]?.currency || 'USD',
        description: hotel.description || '',
        amenities: hotel.amenities || [],
        images: hotel.images || []
      }));

      // Store hotels for future reference
      const hotelDetails = hotels.reduce((acc: Record<string, FormattedHotel>, hotel: FormattedHotel) => {
        acc[hotel.hotelId] = hotel;
        return acc;
      }, {});

      // Format response
      return `I found several hotels in ${cityName}, ${countryCode} for you. Here are the options:

${hotels.map((hotel: FormattedHotel) => 
  `${hotel.name} - Rating: ${hotel.rating}
   Address: ${hotel.address}
   ${hotel.description ? `Description: ${hotel.description}\n` : ''}
   ${hotel.amenities?.length ? `Key Amenities: ${hotel.amenities.slice(0, 5).join(', ')}\n` : ''}
   ${typeof hotel.price === 'number' ? `Price: ${hotel.price} ${hotel.currency}` : 'Price: Contact hotel for rates'}`
).join('\n\n')}

Each hotel offers unique features and amenities. Would you like to:
1. Get more detailed information about any specific hotel
2. Check room availability and prices for specific dates
3. See photos or amenities for a particular hotel

Just let me know what interests you!`;
    } catch (error) {
      // Error handling with detailed logging
      const apiError = error as Error;
      console.error('API error details:', {
        message: apiError.message,
        response: axios.isAxiosError(apiError) ? {
          status: apiError.response?.status,
          data: apiError.response?.data,
          headers: apiError.response?.headers
        } : null
      });

      if (axios.isAxiosError(apiError)) {
        if (apiError.response?.status === 404) {
          throw new ValidationError(`No hotels found in ${context.location}. Please verify the location name or try a nearby city.`);
        }
        if (apiError.response?.status === 400) {
          const errorMsg = apiError.response?.data?.error?.message || 'Please check your search parameters';
          console.error('Bad request error:', errorMsg);
          throw new ValidationError(`Invalid request: ${errorMsg}`);
        }
        if (apiError.response?.status === 401 || apiError.response?.status === 403) {
          throw new ValidationError('API authentication failed. Please check your API key.');
        }
        throw new ValidationError(`API Error: ${apiError.response?.data?.error?.message || apiError.message}`);
      }
      throw apiError;
    }
  }
});

/**
 * Hotel Details Tool
 * Retrieves detailed information about a specific hotel
 */
export const getHotelDetailsTool = createTool({
  id: 'getHotelDetails',
  description: 'Get comprehensive information about a specific hotel including amenities, policies, and room types',
  inputSchema: z.object({
    hotelId: z.string().describe('Hotel ID from search results'),
    includeRooms: z.boolean().optional().describe('Whether to include detailed room information')
  }),
  async execute({ context }) {
    try {
      validateHotelId(context.hotelId);
      
      // Fetch hotel details
      const response = await axios.get(`${LITEAPI_BASE_URL}/hotels/${context.hotelId}`, {
        headers: { 
          'X-API-KEY': apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('Hotel details response status:', response.status);
      console.log('Hotel details response:', JSON.stringify(response.data, null, 2));

      if (!response.data || !response.data.hotel) {
        throw new ValidationError('No hotel details found for the specified hotel.');
      }

      const hotel = response.data.hotel;

      // Format response
      return `Here are the detailed information about ${hotel.name}:

Rating: ${hotel.rating || 'Not rated'} / 10
Address: ${hotel.address}

Description:
${hotel.description || 'No detailed description available.'}

Key Features:
${hotel.amenities ? '- ' + hotel.amenities.join('\n- ') : 'No amenity information available.'}

Hotel Policies:
${hotel.policies ? Object.entries(hotel.policies).map(([key, value]) => `${key}: ${value}`).join('\n') : 'No policy information available.'}

${hotel.images && hotel.images.length > 0 ? `\nThe hotel has ${hotel.images.length} photos available.` : ''}

Would you like to:
1. Check room availability and prices for specific dates
2. See available room types
3. View hotel policies in detail
4. Check guest reviews

Just let me know what interests you!`;
    } catch (error) {
      // Detailed error handling
      console.error('Error fetching hotel details:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new ValidationError('Hotel not found. The hotel ID might be invalid or the hotel is no longer available.');
        }
        if (error.response?.status === 400) {
          throw new ValidationError('Invalid request. Please check the hotel ID.');
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new ValidationError('API authentication failed. Please check your API key.');
        }
        throw new ValidationError(`API Error: ${error.response?.data?.error?.message || error.message}`);
      }
      
      throw new ValidationError('Unable to fetch hotel details. Please try again later.');
    }
  }
});

/**
 * Availability Check Tool
 * Checks room availability and pricing for specific dates
 */
export const checkAvailabilityTool = createTool({
  id: 'checkAvailability',
  description: 'Check room availability and get detailed pricing for specific dates',
  inputSchema: z.object({
    hotelId: z.string().describe('Hotel ID'),
    checkIn: z.string().describe('Check-in date (YYYY-MM-DD)'),
    checkOut: z.string().describe('Check-out date (YYYY-MM-DD)'),
    adults: z.number().describe('Number of adults'),
    children: z.number().optional().describe('Number of children'),
    roomTypes: z.array(z.string()).optional().describe('Specific room types to check')
  }),
  async execute({ context }) {
    try {
      validateDates(context.checkIn, context.checkOut);
      validateGuests(context.adults, context.children);

      const response = await axios.get(`${LITEAPI_BASE_URL}/hotels/${context.hotelId}/rates`, {
        headers: { 'X-API-KEY': apiKey },
        params: {
          checkIn: context.checkIn,
          checkOut: context.checkOut,
          adults: context.adults,
          children: context.children ?? 0,
          currency: 'USD',
          roomTypes: context.roomTypes?.join(',')
        },
      });
      return response.data;
    } catch (error: unknown) {
      throw handleApiError(error);
    }
  },
});

/**
 * Room Details Tool
 * Gets detailed information about specific room types
 */
export const getRoomDetailsTool = createTool({
  id: 'getRoomDetails',
  description: 'Get detailed information about specific room types including amenities and policies',
  inputSchema: z.object({
    hotelId: z.string().describe('Hotel ID'),
    roomId: z.string().describe('Room type ID'),
  }),
  async execute({ context }) {
    try {
      validateHotelId(context.hotelId);
      validateRoomId(context.roomId);
      
      const response = await axios.get(`${LITEAPI_BASE_URL}/hotels/${context.hotelId}/rooms/${context.roomId}`, {
        headers: { 'X-API-KEY': apiKey },
      });
      return response.data;
    } catch (error: unknown) {
      throw handleApiError(error);
    }
  }
});

/**
 * Booking Creation Tool
 * Creates a new hotel booking
 */
export const createBookingTool = createTool({
  id: 'createBooking',
  description: 'Create a hotel booking for specified rooms and dates',
  inputSchema: z.object({
    hotelId: z.string().describe('Hotel ID'),
    roomId: z.string().describe('Room type ID'),
    checkIn: z.string().describe('Check-in date (YYYY-MM-DD)'),
    checkOut: z.string().describe('Check-out date (YYYY-MM-DD)'),
    guests: z.object({
      adults: z.number(),
      children: z.number().optional(),
      childrenAges: z.array(z.number()).optional()
    }),
    guestInfo: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
      phone: z.string().optional()
    }),
    specialRequests: z.string().optional()
  }),
  async execute({ context }) {
    try {
      // Validate all inputs
      validateHotelId(context.hotelId);
      validateRoomId(context.roomId);
      validateDates(context.checkIn, context.checkOut);
      validateGuests(context.guests.adults, context.guests.children);
      validateChildrenAges(context.guests.children, context.guests.childrenAges);
      validateName(context.guestInfo.firstName);
      validateName(context.guestInfo.lastName);
      if (context.guestInfo.phone) {
        validatePhoneNumber(context.guestInfo.phone);
      }

      const response = await axios.post(`${LITEAPI_BASE_URL}/hotels/${context.hotelId}/bookings`, {
        roomId: context.roomId,
        checkIn: context.checkIn,
        checkOut: context.checkOut,
        guests: context.guests,
        guestInfo: context.guestInfo,
        specialRequests: context.specialRequests,
      }, {
        headers: { 'X-API-KEY': apiKey },
      });
      return response.data;
    } catch (error: unknown) {
      throw handleApiError(error);
    }
  }
});

/**
 * Booking Status Tool
 * Checks the status of an existing booking
 */
export const getBookingStatusTool = createTool({
  id: 'getBookingStatus',
  description: 'Check the status of an existing booking',
  inputSchema: z.object({
    bookingId: z.string().describe('Booking reference number'),
    email: z.string().email().optional().describe('Guest email for verification')
  }),
  async execute({ context }) {
    try {
      validateBookingId(context.bookingId);
      
      const response = await axios.get(`${LITEAPI_BASE_URL}/bookings/${context.bookingId}`, {
        headers: { 'X-API-KEY': apiKey },
        params: {
          email: context.email,
        },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
});

/**
 * Booking Cancellation Tool
 * Cancels an existing booking
 */
export const cancelBookingTool = createTool({
  id: 'cancelBooking',
  description: 'Cancel an existing booking',
  inputSchema: z.object({
    bookingId: z.string().describe('Booking reference number'),
    reason: z.string().optional().describe('Reason for cancellation'),
    email: z.string().email().describe('Guest email for verification')
  }),
  async execute({ context }) {
    try {
      validateBookingId(context.bookingId);
      
      const response = await axios.post(`${LITEAPI_BASE_URL}/bookings/${context.bookingId}/cancel`, {
        reason: context.reason,
        email: context.email,
      }, {
        headers: { 'X-API-KEY': apiKey },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}); 