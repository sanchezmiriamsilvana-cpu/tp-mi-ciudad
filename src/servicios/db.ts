import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function obtenerConexionDB(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('miciudad.db');

      // Habilitar escrituras concurrentes y crear las tablas de forma segura antes de entregar la conexión
      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS favoritos (
          id TEXT PRIMARY KEY NOT NULL,
          usuarioId TEXT NOT NULL,
          lugarId TEXT NOT NULL,
          creadoEn TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS preferencias (
          clave TEXT PRIMARY KEY NOT NULL,
          valor TEXT NOT NULL
        );
      `);

      dbInstance = db;
      return db;
    })();
  }

  return dbPromise;
}

export function resetearConexionDB(): void {
  dbInstance = null;
  dbPromise = null;
}

export async function inicializarBaseDatos(): Promise<void> {
  await obtenerConexionDB();
}