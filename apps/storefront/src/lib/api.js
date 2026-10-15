import axios from 'axios';

// Vite env variables start with VITE_
// In dev, always call the API through the Vite proxy (same-origin) so that
// session cookies (guest cart) are not blocked by the browser's cross-site
// cookie policy. In production the absolute URL is used.
const API_URL = import.meta.env.DEV
  ? '/api/v1'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000/api');

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies (refresh tokens) if cross-origin
});

let activeRequests = 0;

const startRequest = () => {
  if (activeRequests === 0) {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('api:start'));
  }
  activeRequests++;
};

const endRequest = () => {
  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests === 0) {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('api:idle'));
  }
};

export const getActiveRequests = () => activeRequests;

api.interceptors.request.use((config) => {
  startRequest();
  return config;
}, (error) => {
  endRequest();
  return Promise.reject(error);
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    endRequest();
    return response.data; // Strip axios envelope, return the response JSON
  },
  async (error) => {
    endRequest();
    const originalRequest = error.config;
    
    // If 401 Unauthorized and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        startRequest(); // Start request for refresh
        // Attempt to refresh the token
        await axios.post(`${API_URL}/auth/refresh`, {}, {
          withCredentials: true,
        });
        endRequest(); // End refresh request
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        endRequest(); // Ensure we end if it throws
        // Refresh failed (e.g., refresh token expired)
        // Dispatch event to clear user state
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
