import { Favorito } from '../tipos/favoritos';
import { obtenerConexionDB, inicializarBaseDatos, resetearConexionDB } from './db';
import { obtenerUsuario } from './autenticacion';

const USUARIO_DEFAULT = 'usuario_invitado';

async function resolverUsuarioId(usuarioId?: string): Promise<string> {
  if (usuarioId && usuarioId.trim() !== '') {
    return usuarioId;
  }
  // Si no se pasó usuarioId, intentamos obtener el correo del usuario con sesión activa
  const usuario = await obtenerUsuario();
  return usuario?.email || usuario?.id || USUARIO_DEFAULT;
}

export async function inicializarBaseDatosFavoritos(): Promise<void> {
  return await inicializarBaseDatos();
}

export async function obtenerFavoritosPorUsuario(usuarioId?: string): Promise<Favorito[]> {
  const idSeguro = await resolverUsuarioId(usuarioId); // 🟢 Garantiza buscar por el usuario logueado

  try {
    await inicializarBaseDatos();
    const db = await obtenerConexionDB();

    const resultado = await db.getAllAsync<Favorito>(
      'SELECT * FROM favoritos WHERE usuarioId = ? ORDER BY creadoEn DESC;',
      [idSeguro]
    );
    return resultado || [];
  } catch (error) {
    console.error('Error al obtener favoritos:', error);
    resetearConexionDB();
    return [];
  }
}

export async function obtenerFavoritosIds(usuarioId?: string): Promise<string[]> {
  const lista = await obtenerFavoritosPorUsuario(usuarioId);
  return lista.map((item) => item.lugarId);
}

export async function alternarFavorito(lugarId: string, usuarioId?: string): Promise<boolean> {
  if (!lugarId) return false;
  const idSeguro = await resolverUsuarioId(usuarioId); // 🟢 Garantiza guardar con el usuario logueado

  try {
    await inicializarBaseDatos();
    const db = await obtenerConexionDB();

    const existe = await db.getFirstAsync<Favorito>(
      'SELECT * FROM favoritos WHERE usuarioId = ? AND lugarId = ?;',
      [idSeguro, lugarId]
    );

    if (existe) {
      await db.runAsync(
        'DELETE FROM favoritos WHERE usuarioId = ? AND lugarId = ?;',
        [idSeguro, lugarId]
      );
      return false; // Se eliminó de favoritos
    } else {
      const nuevoId = `fav-${Date.now().toString()}`;
      const fecha = new Date().toISOString();

      await db.runAsync(
        'INSERT INTO favoritos (id, usuarioId, lugarId, creadoEn) VALUES (?, ?, ?, ?);',
        [nuevoId, idSeguro, lugarId, fecha]
      );
      return true; // Se agregó a favoritos
    }
  } catch (error) {
    console.error('Error al alternar favorito:', error);
    resetearConexionDB();
    return false;
  }
}