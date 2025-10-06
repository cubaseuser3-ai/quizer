// API Configuration
export const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://quizer-backend.onrender.com'
    : 'http://localhost:3001')

export const WS_URL = import.meta.env.VITE_WS_URL || API_URL

export const isDevelopment = import.meta.env.DEV
export const isProduction = import.meta.env.PROD
