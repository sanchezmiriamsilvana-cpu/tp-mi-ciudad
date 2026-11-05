import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import { BASE_URL } from './api';

const TOKEN_KEY = 'user_session_token';
const USUARIO_KEY = 'user_profile_data';

export interface Usuario {
  id?: string;
  nombre: string;
  email: string;
  password?: string;
}

export interface RespuestaAuth {
  exito: boolean;
  datos?: {
    token: string;
    usuario: Usuario;
  };
  mensaje?: string;
}

// ==========================================
// 1. SECURE STORE (Persistencia de Sesión)
// ==========================================

export async function guardarToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function obtenerToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function guardarUsuario(usuario: Usuario): Promise<void> {
  await SecureStore.setItemAsync(USUARIO_KEY, JSON.stringify(usuario));
}

export async function obtenerUsuario(): Promise<Usuario | null> {
  const data = await SecureStore.getItemAsync(USUARIO_KEY);
  return data ? JSON.parse(data) : null;
}

export async function borrarToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USUARIO_KEY);
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
    console.error('Error en autenticación biométrica:', error);
    return false;
  }
}

// ==========================================
// 3. PETICIONES A LA API REAL
// ==========================================

// Iniciar Sesión
export async function iniciarSesion(email: string, password: string): Promise<RespuestaAuth> {
  try {
    const respuesta = await fetch(`${BASE_URL}/auth/ingreso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: email.trim().toLowerCase(), 
        contrasena: password 
      }),
    });

    const json = await respuesta.json();

    if (!respuesta.ok) {
      const mensajeError = json.error?.mensaje || json.mensaje || 'Credenciales incorrectas';
      return { exito: false, mensaje: mensajeError };
    }

    const { token, usuario } = json.datos;

    await guardarToken(token);
    await guardarUsuario(usuario);

    return { exito: true, datos: { token, usuario } };
  } catch (error: any) {
    return { exito: false, mensaje: 'No se pudo conectar con el servidor.' };
  }
}

// Registrar Usuario
export async function registrarUsuario(
  nombre: string,
  email: string,
  password: string
): Promise<RespuestaAuth> {
  try {
    const respuesta = await fetch(`${BASE_URL}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        contrasena: password,
      }),
    });

    const json = await respuesta.json();

    if (!respuesta.ok) {
      const mensajeError = json.error?.mensaje || json.mensaje || 'Error al registrar usuario';
      return { exito: false, mensaje: mensajeError };
    }

    const { token, usuario } = json.datos;

    await guardarToken(token);
    await guardarUsuario(usuario);

    return { exito: true, datos: { token, usuario } };
  } catch (error: any) {
    return { exito: false, mensaje: 'No se pudo conectar con el servidor.' };
  }
}