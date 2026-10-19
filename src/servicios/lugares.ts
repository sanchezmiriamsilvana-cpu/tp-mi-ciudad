import { Lugar, Categoria } from '../tipos/lugares';
import { MOCK_LUGARES, MOCK_CATEGORIAS } from '../mocks/lugares';

export interface RespuestaServicio<T> {
  exito: boolean;
  datos: T;
  mensaje?: string;
}

export const obtenerCategorias = async (): Promise<RespuestaServicio<Categoria[]>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ exito: true, datos: MOCK_CATEGORIAS });
    }, 100);
  });
};

export const obtenerLugares = async (
  busqueda: string = '',
  categoriaId: string = 'cat-todas'
): Promise<RespuestaServicio<Lugar[]>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let resultado = MOCK_LUGARES;

      if (busqueda.trim() !== '') {
        const termino = busqueda.toLowerCase();
        resultado = resultado.filter(
          (l) =>
            l.nombre.toLowerCase().includes(termino) ||
            l.descripcion.toLowerCase().includes(termino) ||
            l.descripcionCorta.toLowerCase().includes(termino)
        );
      }

      if (categoriaId !== 'cat-todas') {
        resultado = resultado.filter((l) => l.categoriaId === categoriaId);
      }

      resolve({ exito: true, datos: resultado });
    }, 300);
  });
};

export const obtenerLugarPorId = async (
  id: string
): Promise<RespuestaServicio<Lugar | null>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lugar = MOCK_LUGARES.find((l) => l.id === id);
      resolve({
        exito: !!lugar,
        datos: lugar || null,
        mensaje: lugar ? undefined : 'Lugar no encontrado',
      });
    }, 200);
  });
};