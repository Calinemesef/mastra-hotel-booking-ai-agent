import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import type { Tool, ToolExecutionContext } from '@mastra/core/tools';
import axios from 'axios';
import {
  searchHotelsTool,
  getHotelDetailsTool,
  checkAvailabilityTool,
  getRoomDetailsTool,
  createBookingTool,
  getBookingStatusTool,
  cancelBookingTool
} from '../tools/hotelTools.js';
import { HotelApiError, ValidationError } from '../utils/errorHandler.js';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock environment variables
process.env.LITEAPI_KEY = 'test-api-key';

// Test data
const validHotelId = 'hotel123';
const validRoomId = 'room456';
const validBookingId = 'booking789';
const validDates = {
  checkIn: '2024-12-25',
  checkOut: '2024-12-30'
};

const validGuests = {
  adults: 2,
  children: 1,
  childrenAges: [10]
};

const validGuestInfo = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890'
};

// Type assertions for tools
interface ExecutableTool extends Tool<any, any, ToolExecutionContext<any>> {
  execute: (params: { context: any }) => Promise<any>;
}

const assertedSearchHotelsTool = searchHotelsTool as ExecutableTool;
const assertedGetHotelDetailsTool = getHotelDetailsTool as ExecutableTool;
const assertedCheckAvailabilityTool = checkAvailabilityTool as ExecutableTool;
const assertedCreateBookingTool = createBookingTool as ExecutableTool;
const assertedGetBookingStatusTool = getBookingStatusTool as ExecutableTool;
const assertedCancelBookingTool = cancelBookingTool as ExecutableTool;

describe('Hotel Booking Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchHotelsTool', () => {
    test('successfully searches hotels with valid parameters', async () => {
      const mockResponse = { 
        data: { 
          hotels: [
            { 
              id: '1', 
              name: 'Test Hotel',
              rating: 4,
              address: 'Test Address',
              rates: [{ price: 150, currency: 'USD' }]
            }
          ] 
        } 
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await assertedSearchHotelsTool.execute({
        context: {
          location: 'New York, United States',
          ...validDates,
          ...validGuests,
          filters: {
            priceRange: { min: 100, max: 200 },
            starRating: 4
          }
        }
      });

      expect(result).toContain('Test Hotel');
      expect(result).toContain('Rating: 4');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/hotels/rates'),
        expect.objectContaining({
          cityName: 'New York',
          countryCode: 'US'
        }),
        expect.any(Object)
      );
    });

    test('throws ValidationError for invalid dates', async () => {
      await expect(assertedSearchHotelsTool.execute({
        context: {
          location: 'New York, United States',
          checkIn: '2024-12-30',
          checkOut: '2024-12-25',
          adults: 2
        }
      })).rejects.toThrow(ValidationError);
    });

    test('throws ValidationError for invalid guest count', async () => {
      await expect(assertedSearchHotelsTool.execute({
        context: {
          location: 'New York, United States',
          ...validDates,
          adults: 0
        }
      })).rejects.toThrow(ValidationError);
    });

    test('handles API errors appropriately', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { 
          status: 404,
          data: { 
            error: { message: 'No hotels found' }
          }
        }
      });

      await expect(assertedSearchHotelsTool.execute({
        context: {
          location: 'NonExistent City, United States',
          ...validDates,
          ...validGuests
        }
      })).rejects.toThrow(ValidationError);
    });

    test('handles missing location information', async () => {
      await expect(assertedSearchHotelsTool.execute({
        context: {
          location: '',
          ...validDates,
          ...validGuests
        }
      })).rejects.toThrow('Please provide a specific city or location');
    });

    test('uses correct country code mapping', async () => {
      const mockResponse = { 
        data: { 
          hotels: [
            { 
              id: '1', 
              name: 'Test Hotel Romania',
              rating: 4,
              address: 'Test Address Romania',
              rates: [{ price: 150, currency: 'USD' }]
            }
          ] 
        } 
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await assertedSearchHotelsTool.execute({
        context: {
          location: 'Bucharest, Romania',
          ...validDates,
          ...validGuests
        }
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          cityName: 'Bucharest',
          countryCode: 'RO'
        }),
        expect.any(Object)
      );
    });
  });

  describe('getHotelDetailsTool', () => {
    test('successfully gets hotel details', async () => {
      const mockResponse = { data: { id: validHotelId, name: 'Test Hotel' } };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await assertedGetHotelDetailsTool.execute({
        context: { hotelId: validHotelId }
      });

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`/hotels/${validHotelId}`),
        expect.any(Object)
      );
    });

    test('throws ValidationError for invalid hotel ID', async () => {
      await expect(assertedGetHotelDetailsTool.execute({
        context: { hotelId: '!invalid!' }
      })).rejects.toThrow(ValidationError);
    });
  });

  describe('checkAvailabilityTool', () => {
    test('successfully checks room availability', async () => {
      const mockResponse = { data: { available: true, rates: [] } };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await assertedCheckAvailabilityTool.execute({
        context: {
          hotelId: validHotelId,
          ...validDates,
          ...validGuests
        }
      });

      expect(result).toEqual(mockResponse.data);
    });

    test('includes room types in query when specified', async () => {
      const mockResponse = { data: { available: true, rates: [] } };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await assertedCheckAvailabilityTool.execute({
        context: {
          hotelId: validHotelId,
          ...validDates,
          ...validGuests,
          roomTypes: ['standard', 'deluxe']
        }
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            roomTypes: 'standard,deluxe'
          })
        })
      );
    });
  });

  describe('createBookingTool', () => {
    const validBookingRequest = {
      hotelId: validHotelId,
      roomId: validRoomId,
      ...validDates,
      guests: { ...validGuests, childrenAges: [...validGuests.childrenAges] },
      guestInfo: validGuestInfo
    };

    test('successfully creates a booking', async () => {
      const mockResponse = { data: { bookingId: validBookingId } };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await assertedCreateBookingTool.execute({
        context: validBookingRequest
      });

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining(`/hotels/${validHotelId}/bookings`),
        expect.any(Object),
        expect.any(Object)
      );
    });

    test('validates all required guest information', async () => {
      const invalidRequest = {
        ...validBookingRequest,
        guestInfo: {
          ...validGuestInfo,
          firstName: '123' // Invalid name
        }
      };

      await expect(assertedCreateBookingTool.execute({
        context: invalidRequest
      })).rejects.toThrow(ValidationError);
    });

    test('validates children ages when children are specified', async () => {
      const invalidRequest = {
        ...validBookingRequest,
        guests: {
          adults: 2,
          children: 2,
          childrenAges: [10] // Only one age for two children
        }
      };

      await expect(assertedCreateBookingTool.execute({
        context: invalidRequest
      })).rejects.toThrow(ValidationError);
    });
  });

  describe('booking management tools', () => {
    test('successfully gets booking status', async () => {
      const mockResponse = { data: { status: 'confirmed' } };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await assertedGetBookingStatusTool.execute({
        context: {
          bookingId: validBookingId,
          email: validGuestInfo.email
        }
      });

      expect(result).toEqual(mockResponse.data);
    });

    test('successfully cancels booking', async () => {
      const mockResponse = { data: { status: 'cancelled' } };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await assertedCancelBookingTool.execute({
        context: {
          bookingId: validBookingId,
          email: validGuestInfo.email,
          reason: 'Change of plans'
        }
      });

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('error handling across all tools', () => {
    const testCases = [
      { status: 400, expected: 'Invalid request' },
      { status: 401, expected: 'Invalid API key' },
      { status: 404, expected: 'Resource not found' },
      { status: 429, expected: 'Rate limit exceeded' },
      { status: 500, expected: 'Server error' },
      { status: 503, expected: 'Service temporarily unavailable' }
    ];

    testCases.forEach(({ status, expected }) => {
      test(`handles ${status} status code appropriately`, async () => {
        mockedAxios.get.mockRejectedValueOnce({
          response: { status, data: { message: 'Error message' } }
        });

        await expect(assertedSearchHotelsTool.execute({
          context: {
            location: 'New York',
            ...validDates,
            ...validGuests
          }
        })).rejects.toThrow(expected);
      });
    });

    test('handles network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(assertedSearchHotelsTool.execute({
        context: {
          location: 'New York',
          ...validDates,
          ...validGuests
        }
      })).rejects.toThrow(HotelApiError);
    });
  });
}); 