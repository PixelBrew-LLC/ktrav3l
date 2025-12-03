import axios from 'axios';

// Para runtime: detectar si estamos en el navegador y usar window.location
const getApiUrl = () => {
  // Si está definida en build time, usarla
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Si estamos en el navegador, detectar el dominio
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'ktrav3l.com' || hostname === 'www.ktrav3l.com') {
      return 'https://api.ktrav3l.com';
    }
  }
  
  // Fallback a localhost
  return 'http://localhost:3000';
};

const API_URL = getApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token de autenticación
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Limpiar token y redirigir al login
      localStorage.removeItem('token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export default api;
