import { isAxiosError } from 'axios';

import { api } from './api';
import { mensajeDeErrorApi } from './errores';
import {
  esRegistro,
  extraerLista,
  extraerObjeto,
  generarId,
  numero,
  primerElemento,
  texto,
  textoDe,
} from './normalizacion';
import { resolverUrlMedia } from './urls';
import { EstadoEvento, Evento } from '../tipos/eventos';
import { Coordenadas } from '../tipos/lugares';

export interface RespuestaServicio<T> {
  exito: boolean;
  datos: T;
  mensaje?: string;
}

const RUTAS_EVENTOS = ['/eventos', '/eventos/agenda', '/agenda-eventos'];
const CAMPOS_LISTA = ['datos', 'data', 'items', 'results', 'eventos', 'agenda', 'contenido'];
const CAMPOS_OBJETO = ['datos', 'data', 'evento', 'item', 'resultado'];

function normalizarEstado(valor: unknown): EstadoEvento {
  const estado = texto(valor)?.toLowerCase() ?? '';
  if (estado.includes('suspend')) return 'suspendido';
  if (estado.includes('cancel')) return 'cancelado';
  if (estado.includes('final') || estado.includes('termin') || estado.includes('conclu')) return 'finalizado';
  return 'programado';
}

function normalizarFecha(valor: unknown): string | null {
  const textoFecha = texto(valor);
  if (!textoFecha) return null;

  const fecha = new Date(textoFecha);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

function normalizarCoordenadas(valor: unknown): Coordenadas | null {
  if (!esRegistro(valor)) return null;

  const latitud = numero(valor.latitud ?? valor.lat ?? valor.latitude);
  const longitud = numero(valor.longitud ?? valor.lng ?? valor.lon ?? valor.longitude);
  return latitud !== null && longitud !== null ? { latitud, longitud } : null;
}

function normalizarPrecio(valor: unknown): number | null {
  if (typeof valor === 'boolean') return valor ? null : 0;

  const textoPrecio = texto(valor);
  if (textoPrecio && /gratis|libre|sin cargo/i.test(textoPrecio)) return 0;

  const precio = numero(valor);
  return precio !== null ? Math.max(0, precio) : null;
}

function normalizarEvento(item: unknown): Evento | null {
  if (!esRegistro(item)) return null;

  const inicio = normalizarFecha(
    item.inicio ??
      item.fechaInicio ??
      item.fecha_inicio ??
      item.fecha ??
      item.fechaHora ??
      item.startDate ??
      item.start ??
      item.date
  );
  if (!inicio) {
    console.warn('[eventos] Se omite un evento sin fecha válida:', item.id ?? item.titulo ?? item.nombre);
    return null;
  }

  const lugarAnidado = esRegistro(item.lugar) ? item.lugar : null;
  const titulo =
    texto(item.titulo) ??
    texto(item.nombre) ??
    texto(item.title) ??
    texto(item.name) ??
    textoDe(item.lugar);
  if (!titulo) return null;

  const idBruto =
    texto(item.id) ?? texto(item._id) ?? texto(item.eventoId) ?? texto(item.slug) ?? texto(item.uuid);
  const lugarId = texto(item.lugarId ?? item.lugar_id ?? lugarAnidado?.id);
  const lugarNombre =
    texto(item.lugarNombre ?? item.nombreLugar ?? textoDe(item.lugar)) ?? null;
  const direccion =
    texto(
      item.direccionLibre ??
        item.direccion_libre ??
        item.direccion ??
        item.direccionLugar ??
        item.direccion_lugar ??
        lugarAnidado?.direccion ??
        lugarAnidado?.direccionLibre
    ) ?? '';

  return {
    id: idBruto ?? generarId(titulo, 'evento'),
    titulo,
    descripcion:
      texto(item.descripcion) ??
      texto(item.descripcionCorta) ??
      texto(item.descripcion_corta) ??
      texto(item.descripcionLarga) ??
      texto(item.descripcion_larga) ??
      texto(item.description) ??
      texto(item.resumen) ??
      texto(item.detalle) ??
      '',
    lugarId,
    lugarNombre,
    direccionLibre: direccion,
    coordenadas: normalizarCoordenadas(
      item.coordenadas ?? item.coordenada ?? item.ubicacion ?? lugarAnidado?.coordenadas ?? lugarAnidado?.ubicacion
    ),
    inicio,
    fin: normalizarFecha(item.fin ?? item.fechaFin ?? item.fecha_fin ?? item.endDate ?? item.end ?? item.fechaHasta),
    imagenUrl: resolverUrlMedia(
      primerElemento(
        item.imagenUrl ??
          item.imagen_url ??
          item.imagen ??
          item.portada ??
          item.foto ??
          item.urlImagen ??
          item.image ??
          item.cover ??
          item.imagenes
      )
    ),
    precio: normalizarPrecio(item.precio ?? item.costo ?? item.valor ?? item.entrada),
    estado: normalizarEstado(item.estado ?? item.status ?? item.situacion),
  };
}

export function normalizarEventos(datos: unknown): Evento[] {
  return extraerLista(datos, CAMPOS_LISTA)
    .map(normalizarEvento)
    .filter((evento): evento is Evento => evento !== null);
}

export function ordenarEventos(eventos: Evento[]): Evento[] {
  return [...eventos].sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
}

async function buscarEventoEnListado(id: string): Promise<RespuestaServicio<Evento | null>> {
  const listado = await obtenerEventos();
  if (!listado.exito) return { exito: false, datos: null, mensaje: listado.mensaje };

  const evento = listado.datos.find((item) => item.id === id) ?? null;
  return evento
    ? { exito: true, datos: evento }
    : { exito: false, datos: null, mensaje: 'Evento no encontrado.' };
}

/**
 * Obtiene el listado de eventos desde la API (`/eventos`).
 * Si la ruta principal no existe, prueba variantes habituales del backend.
 */
export const obtenerEventos = async (
  busqueda: string = '',
  estado: string = 'todos'
): Promise<RespuestaServicio<Evento[]>> => {
  let ultimoError: unknown = null;

  for (const ruta of RUTAS_EVENTOS) {
    try {
      // La API pagina de a 20 por defecto: pedimos el máximo para que la
      // agenda no se corte en el calendario.
      const respuesta = await api.get(ruta, ruta === '/eventos' ? { params: { porPagina: 100 } } : undefined);
      let resultado = normalizarEventos(respuesta.data);

      if (busqueda.trim() !== '') {
        const termino = busqueda.toLowerCase();
        resultado = resultado.filter(
          (evento) =>
            evento.titulo.toLowerCase().includes(termino) ||
            evento.descripcion.toLowerCase().includes(termino) ||
            (evento.lugarNombre ?? '').toLowerCase().includes(termino)
        );
      }

      if (estado !== 'todos') {
        resultado = resultado.filter((evento) => evento.estado === estado);
      }

      return { exito: true, datos: ordenarEventos(resultado) };
    } catch (error) {
      ultimoError = error;
      const codigo = isAxiosError(error) ? error.response?.status : undefined;
      if (codigo !== 404) break;
    }
  }

  console.warn('Error al obtener eventos desde la API:', ultimoError);
  return {
    exito: false,
    datos: [],
    mensaje: mensajeDeErrorApi(ultimoError, 'los eventos'),
  };
};

/**
 * Obtiene el detalle de un evento (`/eventos/:id`). Si el endpoint de detalle
 * no está disponible, busca el evento dentro del listado.
 */
export const obtenerEventoPorId = async (id: string): Promise<RespuestaServicio<Evento | null>> => {
  try {
    const respuesta = await api.get(`/eventos/${encodeURIComponent(id)}`);
    const bruto = extraerObjeto(respuesta.data, CAMPOS_OBJETO);
    const evento = normalizarEvento(bruto);

    if (evento) return { exito: true, datos: evento };
    return buscarEventoEnListado(id);
  } catch (error) {
    const codigo = isAxiosError(error) ? error.response?.status : undefined;
    if (codigo === 404) return buscarEventoEnListado(id);

    console.warn('Error al obtener el evento desde la API:', error);
    return {
      exito: false,
      datos: null,
      mensaje: mensajeDeErrorApi(error, 'el evento'),
    };
  }
};
