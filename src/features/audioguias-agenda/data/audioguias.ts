export interface Audioguia {
  id: string;
  titulo: string;
  descripcion: string;
  duracion: number | null;
  imagen: string | null;
  audioUrl: string | null;
}

// Audio de demostración empaquetado con la app (require de Metro). No requiere
// conexión. Cuando existan las pistas oficiales, cargar `audioUrl` y la app
// ofrecerá además la descarga para escucha sin conexión.
export const AUDIO_LOCAL: Record<string, number> = {
  'molino-forclaz': require('../../../../assets/audioguias/molino-forclaz.wav'),
  'puerto-viejo': require('../../../../assets/audioguias/puerto-viejo.wav'),
  'complejo-termal-colon': require('../../../../assets/audioguias/complejo-termal.wav'),
  'playa-norte': require('../../../../assets/audioguias/playa-norte.wav'),
  'bodega-vulliez-sermet': require('../../../../assets/audioguias/bodega-vulliez-sermet.wav'),
  'parque-quiros': require('../../../../assets/audioguias/parque-quiros.wav'),
  'basilica-colon': require('../../../../assets/audioguias/basilica-colon.wav'),
  'costanera-colon': require('../../../../assets/audioguias/costanera-colon.wav'),
};

export const AUDIOGUIAS: Audioguia[] = [
  {
    id: 'molino-forclaz',
    titulo: 'Molino Forclaz',
    descripcion:
      'Antiguo molino harinero construido a fines del siglo XIX por la colonia suiza. Símbolo del trabajo inmigrante en las colonias de Colón y hoy museo a cielo abierto.',
    duracion: 36,
    imagen: null,
    audioUrl: null,
  },
  {
    id: 'puerto-viejo',
    titulo: 'Puerto Viejo',
    descripcion:
      'El antiguo puerto fluvial sobre el río Uruguay, punto de llegada de mercaderías, pasajeros y noticias que conectaban a Colón con el mundo.',
    duracion: 34,
    imagen: null,
    audioUrl: null,
  },
  {
    id: 'complejo-termal-colon',
    titulo: 'Complejo Termal Colón',
    descripcion:
      'Aguas termales que brotan en la zona y que hoy alimentan piletas, baños y circuitos de hidroterapia. Un clásico del verano entrerriano.',
    duracion: 31,
    imagen: null,
    audioUrl: null,
  },
  {
    id: 'playa-norte',
    titulo: 'Playa Norte',
    descripcion:
      'La playa más querida de Colón: arena fina junto al río Uruguay, lagunas, jardines y espejos de agua donde convive una gran variedad de aves.',
    duracion: 31,
    imagen: null,
    audioUrl: null,
  },
  {
    id: 'bodega-vulliez-sermet',
    titulo: 'Bodega Vulliez Sermet',
    descripcion:
      'Viñedos de raíz francesa junto al río. Conserva la tradición vitivinícola que las familias inmigrantes plantaron hace más de un siglo.',
    duracion: 33,
    imagen: null,
    audioUrl: null,
  },
  {
    id: 'parque-quiros',
    titulo: 'Parque Quirós',
    descripcion:
      'El gran pulmón urbano de Colón: calles arboladas, espacios de encuentro y el monumento a la Bandera en sus inmediaciones.',
    duracion: 33,
    imagen: null,
    audioUrl: null,
  },
  {
    id: 'basilica-colon',
    titulo: 'Basílica Santos Justo y Pastor',
    descripcion:
      'Templo principal de la ciudad, frente a la plaza. Sus vitrales y detalles decorativos reflejan la fe y el trabajo de generaciones de colonenses.',
    duracion: 32,
    imagen: null,
    audioUrl: null,
  },
  {
    id: 'costanera-colon',
    titulo: 'Costanera de Colón',
    descripcion:
      'El paseo ribereño que acompaña al río Uruguay. Ideal para caminatas, bicicleta y atardeceres frente al agua.',
    duracion: 31,
    imagen: null,
    audioUrl: null,
  },
];
