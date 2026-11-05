import { api } from './api';
import { Lugar, Categoria } from '../tipos/lugares';

export interface RespuestaServicio<T> {
  exito: boolean;
  datos: T;
  mensaje?: string;
}

/**
 * Obtiene las categorías desde la API real (/categorias)
 */
export const obtenerCategorias = async (): Promise<RespuestaServicio<Categoria[]>> => {
  try {
    const respuesta = await api.get('/categorias');
    const datos: Categoria[] = respuesta.data?.datos || respuesta.data || [];
    return { exito: true, datos };
  } catch (error: any) {
    console.error('Error al obtener categorías de la API:', error);
    return {
      exito: false,
      datos: [],
      mensaje: 'Error al conectar con el servidor',
    };
  }
};

/**
 * Obtiene el listado de lugares desde la API real (/lugares)
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
    let lista: Lugar[] = respuesta.data?.datos || respuesta.data || [];

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
  } catch (error: any) {
    console.error('Error al obtener lugares de la API:', error);
    return {
      exito: false,
      datos: [],
      mensaje: 'Error al cargar lugares',
    };
  }
};

/**
 * Obtiene el detalle de un lugar específico (/lugares/:id)
 */
export const obtenerLugarPorId = async (
  id: string
): Promise<RespuestaServicio<Lugar | null>> => {
  try {
    const respuesta = await api.get(`/lugares/${id}`);
    const lugar: Lugar = respuesta.data?.datos || respuesta.data || null;

    return {
      exito: !!lugar,
      datos: lugar,
      mensaje: lugar ? undefined : 'Lugar no encontrado',
    };
  } catch (error: any) {
    console.error(`Error al obtener lugar ${id} de la API:`, error);
    return {
      exito: false,
      datos: null,
      mensaje: 'Error al obtener el detalle del lugar',
    };
  }
};