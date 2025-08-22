// Simple user session management
// In a real application, you'd use proper authentication
// For now, we'll use a simple user ID from localStorage

export const getUserId = (): string => {
  // Try to get user ID from localStorage
  let userId = localStorage.getItem('lexiClearUserId');
  
  // If no user ID exists, create a new one
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem('lexiClearUserId', userId);
  }
  
  return userId;
};

export const setUserId = (userId: string): void => {
  localStorage.setItem('lexiClearUserId', userId);
};

export const clearUserSession = (): void => {
  localStorage.removeItem('lexiClearUserId');
};

const generateUserId = (): string => {
  // Generate a random user ID
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  // Initialize user ID on first load
  getUserId();
}
