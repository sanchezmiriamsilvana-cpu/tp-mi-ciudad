export type OrigenVisita = 'qr' | 'proximidad' | 'manual';

export interface Visita {
  id: string;
  usuarioId?: string;
  lugarId: string;
  fechaHora: string;
  origen: OrigenVisita;
  fotoUri?: string | null;
  nota?: string | null;
  sincronizada?: boolean;
}

export interface RegistrarVisitaDTO {
  lugarId: string;
  origen: OrigenVisita;
  fechaHora?: string;
  fotoUri?: string;
  nota?: string;
}