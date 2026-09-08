import { AxiosError } from 'axios';
import Toast from 'react-native-toast-message';
import { NetworkUnavailableError } from '@/core/errors/NetworkUnavailableError';

const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred';

export const extractApiErrorMessage = (error: unknown): string => {
  if (error instanceof NetworkUnavailableError) {
    return 'No internet connection. You can keep working with local data.';
  }

  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please try again.';
    }

    if (error.response) {
      switch (error.response.status) {
        case 400:
          return error.response.data?.message || 'Invalid request';
        case 401:
          return 'Unauthorized. Please log in again.';
        case 403:
          return 'Access denied';
        case 404:
          return 'Resource not found';
        case 429:
          return 'Too many requests. Please try again later.';
        case 500:
          return 'Server error. Please try again later.';
        default:
          return error.response.data?.message || `Error ${error.response.status}`;
      }
    }

    if (error.request) {
      return 'Network error. Please check your connection.';
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return DEFAULT_ERROR_MESSAGE;
};

export const handleApiError = (error: unknown, showToast: boolean = true) => {
  const message = extractApiErrorMessage(error);

  if (showToast) {
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: message,
    });
  }

  return message;
};
