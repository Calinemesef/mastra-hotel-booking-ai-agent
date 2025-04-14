import { AxiosError } from 'axios';

// Custom error types
export class HotelApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'HotelApiError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class BookingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingError';
  }
}

// Error messages for common scenarios
export const ErrorMessages = {
  INVALID_DATES: 'Check-out date must be after check-in date',
  INVALID_GUESTS: 'Number of guests must be at least 1',
  MISSING_LOCATION: 'Location is required',
  RATE_LIMIT: 'Rate limit exceeded. Please try again in a few minutes',
  INVALID_API_KEY: 'Invalid API key. Please check your credentials',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  NETWORK_ERROR: 'Network error occurred. Please check your connection',
  INVALID_HOTEL_ID: 'Invalid hotel ID format',
  INVALID_ROOM_ID: 'Invalid room ID format',
  INVALID_BOOKING_ID: 'Invalid booking ID format',
  INVALID_PHONE: 'Invalid phone number format',
  INVALID_NAME: 'Name should only contain letters and spaces',
  INVALID_PRICE_RANGE: 'Maximum price must be greater than minimum price',
  INVALID_STAR_RATING: 'Star rating must be between 1 and 5',
  INVALID_CHILDREN_AGES: 'Children ages must be between 0 and 17',
  MISSING_CHILDREN_AGES: 'Children ages are required when children are specified',
};

// Input validation functions
export const validateDates = (checkIn: string, checkOut: string): void => {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  
  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    throw new ValidationError('Invalid date format. Please use YYYY-MM-DD');
  }
  
  if (checkOutDate <= checkInDate) {
    throw new ValidationError(ErrorMessages.INVALID_DATES);
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (checkInDate < today) {
    throw new ValidationError('Check-in date cannot be in the past');
  }
};

export const validateGuests = (adults: number, children?: number): void => {
  if (adults < 1) {
    throw new ValidationError('At least one adult guest is required');
  }
  
  if (children && children < 0) {
    throw new ValidationError('Number of children cannot be negative');
  }
};

export const validateHotelId = (hotelId: string): void => {
  // Adjust regex based on LiteAPI's hotel ID format
  if (!/^[A-Za-z0-9-]+$/.test(hotelId)) {
    throw new ValidationError(ErrorMessages.INVALID_HOTEL_ID);
  }
};

export const validateRoomId = (roomId: string): void => {
  // Adjust regex based on LiteAPI's room ID format
  if (!/^[A-Za-z0-9-]+$/.test(roomId)) {
    throw new ValidationError(ErrorMessages.INVALID_ROOM_ID);
  }
};

export const validateBookingId = (bookingId: string): void => {
  // Adjust regex based on LiteAPI's booking ID format
  if (!/^[A-Za-z0-9-]+$/.test(bookingId)) {
    throw new ValidationError(ErrorMessages.INVALID_BOOKING_ID);
  }
};

export const validatePhoneNumber = (phone?: string): void => {
  if (phone && !/^\+?[\d\s-()]+$/.test(phone)) {
    throw new ValidationError(ErrorMessages.INVALID_PHONE);
  }
};

export const validateName = (name: string): void => {
  if (!/^[A-Za-z\s'-]+$/.test(name)) {
    throw new ValidationError(ErrorMessages.INVALID_NAME);
  }
};

export const validatePriceRange = (min?: number, max?: number): void => {
  if (min !== undefined && max !== undefined && min > max) {
    throw new ValidationError(ErrorMessages.INVALID_PRICE_RANGE);
  }
};

export const validateStarRating = (rating?: number): void => {
  if (rating !== undefined && (rating < 1 || rating > 5)) {
    throw new ValidationError(ErrorMessages.INVALID_STAR_RATING);
  }
};

export const validateChildrenAges = (children?: number, childrenAges?: number[]): void => {
  if (children && children > 0) {
    if (!childrenAges || childrenAges.length !== children) {
      throw new ValidationError(ErrorMessages.MISSING_CHILDREN_AGES);
    }
    
    for (const age of childrenAges) {
      if (age < 0 || age > 17) {
        throw new ValidationError(ErrorMessages.INVALID_CHILDREN_AGES);
      }
    }
  }
};

// API error handler
export const handleApiError = (error: unknown): never => {
  if (error instanceof AxiosError) {
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message;

    switch (statusCode) {
      case 400:
        throw new HotelApiError('Invalid request: ' + errorMessage, statusCode);
      case 401:
        throw new HotelApiError(ErrorMessages.INVALID_API_KEY, statusCode);
      case 404:
        throw new HotelApiError('Resource not found: ' + errorMessage, statusCode);
      case 429:
        throw new HotelApiError(ErrorMessages.RATE_LIMIT, statusCode);
      case 500:
        throw new HotelApiError('Server error: ' + errorMessage, statusCode);
      case 503:
        throw new HotelApiError(ErrorMessages.SERVICE_UNAVAILABLE, statusCode);
      default:
        if (!error.response) {
          throw new HotelApiError(ErrorMessages.NETWORK_ERROR);
        }
        throw new HotelApiError('API error: ' + errorMessage, statusCode);
    }
  }
  
  throw new HotelApiError('Unknown error occurred');
}; 