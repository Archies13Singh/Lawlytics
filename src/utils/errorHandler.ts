export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

export function createError(message: string, code?: string, details?: any): AppError {
  return {
    message,
    code,
    details,
  };
}

export function handleApiError(error: any): AppError {
  if (error instanceof Error) {
    return createError(error.message, 'UNKNOWN_ERROR', { originalError: error });
  }
  
  if (typeof error === 'string') {
    return createError(error, 'STRING_ERROR');
  }
  
  if (error && typeof error === 'object') {
    return createError(
      error.message || 'An unknown error occurred',
      error.code || 'OBJECT_ERROR',
      error
    );
  }
  
  return createError('An unknown error occurred', 'UNKNOWN_ERROR', { originalError: error });
}

export function isFirebaseError(error: any): boolean {
  return error && error.code && error.message && error.code.startsWith('auth/');
}

export function getFirebaseErrorMessage(error: any): string {
  if (!isFirebaseError(error)) {
    return 'An authentication error occurred';
  }
  
  const errorMessages: { [key: string]: string } = {
    'auth/user-not-found': 'No account found with this email address',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password': 'Password is too weak. Please choose a stronger password',
    'auth/invalid-email': 'Please enter a valid email address',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later',
    'auth/user-disabled': 'This account has been disabled',
    'auth/operation-not-allowed': 'This operation is not allowed',
    'auth/network-request-failed': 'Network error. Please check your connection',
  };
  
  return errorMessages[error.code] || error.message || 'An authentication error occurred';
}

export function logError(error: AppError, context?: string) {
  const logData = {
    timestamp: new Date().toISOString(),
    context,
    error: {
      message: error.message,
      code: error.code,
      details: error.details,
    },
  };
  
  console.error('Application Error:', logData);
  
  // In production, you might want to send this to an error tracking service
  // like Sentry, LogRocket, etc.
}
