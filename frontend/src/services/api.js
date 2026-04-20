import axios from 'axios';

const api = axios.create({
  baseURL: 'http://10.46.47.10:5000/api',
});

// Interceptor to add JWT token
api.interceptors.request.use((config) => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    const { token } = JSON.parse(userInfo);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
