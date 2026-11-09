import { api } from './api';
import { mensajeDeErrorApi } from './errores';
import { extraerLista, extraerObjeto } from './normalizacion';
import { Categoria, Lugar } from '../tipos/lugares';

export interface RespuestaServicio<T> {
  exito: boolean;
  datos: T;
  mensaje?: string;
}

const CAMPOS_LISTA = ['datos', 'data', 'items', 'results', 'lugares', 'categorias', 'contenido'];
const CAMPOS_OBJETO = ['datos', 'data', 'lugar', 'item', 'resultado'];

/** Registra el fallo como advertencia (sin abrir el overlay rojo de Expo Go). */
function avisarFallo(error: unknown, contexto: string): string {
  const mensaje = mensajeDeErrorApi(error, contexto);
  console.warn(`[API] ${mensaje}`);
  return mensaje;
}

/**
 * Obtiene las categorías desde la API configurada en `EXPO_PUBLIC_BASE_URL`
 * (`GET /categorias`).
 */
export const obtenerCategorias = async (): Promise<RespuestaServicio<Categoria[]>> => {
  try {
    const respuesta = await api.get('/categorias');
    const datos = extraerLista(respuesta.data, CAMPOS_LISTA) as Categoria[];
    return { exito: true, datos };
  } catch (error) {
    return {
      exito: false,
      datos: [],
      mensaje: avisarFallo(error, 'las categorías'),
    };
  }
};

/**
 * Obtiene el listado de lugares desde la API configurada (`GET /lugares`).
 */
export const obtenerLugares = async (
  busqueda: string = '',
  categoriaId: string = 'cat-todas'
): Promise<RespuestaServicio<Lugar[]>> => {
  try {
    const params: Record<string, string> = {};
    if (busqueda.trim() !== '') {
      params.q = busqueda.trim();
    }
    if (categoriaId && categoriaId !== 'cat-todas') {
      params.categoriaId = categoriaId;
    }

    const respuesta = await api.get('/lugares', { params });
    let lista = extraerLista(respuesta.data, CAMPOS_LISTA) as Lugar[];

    if (busqueda.trim() !== '') {
      const termino = busqueda.toLowerCase();
      lista = lista.filter(
        (l) =>
          l.nombre?.toLowerCase().includes(termino) ||
          l.descripcion?.toLowerCase().includes(termino) ||
          l.descripcionCorta?.toLowerCase().includes(termino)
      );
    }

    if (categoriaId !== 'cat-todas') {
      lista = lista.filter((l) => l.categoriaId === categoriaId);
    }

    return { exito: true, datos: lista };
  } catch (error) {
    return {
      exito: false,
      datos: [],
      mensaje: avisarFallo(error, 'los lugares'),
    };
  }
};

/**
 * Obtiene el detalle de un lugar (`GET /lugares/:id`).
 */
export const obtenerLugarPorId = async (
  id: string
): Promise<RespuestaServicio<Lugar | null>> => {
  try {
    const respuesta = await api.get(`/lugares/${encodeURIComponent(id)}`);
    const bruto = extraerObjeto(respuesta.data, CAMPOS_OBJETO);
    const lugar = bruto && !bruto.id ? extraerObjeto(bruto, CAMPOS_OBJETO) : bruto;

    if (!lugar || !lugar.id) {
      return {
        exito: false,
        datos: null,
        mensaje: 'El lugar solicitado no existe.',
      };
    }

    return {
      exito: true,
      datos: lugar as unknown as Lugar,
    };
  } catch (error) {
    return {
      exito: false,
      datos: null,
      mensaje: avisarFallo(error, 'el detalle del lugar'),
    };
  }
};
