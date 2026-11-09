export interface Audioguia {
  id: string;
  titulo: string;
  descripcion: string;
  duracion: number | null;
  imagen: string | null;
  audioUrl: string | null;
  /** Tipo de contenido devuelto por la API: `audioguia` o `audiolibro`. */
  tipo?: string | null;
  /** Narrador, autor o voz del audio cuando la API lo informa. */
  autor?: string | null;
}

/** Etiqueta legible para el tipo de contenido que devuelve la API. */
export function etiquetaTipo(tipo?: string | null): string {
  if (!tipo) return 'Audioguía';
  return tipo.toLowerCase().includes('libro') ? 'Audiolibro' : 'Audioguía';
}
