import { api } from './api';
import { obtenerConexionDB, inicializarBaseDatos } from './db';
import { Visita, RegistrarVisitaDTO } from '../tipos/visitas';

const USUARIO_DEFAULT = 'usuario_invitado';

// ==========================================
// 1. PETICIONES A LA API (NestJS)
// ==========================================

export async function obtenerVisitasAPI(): Promise<Visita[]> {
  try {
    const respuesta = await api.get<Visita[]>('/yo/visitas');
    return respuesta.data;
  } catch (error) {
    console.warn('API no disponible. Se usarán visitas locales:', error);
    return [];
  }
}

export async function registrarVisitaAPI(dto: RegistrarVisitaDTO): Promise<Visita | null> {
  try {
    const respuesta = await api.post<Visita>('/yo/visitas', dto);
    return respuesta.data;
  } catch (error) {
    console.error('Error al registrar visita en API:', error);
    return null;
  }
}

export async function actualizarVisitaAPI(
  id: string,
  datos: { fotoUri?: string; nota?: string }
): Promise<boolean> {
  try {
    await api.patch(`/yo/visitas/${id}`, datos);
    return true;
  } catch (error) {
    console.error('Error al actualizar visita en API:', error);
    return false;
  }
}

// ==========================================
// 2. BASE DE DATOS LOCAL (SQLite Offline)
// ==========================================

export async function guardarVisitaLocal(visita: Visita): Promise<boolean> {
  try {
    await inicializarBaseDatos();
    const db = await obtenerConexionDB();
    const fecha = visita.fechaHora || new Date().toISOString();
    const usuarioId = visita.usuarioId || USUARIO_DEFAULT;
    const sinc = visita.sincronizada ? 1 : 0;

    await db.runAsync(
      `INSERT INTO visitas (id, usuarioId, lugarId, fechaHora, origen, fotoUri, nota, sincronizada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        visita.id,
        usuarioId,
        visita.lugarId,
        fecha,
        visita.origen,
        visita.fotoUri || null,
        visita.nota || null,
        sinc,
      ]
    );
    return true;
  } catch (error) {
    console.error('Error al guardar visita local en SQLite:', error);
    return false;
  }
}

/**
 * Actualiza la nota y la foto de una visita en la base de datos local SQLite
 */
export async function actualizarVisitaLocal(
  id: string,
  datos: { fotoUri?: string | null; nota?: string }
): Promise<boolean> {
  try {
    await inicializarBaseDatos();
    const db = await obtenerConexionDB();

    await db.runAsync(
      `UPDATE visitas 
       SET nota = COALESCE(?, nota), 
           fotoUri = COALESCE(?, fotoUri), 
           sincronizada = 0 
       WHERE id = ?;`,
      [datos.nota ?? null, datos.fotoUri ?? null, id]
    );
    return true;
  } catch (error) {
    console.error('Error al actualizar visita local en SQLite:', error);
    return false;
  }
}

export async function obtenerVisitasLocales(usuarioId?: string): Promise<Visita[]> {
  try {
    await inicializarBaseDatos();
    const db = await obtenerConexionDB();
    const idSeguro = usuarioId && usuarioId.trim() !== '' ? usuarioId : USUARIO_DEFAULT;

    const filas = await db.getAllAsync<any>(
      'SELECT * FROM visitas WHERE usuarioId = ? ORDER BY fechaHora DESC;',
      [idSeguro]
    );

    return filas.map((f) => ({
      ...f,
      sincronizada: Boolean(f.sincronizada),
    }));
  } catch (error) {
    console.error('Error al consultar visitas locales:', error);
    return [];
  }
}

export async function sincronizarVisitasPendientes(): Promise<void> {
  try {
    await inicializarBaseDatos();
    const db = await obtenerConexionDB();

    const pendientes = await db.getAllAsync<any>(
      'SELECT * FROM visitas WHERE sincronizada = 0;'
    );

    for (const v of pendientes) {
      const exito = await registrarVisitaAPI({
        lugarId: v.lugarId,
        origen: v.origen,
        fotoUri: v.fotoUri,
        nota: v.nota,
      });

      if (exito) {
        await db.runAsync(
          'UPDATE visitas SET sincronizada = 1 WHERE id = ?;',
          [v.id]
        );
      }
    }
  } catch (error) {
    console.error('Error durante la sincronización de visitas:', error);
  }
}