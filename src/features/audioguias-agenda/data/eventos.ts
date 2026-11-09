import type { EstadoEvento } from '../../../tipos/eventos';
import type { Coordenadas } from '../../../tipos/lugares';

/**
 * Modelo de presentación de la agenda. Se construye a partir de `Evento`
 * (modelo canónico de la API) mediante `aEventoAgenda` en `services/apiEventos`.
 */
export interface EventoAgenda {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  fin?: string | null;
  lugar: string;
  direccion: string;
  imagen: string | null;
  lugarId?: string | null;
  coordenadas?: Coordenadas | null;
  precio?: number | null;
  estado?: EstadoEvento;
}

const ETIQUETAS_ESTADO: Record<EstadoEvento, string> = {
  programado: 'Programado',
  suspendido: 'Suspendido',
  cancelado: 'Cancelado',
  finalizado: 'Finalizado',
};

export function etiquetaEstado(estado: EstadoEvento | null | undefined): string | null {
  if (!estado) return null;
  return ETIQUETAS_ESTADO[estado] ?? null;
}

/** Texto de precio listo para mostrar (`Gratis` cuando el valor es 0). */
export function textoPrecio(precio: number | null | undefined): string | null {
  if (precio === null || precio === undefined || !Number.isFinite(precio)) return null;
  if (precio <= 0) return 'Gratis';

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(precio);
}
