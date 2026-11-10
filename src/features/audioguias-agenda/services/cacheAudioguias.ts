import { File, Paths } from 'expo-file-system';

import { Audioguia } from '../data/audioguias';

/** Copia del catálogo descargado, usada para abrir la app sin conexión. */
export interface CatalogoCache {
  actualizadoEn: string;
  endpoint: string;
  guias: Audioguia[];
}

const archivoCache = new File(Paths.document, 'audioguias-catalogo.json');
let colaEscritura: Promise<void> = Promise.resolve();

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function textoOpcional(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null;
}

function normalizarCache(valor: unknown): CatalogoCache | null {
  if (!esRegistro(valor) || !Array.isArray(valor.guias)) return null;

  const guias: Audioguia[] = [];
  for (const item of valor.guias) {
    if (!esRegistro(item)) continue;
    const id = textoOpcional(item.id);
    const titulo = textoOpcional(item.titulo);
    if (!id || !titulo) continue;

    guias.push({
      id,
      titulo,
      descripcion: textoOpcional(item.descripcion) ?? '',
      duracion: typeof item.duracion === 'number' && Number.isFinite(item.duracion) ? item.duracion : null,
      imagen: textoOpcional(item.imagen),
      audioUrl: textoOpcional(item.audioUrl),
      tipo: textoOpcional(item.tipo),
      autor: textoOpcional(item.autor),
    });
  }

  if (guias.length === 0) return null;

  return {
    actualizadoEn: textoOpcional(valor.actualizadoEn) ?? new Date(0).toISOString(),
    endpoint: textoOpcional(valor.endpoint) ?? '/audioguias',
    guias,
  };
}

export async function leerCatalogoCache(): Promise<CatalogoCache | null> {
  try {
    if (!archivoCache.exists) return null;
    return normalizarCache(JSON.parse(await archivoCache.text()));
  } catch (error) {
    console.warn('No se pudo leer el catálogo guardado:', error);
    return null;
  }
}

export function guardarCatalogoCache(cache: CatalogoCache): Promise<void> {
  colaEscritura = colaEscritura.catch(() => undefined).then(async () => {
    if (!archivoCache.exists) archivoCache.create({ intermediates: true });
    await archivoCache.write(JSON.stringify(cache));
  });
  return colaEscritura;
}
