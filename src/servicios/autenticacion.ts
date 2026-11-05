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
// 2. PETICIONES A LA API REAL
// ==========================================

//  Iniciar Sesión
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
      const mensajeError = json.error?.mensaje || 'Credenciales incorrectas';
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

//  Registrar Usuario
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
        contrasena: password, // 👈 ¡ACÁ TAMBIÉN! Enviamos 'contrasena'
      }),
    });

    const json = await respuesta.json();

    if (!respuesta.ok) {
      const mensajeError = json.error?.mensaje || 'Error al registrar usuario';
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

// ==========================================
// 3. BIOMETRÍA
// ==========================================

export async function autenticarConBiometria(): Promise<boolean> {
  try {
    const tieneHardware = await LocalAuthentication.hasHardwareAsync();
    const estaInscripto = await LocalAuthentication.isEnrolledAsync();

    if (!tieneHardware) {
      Alert.alert('Diagnóstico', 'El celular no detecta sensor biométrico.');
      return false;
    }

    if (!estaInscripto) {
      Alert.alert('Diagnóstico', 'Falta configurar huella, rostro o PIN en los Ajustes del celular.');
      return false;
    }

    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Ingresar a Mi Ciudad Colón',
      fallbackLabel: 'Usar contraseña',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });

    if (!resultado.success) {
      Alert.alert('Diagnóstico', 'La autenticación no fue exitosa o se canceló.');
    }

    return resultado.success;
  } catch (error) {
    Alert.alert('Error inesperado', String(error));
    return false;
  }
}