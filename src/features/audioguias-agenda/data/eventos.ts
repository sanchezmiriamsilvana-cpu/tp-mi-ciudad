export interface EventoAgenda {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  lugar: string;
  direccion: string;
  imagen: string | null;
}

function fechaRelativa(dias: number, hora: number, minuto = 0): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  fecha.setHours(hora, minuto, 0, 0);
  return fecha.toISOString();
}

// Muestra de agenda. Los eventos se generan relativos a la fecha actual para
// que siempre queden próximos; reemplazar por el calendario oficial cuando
// esté disponible.
export const EVENTOS_DEMO: EventoAgenda[] = [
  {
    id: 'demo-paseo-ribereno',
    titulo: 'Paseo ribereño guiado',
    descripcion:
      'Caminata por la costanera con guía local: historia del puerto, la vida junto al río y miradores del atardecer.',
    fecha: fechaRelativa(1, 18),
    lugar: 'Costanera de Colón',
    direccion: 'Av. Costanera, Colón, Entre Ríos',
    imagen: null,
  },
  {
    id: 'demo-visita-molino',
    titulo: 'Visita guiada nocturna al Molino Forclaz',
    descripcion:
      'Recorrido con linternas por el antiguo molino harinero de la colonia suiza, con relatos de la inmigración.',
    fecha: fechaRelativa(3, 20, 30),
    lugar: 'Molino Forclaz',
    direccion: 'Ruta Provincial 26, Colón, Entre Ríos',
    imagen: null,
  },
  {
    id: 'demo-feria-artesanal',
    titulo: 'Feria de artesanos y productores',
    descripcion:
      'Puestos de artesanías, conservas y dulces regionales con música en vivo durante toda la jornada.',
    fecha: fechaRelativa(5, 10),
    lugar: 'Plaza San Martín',
    direccion: 'Plaza San Martín, centro de Colón',
    imagen: null,
  },
  {
    id: 'demo-agenda-cultural',
    titulo: 'Encuentro cultural en el parque',
    descripcion:
      'Espectáculos de danzas folklóricas, talleres abiertos y patio de comidas para toda la familia.',
    fecha: fechaRelativa(8, 17),
    lugar: 'Parque Quirós',
    direccion: 'Parque Quirós, Colón, Entre Ríos',
    imagen: null,
  },
];
