import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'user_session_token';
const USUARIO_KEY = 'user_profile_data';

export interface Usuario {
  id?: string;
  nombre: string;
  email: string;
  password?: string;
}

/**
 * Persistencia de la sesión en SecureStore.
 *
 * Vive en su propio módulo para que `api.ts` pueda leer el token sin importar
 * `autenticacion.ts` (que a su vez importa `api.ts`), evitando el ciclo
 * `api -> autenticacion -> api`.
 */

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
  return data ? (JSON.parse(data) as Usuario) : null;
}

export async function borrarToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USUARIO_KEY);
}
