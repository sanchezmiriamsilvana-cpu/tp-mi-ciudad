import { Evento } from '../tipos/eventos';
import { MOCK_EVENTOS } from '../mocks/eventos';

export interface RespuestaServicio<T> {
  exito: boolean;
  datos: T;
  mensaje?: string;
}

export const obtenerEventos = async (
  busqueda: string = '',
  estado: string = 'todos'
): Promise<RespuestaServicio<Evento[]>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let resultado = MOCK_EVENTOS;

      if (busqueda.trim() !== '') {
        const termino = busqueda.toLowerCase();
        resultado = resultado.filter(
          (e) =>
            e.titulo.toLowerCase().includes(termino) ||
            e.descripcion.toLowerCase().includes(termino)
        );
      }

      if (estado !== 'todos') {
        resultado = resultado.filter((e) => e.estado === estado);
      }

      resolve({
        exito: true,
        datos: resultado,
      });
    }, 300);
  });
};

export const obtenerEventoPorId = async (
  id: string
): Promise<RespuestaServicio<Evento | null>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const evento = MOCK_EVENTOS.find((e) => e.id === id);
      resolve({
        exito: !!evento,
        datos: evento || null,
        mensaje: evento ? undefined : 'Evento no encontrado',
      });
    }, 200);
  });
};