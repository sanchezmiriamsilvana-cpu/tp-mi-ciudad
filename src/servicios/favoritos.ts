import { Favorito } from '../tipos/favoritos';
import { obtenerConexionDB, inicializarBaseDatos, resetearConexionDB } from './db';

const USUARIO_DEFAULT = 'usuario_invitado';

export async function inicializarBaseDatosFavoritos(): Promise<void> {
  return await inicializarBaseDatos();
}

export async function obtenerFavoritosPorUsuario(usuarioId?: string): Promise<Favorito[]> {
  const idSeguro = usuarioId && usuarioId.trim() !== '' ? usuarioId : USUARIO_DEFAULT;

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
  const idSeguro = usuarioId && usuarioId.trim() !== '' ? usuarioId : USUARIO_DEFAULT;

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
      return false;
    } else {
      const nuevoId = `fav-${Date.now().toString()}`;
      const fecha = new Date().toISOString();

      await db.runAsync(
        'INSERT INTO favoritos (id, usuarioId, lugarId, creadoEn) VALUES (?, ?, ?, ?);',
        [nuevoId, idSeguro, lugarId, fecha]
      );
      return true;
    }
  } catch (error) {
    console.error('Error al alternar favorito:', error);
    resetearConexionDB();
    return false;
  }
}