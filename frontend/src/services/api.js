import axios from 'axios';

const getBaseURL = () => {
  // Use environment variable from Vite .env file
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (baseUrl) {
    // Remove /api from the end if it's included
    return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
  }
  
  // Fallback to localhost for development
  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

console.log('✓ API Base URL:', api.defaults.baseURL);

// Interceptor to add JWT token
api.interceptors.request.use((config) => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    try {
      const { token } = JSON.parse(userInfo);
      config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      console.error('Error parsing userInfo:', e);
    }
  }
  return config;
});

// Error interceptor for debugging
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export default api;
