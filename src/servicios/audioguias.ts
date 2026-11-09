import { Directory, File, Paths } from 'expo-file-system';

export interface Audioguia {
  id: string;
  lugarId?: string; 
  titulo: string;
  descripcion: string;
}

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
    origen = (Array.isArray(seleccionado) ? seleccionado : seleccionado) as unknown as File;
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