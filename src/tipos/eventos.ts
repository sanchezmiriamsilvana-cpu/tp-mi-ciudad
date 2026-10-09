import { Coordenadas } from './lugares';

export type EstadoEvento = 'programado' | 'suspendido' | 'cancelado' | 'finalizado';

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  lugarId: string | null;
  direccionLibre: string | null;
  coordenadas: Coordenadas | null;
  inicio: string; // Formato ISO 8601
  fin: string | null;
  imagenUrl: string | null;
  precio: number | null; // 0 = Gratis, null = No especificado
  estado: EstadoEvento;
}