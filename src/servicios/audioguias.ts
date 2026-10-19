import { Directory, File, Paths } from 'expo-file-system';

export interface Audioguia {
  id: string;
  titulo: string;
  descripcion: string;
}

export const AUDIOGUIAS: Audioguia[] = [
  { id: 'molino-forclaz', titulo: 'Molino Forclaz', descripcion: 'Historia de la inmigración suiza en Colón.' },
  { id: 'puerto-viejo', titulo: 'Puerto Viejo', descripcion: 'El antiguo puerto y la vida junto al río.' },
  { id: 'complejo-termal', titulo: 'Complejo Termal Colón', descripcion: 'Un recorrido por el parque termal.' },
  { id: 'playa-norte', titulo: 'Playa Norte', descripcion: 'La costa del río Uruguay.' },
  { id: 'bodega-vulliez-sermet', titulo: 'Bodega Vulliez Sermet', descripcion: 'Viñedos y tradición vitivinícola.' },
  { id: 'parque-quiros', titulo: 'Parque Quirós', descripcion: 'Un paseo por el parque de la ciudad.' },
  { id: 'basilica-colon', titulo: 'Basílica Santos Justo y Pastor', descripcion: 'Patrimonio religioso e historia local.' },
  { id: 'costanera-colon', titulo: 'Costanera de Colón', descripcion: 'El paseo ribereño y sus paisajes.' },
];

function obtenerCarpetaAudioguias(): Directory {
  return new Directory(Paths.document, 'audioguias');
}

export async function obtenerAudioLocal(id: string): Promise<string | null> {
  const carpeta = obtenerCarpetaAudioguias();
  if (!carpeta.exists) return null;

  const archivo = carpeta.list().find(
    (elemento): elemento is File => elemento instanceof File && elemento.name.startsWith(`${id}.`)
  );
  return archivo?.exists ? archivo.uri : null;
}

export async function importarAudioLocal(id: string): Promise<string | null> {
  let origen: File;
  try {
    const seleccionado = await File.pickFileAsync(undefined, 'audio/*');
    origen = (Array.isArray(seleccionado) ? seleccionado[0] : seleccionado) as unknown as File;
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('cancel')) return null;
    throw error;
  }
  if (!origen) return null;
  if (!origen.exists || !origen.type.startsWith('audio/')) {
    throw new Error('Selecciona un archivo de audio válido.');
  }

  const carpeta = obtenerCarpetaAudioguias();
  carpeta.create({ idempotent: true, intermediates: true });
  const extension = origen.extension || '.mp3';
  const destino = new File(carpeta, `${id}${extension}`);
  if (destino.exists) destino.delete();
  await origen.copy(destino);
  return destino.uri;
}