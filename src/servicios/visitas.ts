import * as SQLite from 'expo-sqlite';
import { api } from './api'; 
import { Visita, RegistrarVisitaDTO } from '../tipos/visitas';

const NOMBRE_DB = 'miciudad.db';
let dbInstance: SQLite.SQLiteDatabase | null = null;

// Reutilización de la conexión a la base de datos local SQLite
async function obtenerDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(NOMBRE_DB);
    await dbInstance.execAsync(`
      CREATE TABLE IF NOT EXISTS visitas (
        id TEXT PRIMARY KEY NOT NULL,
        usuarioId TEXT,
        lugarId TEXT NOT NULL,
        fechaHora TEXT NOT NULL,
        origen TEXT NOT NULL,
        fotoUri TEXT,
        nota TEXT,
        sincronizada INTEGER NOT NULL DEFAULT 0
      );
    `);
  }
  return dbInstance;
}

/**
 * 1. Obtener las visitas almacenadas en SQLite filtradas por el usuario activo
 */
export async function obtenerVisitasLocales(usuarioId?: string): Promise<Visita[]> {
  try {
    const db = await obtenerDB();
    let filas: any[] = [];

    if (usuarioId && usuarioId.trim() !== '') {
      filas = await db.getAllAsync<any>(
        'SELECT * FROM visitas WHERE usuarioId = ? ORDER BY fechaHora DESC;',
        [usuarioId]
      );
    } else {
      filas = await db.getAllAsync<any>(
        'SELECT * FROM visitas WHERE usuarioId IS NULL OR usuarioId = "" OR usuarioId = "usuario_invitado" ORDER BY fechaHora DESC;'
      );
    }
    
    return filas.map((row) => ({
      id: row.id,
      usuarioId: row.usuarioId || undefined,
      lugarId: row.lugarId,
      fechaHora: row.fechaHora,
      origen: row.origen,
      fotoUri: row.fotoUri,
      nota: row.nota,
      sincronizada: row.sincronizada === 1,
    }));
  } catch (error) {
    console.error('Error al obtener visitas locales:', error);
    return [];
  }
}

/**
 * 2. Guardar una nueva visita localmente en SQLite
 */
export async function guardarVisitaLocal(visita: Visita): Promise<void> {
  try {
    const db = await obtenerDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO visitas (id, usuarioId, lugarId, fechaHora, origen, fotoUri, nota, sincronizada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        visita.id,
        visita.usuarioId || null,
        visita.lugarId,
        visita.fechaHora,
        visita.origen,
        visita.fotoUri || null,
        visita.nota || null,
        visita.sincronizada ? 1 : 0,
      ]
    );
  } catch (error) {
    console.error('Error al guardar visita local:', error);
  }
}

/**
 * 3. Actualizar la foto o la nota de una visita existente en SQLite
 */
export async function actualizarVisitaLocal(
  id: string,
  datos: { nota?: string; fotoUri?: string | null }
): Promise<void> {
  try {
    const db = await obtenerDB();
    await db.runAsync(
      `UPDATE visitas SET nota = ?, fotoUri = ? WHERE id = ?;`,
      [datos.nota ?? null, datos.fotoUri ?? null, id]
    );
  } catch (error) {
    console.error('Error al actualizar visita local:', error);
  }
}

/**
 * 4. Registrar la visita en el backend/API NestJS (POST /yo/visitas)
 */
export async function registrarVisitaAPI(datos: RegistrarVisitaDTO): Promise<boolean> {
  try {
    const respuesta = await api.post('/yo/visitas', datos);
    return respuesta.status === 200 || respuesta.status === 201;
  } catch (error: any) {
    console.warn(
      '⚠️ Error API Visita:',
      error.response?.status,
      error.response?.data || error.message
    );
    return false;
  }
}

/**
 * 5. Actualizar los detalles de la visita en la API (foto / nota)
 */
export async function actualizarVisitaAPI(
  id: string,
  datos: { nota?: string; fotoUri?: string }
): Promise<boolean> {
  try {
    const respuesta = await api.patch(`/yo/visitas/${id}`, datos);
    return respuesta.status === 200;
  } catch (error: any) {
    console.warn('⚠️ No se pudo sincronizar nota/foto en API:', error.response?.status || error.message);
    return false;
  }
}

/**
 * 6. Intentar sincronizar con el servidor las visitas que quedaron offline (sincronizada = 0)
 */
export async function sincronizarVisitasPendientes(): Promise<void> {
  try {
    const db = await obtenerDB();
    const pendientes = await db.getAllAsync<any>(
      'SELECT * FROM visitas WHERE sincronizada = 0;'
    );

    for (const item of pendientes) {
      const datosDTO: RegistrarVisitaDTO = {
        lugarId: item.lugarId,
        origen: item.origen,
        fechaHora: item.fechaHora, 
        fotoUri: item.fotoUri || undefined,
        nota: item.nota || undefined,
      };

      const exito = await registrarVisitaAPI(datosDTO);
      if (exito) {
        await db.runAsync('UPDATE visitas SET sincronizada = 1 WHERE id = ?;', [item.id]);
      }
    }
  } catch (error) {
    console.error('Error al sincronizar visitas pendientes:', error);
  }
}