import { AudioSource } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import { fetch } from 'expo/fetch';

import { AUDIO_LOCAL, Audioguia } from '../data/audioguias';
import { actualizarEstado, leerEstado } from './storage';

export interface ProgresoDescarga {
  bytesDescargados: number;
  bytesTotales: number;
  porcentaje: number | null;
}

// Fuente de audio resuelta para una audioguía, en orden de prioridad:
// 1. archivo descargado por el usuario (escucha sin conexión)
// 2. audio de demostración empaquetado con la app (require de Metro)
// 3. URL oficial remota (streaming / descarga)
export type FuenteAudio = AudioSource;

function carpetaAudios(): Directory {
  return new Directory(Paths.document, 'audioguias-agenda');
}

export async function obtenerDescargaLocal(id: string): Promise<string | null> {
  const estado = await leerEstado();
  const uriGuardada = estado.descargas[id];
  if (uriGuardada && new File(uriGuardada).exists) return uriGuardada;

  const carpeta = carpetaAudios();
  if (!carpeta.exists) return null;
  const archivo = carpeta.list().find(
    (elemento): elemento is File => elemento instanceof File && elemento.name.startsWith(`${id}.`)
  );
  return archivo?.exists ? archivo.uri : null;
}

export async function descargarAudio(
  guia: Audioguia,
  alProgresar: (progreso: ProgresoDescarga) => void
): Promise<string> {
  if (!guia.audioUrl) throw new Error('Falta completar la URL oficial de esta audioguía.');
  if (!/^https?:\/\//i.test(guia.audioUrl)) throw new Error('La URL del audio debe usar HTTP o HTTPS.');

  const carpeta = carpetaAudios();
  carpeta.create({ idempotent: true, intermediates: true });
  const ruta = new URL(guia.audioUrl).pathname;
  const extension = /\.(mp3|m4a|aac|wav|ogg)$/i.exec(ruta)?.[0] ?? '.mp3';
  const destino = new File(carpeta, `${guia.id}${extension}`);
  if (destino.exists) destino.delete();

  const respuesta = await fetch(guia.audioUrl);
  if (!respuesta.ok) throw new Error(`El servidor respondió ${respuesta.status} al descargar el audio.`);
  if (!respuesta.body) throw new Error('La respuesta no permite leer el audio como flujo.');

  destino.create({ intermediates: true });
  const lector = respuesta.body.getReader();
  const escritor = destino.writableStream().getWriter();
  const bytesTotales = Number(respuesta.headers.get('content-length')) || 0;
  let bytesDescargados = 0;

  try {
    while (true) {
      const { done, value } = await lector.read();
      if (done) break;
      await escritor.write(value);
      bytesDescargados += value.byteLength;
      alProgresar({
        bytesDescargados,
        bytesTotales,
        porcentaje: bytesTotales > 0 ? Math.min(100, (bytesDescargados / bytesTotales) * 100) : null,
      });
    }
    await escritor.close();
  } catch (error) {
    await escritor.abort(error).catch(() => undefined);
    if (destino.exists) destino.delete();
    throw error;
  } finally {
    lector.releaseLock();
  }

  if (!destino.exists) throw new Error('La descarga no produjo un archivo reproducible.');

  await actualizarEstado((estado) => ({
    ...estado,
    descargas: { ...estado.descargas, [guia.id]: destino.uri },
  }));
  return destino.uri;
}

export async function eliminarDescarga(id: string): Promise<void> {
  const uri = await obtenerDescargaLocal(id);
  if (uri) {
    const archivo = new File(uri);
    if (archivo.exists) archivo.delete();
  }
  await actualizarEstado((estado) => {
    const descargas = { ...estado.descargas };
    delete descargas[id];
    return { ...estado, descargas };
  });
}

// Devuelve una fuente reproducible para la guía: primero la descarga local,
// luego el audio de demostración empaquetado y, si existe, la URL remota.
export async function resolverFuenteReproduccion(guia: Audioguia): Promise<FuenteAudio | null> {
  const descarga = await obtenerDescargaLocal(guia.id);
  if (descarga) return descarga;
  if (guia.id in AUDIO_LOCAL) return AUDIO_LOCAL[guia.id];
  if (guia.audioUrl) return guia.audioUrl;
  return null;
}