import { api } from '../../../servicios/api';
import { esRegistro, extraerLista, numero, texto } from '../../../servicios/normalizacion';
import { obtenerEventoPorId, obtenerEventos } from '../../../servicios/eventos';
import type { Evento } from '../../../tipos/eventos';
import type { Coordenadas } from '../../../tipos/lugares';
import type { EventoAgenda } from '../data/eventos';

const CAMPOS_LUGARES = ['datos', 'data', 'items', 'results', 'lugares', 'contenido'];
const DURACION_CACHE_LUGARES_MS = 5 * 60 * 1000;

interface LugarResumen {
  nombre: string;
  direccion: string | null;
  coordenadas: Coordenadas | null;
}

/**
 * La API de Mi Ciudad devuelve en cada evento sólo `lugarId` (el nombre y la
 * dirección viven en `/lugares`), así que armamos un id → lugar para que la
 * agenda muestre datos reales y no la dirección repetida "Colón, Entre Ríos".
 */
let cacheLugares: { expira: number; lugares: Map<string, LugarResumen> } | null = null;

function coordenadasDe(valor: unknown): Coordenadas | null {
  if (!esRegistro(valor)) return null;
  const latitud = numero(valor.latitud ?? valor.lat ?? valor.latitude);
  const longitud = numero(valor.longitud ?? valor.lng ?? valor.lon ?? valor.longitude);
  if (latitud === null || longitud === null) return null;
  return { latitud, longitud };
}

async function lugaresPorId(): Promise<Map<string, LugarResumen>> {
  if (cacheLugares && cacheLugares.expira > Date.now()) return cacheLugares.lugares;

  const lugares = new Map<string, LugarResumen>();
  try {
    const respuesta = await api.get('/lugares', { params: { porPagina: 500 } });
    for (const item of extraerLista(respuesta.data, CAMPOS_LUGARES)) {
      if (!esRegistro(item)) continue;
      const id = texto(item.id);
      const nombre = texto(item.nombre);
      if (!id || !nombre) continue;
      lugares.set(id, {
        nombre,
        direccion: texto(item.direccion),
        coordenadas: coordenadasDe(item.coordenadas),
      });
    }
    cacheLugares = { expira: Date.now() + DURACION_CACHE_LUGARES_MS, lugares };
  } catch (error) {
    console.warn('[agenda] No se pudieron resolver los lugares de la agenda:', error);
  }
  return lugares;
}

async function completarLugares(eventos: EventoAgenda[]): Promise<EventoAgenda[]> {
  if (!eventos.some((evento) => evento.lugarId)) return eventos;

  const lugares = await lugaresPorId();
  if (lugares.size === 0) return eventos;

  return eventos.map((evento) => {
    const lugar = evento.lugarId ? lugares.get(evento.lugarId) : undefined;
    if (!lugar) return evento;
    return {
      ...evento,
      lugar: lugar.nombre,
      direccion: lugar.direccion ?? evento.direccion,
      coordenadas: evento.coordenadas ?? lugar.coordenadas,
    };
  });
}

/** Convierte el modelo canónico de la API en el modelo de la agenda. */
export function aEventoAgenda(evento: Evento): EventoAgenda {
  const lugar = evento.lugarNombre?.trim() || evento.direccionLibre?.trim() || 'Colón';
  const direccion = evento.direccionLibre?.trim() || 'Colón, Entre Ríos';

  return {
    id: evento.id,
    titulo: evento.titulo,
    descripcion: evento.descripcion,
    fecha: evento.inicio,
    fin: evento.fin,
    lugar,
    direccion,
    imagen: evento.imagenUrl,
    lugarId: evento.lugarId,
    coordenadas: evento.coordenadas,
    precio: evento.precio,
    estado: evento.estado,
  };
}

/**
 * Descarga el listado de eventos desde la API y lo adapta a la agenda.
 * Lanza un `Error` con un mensaje legible si la API no responde.
 */
export async function cargarAgendaEventos(): Promise<EventoAgenda[]> {
  const respuesta = await obtenerEventos();

  if (!respuesta.exito) {
    throw new Error(respuesta.mensaje ?? 'No se pudo obtener la agenda de eventos.');
  }
  return completarLugares(respuesta.datos.map(aEventoAgenda));
}

/**
 * Descarga el detalle de un evento. El servicio busca en el listado cuando el
 * endpoint de detalle no está disponible.
 */
export async function cargarEventoAgenda(id: string): Promise<EventoAgenda> {
  const respuesta = await obtenerEventoPorId(id);

  if (!respuesta.exito || !respuesta.datos) {
    throw new Error(respuesta.mensaje ?? 'No se pudo obtener el evento.');
  }
  const [evento] = await completarLugares([aEventoAgenda(respuesta.datos)]);
  return evento;
}
