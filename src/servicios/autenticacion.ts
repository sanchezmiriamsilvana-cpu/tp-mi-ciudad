import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import { isAxiosError } from 'axios';

import { api } from './api';
import { mensajeDeErrorApi } from './errores';
import {
  borrarToken,
  guardarToken,
  guardarUsuario,
  obtenerToken,
  obtenerUsuario,
  type Usuario,
} from './sesion';

// Se reexportan para no romper las importaciones que ya apuntan a este módulo.
export { borrarToken, guardarToken, guardarUsuario, obtenerToken, obtenerUsuario };
export type { Usuario };

export interface RespuestaAuth {
  exito: boolean;
  datos?: {
    token: string;
    usuario: Usuario;
  };
  mensaje?: string;
}

// ==========================================
// 2. BIOMETRÍA (expo-local-authentication)
// ==========================================

/**
 * Autentica al usuario con Huella / Rostro.
 * Verifica disponibilidad de hardware y huellas/rostros guardados antes de escanear.
 */
export async function autenticarConBiometria(): Promise<boolean> {
  try {
    // 1. Verificar si el dispositivo tiene lector biométrico
    const hayLector = await LocalAuthentication.hasHardwareAsync();
    // 2. Verificar si hay huellas o rostro configurados en el celular
    const hayHuellas = await LocalAuthentication.isEnrolledAsync();

    if (!hayLector || !hayHuellas) {
      Alert.alert(
        'Biometría no disponible',
        'Tu dispositivo no cuenta con sensor biométrico o no tenés huellas/rostro configurados en el sistema.'
      );
      return false;
    }

    // 3. Lanzar el diálogo nativo de huella / rostro
    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirmá tu identidad para ingresar',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });

    return resultado.success;
  } catch (error) {
    console.warn('Error en autenticación biométrica:', error);
    return false;
  }
}

// ==========================================
// 3. PETICIONES A LA API REAL
// ==========================================

interface RespuestaApiAuth {
  datos?: { token?: string; usuario?: Usuario };
  data?: { token?: string; usuario?: Usuario };
  token?: string;
  usuario?: Usuario;
  mensaje?: string;
  error?: { mensaje?: string };
}

function extraerSesion(payload: unknown): { token: string; usuario: Usuario } | null {
  if (!payload || typeof payload !== 'object') return null;

  const registro = payload as RespuestaApiAuth;
  const contenedor = registro.datos ?? registro.data ?? registro;
  const token = contenedor.token;
  const usuario = contenedor.usuario;

  return token && usuario ? { token, usuario } : null;
}

function mensajeRespuestaAuth(error: unknown, porDefecto: string): string {
  if (isAxiosError(error) && error.response) {
    const data = error.response.data as RespuestaApiAuth | undefined;
    return data?.error?.mensaje ?? data?.mensaje ?? porDefecto;
  }
  return mensajeDeErrorApi(error, 'la sesión');
}

// Iniciar Sesión
export async function iniciarSesion(email: string, password: string): Promise<RespuestaAuth> {
  try {
    const respuesta = await api.post('/auth/ingreso', {
      email: email.trim().toLowerCase(),
      contrasena: password,
    });

    const sesion = extraerSesion(respuesta.data);
    if (!sesion) {
      return { exito: false, mensaje: 'El servidor devolvió una respuesta inválida.' };
    }

    await guardarToken(sesion.token);
    await guardarUsuario(sesion.usuario);

    return { exito: true, datos: sesion };
  } catch (error) {
    return {
      exito: false,
      mensaje: mensajeRespuestaAuth(error, 'Credenciales incorrectas'),
    };
  }
}

// Registrar Usuario
export async function registrarUsuario(
  nombre: string,
  email: string,
  password: string
): Promise<RespuestaAuth> {
  try {
    const respuesta = await api.post('/auth/registro', {
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      contrasena: password,
    });

    const sesion = extraerSesion(respuesta.data);
    if (!sesion) {
      return { exito: false, mensaje: 'El servidor devolvió una respuesta inválida.' };
    }

    await guardarToken(sesion.token);
    await guardarUsuario(sesion.usuario);

    return { exito: true, datos: sesion };
  } catch (error) {
    return {
      exito: false,
      mensaje: mensajeRespuestaAuth(error, 'Error al registrar usuario'),
    };
  }
}