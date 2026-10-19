import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';

const TOKEN_KEY = 'user_session_token';
const USUARIO_KEY = 'user_profile_data';

export interface Usuario {
  nombre: string;
  email: string;
  password?: string;
}

// --- TOKEN DE SESIÓN ---
export async function guardarToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function obtenerToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

// --- DATOS DEL USUARIO REGISTRADO ---
export async function guardarUsuario(usuario: Usuario): Promise<void> {
  await SecureStore.setItemAsync(USUARIO_KEY, JSON.stringify(usuario));
}

export async function obtenerUsuario(): Promise<Usuario | null> {
  const data = await SecureStore.getItemAsync(USUARIO_KEY);
  return data ? JSON.parse(data) : null;
}

// --- CERRAR SESIÓN ---
export async function borrarToken(): Promise<void> {
  // Solo eliminamos el token de sesión para cerrar la sesión activa
  await SecureStore.deleteItemAsync(TOKEN_KEY);

}

// --- BIOMETRÍA ---
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