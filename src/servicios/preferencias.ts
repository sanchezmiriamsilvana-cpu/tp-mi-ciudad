import * as SQLite from 'expo-sqlite';
import { obtenerConexionDB } from '../servicios/db';

export interface PreferenciasUsuario {
  tema: 'claro' | 'oscuro' | 'sistema';
  categoriasFavoritas: string[];
  avisarProximidad: boolean;
  radioAvisoMetros: number;
}

const PREFERENCIAS_DEFAULT: PreferenciasUsuario = {
  tema: 'sistema',
  categoriasFavoritas: ['cat-museos', 'cat-playas'],
  avisarProximidad: true,
  radioAvisoMetros: 250,
};

// Inicializar tabla de preferencias en SQLite
export async function inicializarBaseDatosPreferencias(): Promise<void> {
  const db = await obtenerConexionDB();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS preferencias (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      tema TEXT NOT NULL,
      categoriasFavoritas TEXT NOT NULL,
      avisarProximidad INTEGER NOT NULL,
      radioAvisoMetros INTEGER NOT NULL
    );
  `);
}

// Obtener preferencias guardadas
export async function obtenerPreferencias(): Promise<PreferenciasUsuario> {
  try {
    const db = await obtenerConexionDB();
    const resultado = await db.getFirstAsync<{
      tema: 'claro' | 'oscuro' | 'sistema';
      categoriasFavoritas: string;
      avisarProximidad: number;
      radioAvisoMetros: number;
    }>('SELECT * FROM preferencias WHERE id = 1');

    if (!resultado) {
      return PREFERENCIAS_DEFAULT;
    }

    return {
      tema: resultado.tema,
      categoriasFavoritas: JSON.parse(resultado.categoriasFavoritas),
      avisarProximidad: Boolean(resultado.avisarProximidad),
      radioAvisoMetros: resultado.radioAvisoMetros,
    };
  } catch (error) {
    console.error('Error al obtener preferencias:', error);
    return PREFERENCIAS_DEFAULT;
  }
}

// Guardar o actualizar preferencias
export async function guardarPreferencias(
  prefs: PreferenciasUsuario
): Promise<void> {
  try {
    const db = await obtenerConexionDB();
    const catsJson = JSON.stringify(prefs.categoriasFavoritas);

    await db.runAsync(
      `INSERT INTO preferencias (id, tema, categoriasFavoritas, avisarProximidad, radioAvisoMetros)
       VALUES (1, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         tema = excluded.tema,
         categoriasFavoritas = excluded.categoriasFavoritas,
         avisarProximidad = excluded.avisarProximidad,
         radioAvisoMetros = excluded.radioAvisoMetros;`,
      [prefs.tema, catsJson, prefs.avisarProximidad ? 1 : 0, prefs.radioAvisoMetros]
    );
  } catch (error) {
    console.error('Error al guardar preferencias:', error);
  }
}