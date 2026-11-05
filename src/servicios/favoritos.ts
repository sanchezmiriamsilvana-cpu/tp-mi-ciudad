import { Favorito } from '../tipos/favoritos';
import { obtenerConexionDB } from './db';

const USUARIO_DEFAULT = 'usuario_invitado';

export async function inicializarBaseDatosFavoritos(): Promise<void> {
  await obtenerConexionDB();
}

function sanitizarUsuarioId(usuarioId?: string | null): string {
  if (!usuarioId || typeof usuarioId !== 'string' || usuarioId.trim() === '') {
    return USUARIO_DEFAULT;
  }
  return usuarioId.trim();
}

export async function obtenerFavoritosPorUsuario(usuarioId?: string | null): Promise<Favorito[]> {
  try {
    const db = await obtenerConexionDB();
    const idSeguro = sanitizarUsuarioId(usuarioId);

    const resultado = await db.getAllAsync<Favorito>(
      'SELECT * FROM favoritos WHERE usuarioId = ? ORDER BY creadoEn DESC;',
      [idSeguro]
    );
    return resultado || [];
  } catch (error) {
    console.error('Error al obtener favoritos:', error);
    return [];
  }
}

export async function obtenerFavoritosIds(usuarioId?: string | null): Promise<string[]> {
  const idSeguro = sanitizarUsuarioId(usuarioId);
  const lista = await obtenerFavoritosPorUsuario(idSeguro);
  return lista.map((item) => item.lugarId);
}

export async function alternarFavorito(lugarId: string, usuarioId?: string | null): Promise<boolean> {
  if (!lugarId || typeof lugarId !== 'string') return false;

  try {
    const db = await obtenerConexionDB();
    const idSeguro = sanitizarUsuarioId(usuarioId);
    const lugarIdLimpio = lugarId.trim();

    const existe = await db.getFirstAsync<Favorito>(
      'SELECT * FROM favoritos WHERE usuarioId = ? AND lugarId = ?;',
      [idSeguro, lugarIdLimpio]
    );

    if (existe) {
      await db.runAsync(
        'DELETE FROM favoritos WHERE usuarioId = ? AND lugarId = ?;',
        [idSeguro, lugarIdLimpio]
      );
      return false;
    } else {
      const nuevoId = `fav-${Date.now()}`;
      const fecha = new Date().toISOString();

      await db.runAsync(
        'INSERT INTO favoritos (id, usuarioId, lugarId, creadoEn) VALUES (?, ?, ?, ?);',
        [nuevoId, idSeguro, lugarIdLimpio, fecha]
      );
      return true;
    }
  } catch (error) {
    console.error('Error al alternar favorito:', error);
    return false;
  }
}