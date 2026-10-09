export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export interface Horario {
  dia: number; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  abre: string; // Ej: "09:00"
  cierra: string; // Ej: "18:00"
}

export interface Categoria {
  id: string;
  nombre: string;
  icono: string;
}

export interface Lugar {
  id: string;
  nombre: string;
  categoriaId: string;
  descripcionCorta: string;
  descripcion: string;
  direccion: string;
  coordenadas: Coordenadas;
  imagenes: string;
  precioEntrada: number | null; // 0 = Gratis, null = No especificado
  horarios: Horario[];
  accesible: boolean;
  telefono: string | null;
  audioguia: string | null;
}
