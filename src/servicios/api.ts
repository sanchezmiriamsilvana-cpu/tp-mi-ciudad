import { create } from 'axios';
import { obtenerToken } from './sesion';
import { API_TIMEOUT_MS, BASE_URL } from '../config/env';

// Reexporta la URL validada para no romper importaciones existentes.
export { BASE_URL };

// 1. Instancia centralizada de Axios
export const api = create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
  },
});

// 2. Interceptor con logs de depuración
api.interceptors.request.use(
  async (config) => {
    console.log(`🌐 [Axios Request] ${config.method?.toUpperCase()} -> ${config.baseURL}${config.url}`);
    
    try {
      const token = await obtenerToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 [Axios] Token adjuntado con éxito');
      }
    } catch (err) {
      console.warn('⚠️ [Axios Error Token] Error al obtener el token:', err);
    }
    
    return config;
  },
  (error) => {
    console.warn('❌ [Axios Request Error]', error);
    return Promise.reject(error);
  }
);
