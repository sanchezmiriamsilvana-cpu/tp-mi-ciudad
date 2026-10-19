import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function obtenerConexionDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('miciudad.db');
  }
  return dbPromise;
}

export function resetearConexionDB(): void {
  dbPromise = null;
}

export async function inicializarBaseDatos(): Promise<void> {
  try {
    const db = await obtenerConexionDB();
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS favoritos (
        id TEXT PRIMARY KEY NOT NULL,
        usuarioId TEXT NOT NULL,
        lugarId TEXT NOT NULL,
        creadoEn TEXT NOT NULL
      );
    `);
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    resetearConexionDB();
  }
}