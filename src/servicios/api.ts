import axios from 'axios';
import { obtenerToken } from './autenticacion';

<<<<<<< HEAD
// NOTA TÉCNICA: Se configura el túnel y el encabezado 'bypass-tunnel-reminder' 
// debido a restricciones en la red Wi-Fi local que bloquean la comunicación directa
// entre el celular y la IP local de la PC. Localtunnel puentea este bloqueo.
// 1. URL base desde variables de entorno con fallback a tu IP local
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.37:3000';
=======
// 1. URL base desde variables de entorno con fallback a tu IP local
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://c8f7fdn3-3000.brs.devtunnels.ms';
>>>>>>> 77ed4ba (Actualización MiRecorrido)

// 2. Instancia centralizada de Axios
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true', 
  },
});

// 3. Interceptor con logs de depuración
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
      console.error('⚠️ [Axios Error Token] Error al obtener el token:', err);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ [Axios Request Error]', error);
    return Promise.reject(error);
  }
);