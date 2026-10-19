import { useEffect, useMemo, useState } from 'react';

import { EVENTOS_DEMO, EventoAgenda } from '../data/eventos';
import {
  cancelarRecordatorio,
  obtenerRecordatorio,
  programarRecordatorio,
  solicitarPermisoAgenda,
} from '../services/notificationService';

function inicioDelDia(fecha: Date): Date {
  const resultado = new Date(fecha);
  resultado.setHours(0, 0, 0, 0);
  return resultado;
}

function ordenarPorFecha(eventos: EventoAgenda[]): EventoAgenda[] {
  return [...eventos].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
}

export function useEventos() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => inicioDelDia(new Date()));
  const [recordatorios, setRecordatorios] = useState<Record<string, string>>({});
  const [permisoNotificaciones, setPermisoNotificaciones] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activa = true;
    Promise.all(EVENTOS_DEMO.map(async (evento) => [evento.id, await obtenerRecordatorio(evento.id)] as const))
      .then((entradas) => {
        if (activa) {
          setRecordatorios(Object.fromEntries(entradas.filter((entrada): entrada is readonly [string, string] => !!entrada[1])));
        }
      })
      .catch(() => {
        if (activa) setError('No se pudieron recuperar los avisos guardados.');
      });
    return () => {
      activa = false;
    };
  }, []);

  const eventosDelDia = useMemo(() => {
    const seleccionado = inicioDelDia(fechaSeleccionada).getTime();
    return ordenarPorFecha(
      EVENTOS_DEMO.filter((evento) => inicioDelDia(new Date(evento.fecha)).getTime() === seleccionado)
    );
  }, [fechaSeleccionada]);

  const proximosEventos = useMemo(() => {
    const ahora = Date.now();
    return ordenarPorFecha(EVENTOS_DEMO.filter((evento) => new Date(evento.fecha).getTime() >= ahora));
  }, []);

  async function pedirPermiso(): Promise<boolean> {
    try {
      const concedido = await solicitarPermisoAgenda();
      setPermisoNotificaciones(concedido);
      if (!concedido) setError('Permiso denegado. Puedes habilitar notificaciones en los ajustes del dispositivo.');
      else setError(null);
      return concedido;
    } catch {
      setPermisoNotificaciones(false);
      setError('No se pudo solicitar permiso para notificaciones.');
      return false;
    }
  }

  async function alternarRecordatorio(evento: EventoAgenda, anticipacionMinutos: number) {
    setOcupado(evento.id);
    setError(null);
    try {
      if (recordatorios[evento.id]) {
        await cancelarRecordatorio(evento.id);
        setRecordatorios((actuales) => {
          const siguientes = { ...actuales };
          delete siguientes[evento.id];
          return siguientes;
        });
        return;
      }
      if (permisoNotificaciones !== true && !(await pedirPermiso())) return;
      const id = await programarRecordatorio(evento, anticipacionMinutos);
      setRecordatorios((actuales) => ({ ...actuales, [evento.id]: id }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo programar el recordatorio.');
    } finally {
      setOcupado(null);
    }
  }

  function obtenerEventosEnFecha(fecha: Date): EventoAgenda[] {
    const seleccionada = inicioDelDia(fecha).getTime();
    return ordenarPorFecha(
      EVENTOS_DEMO.filter((evento) => inicioDelDia(new Date(evento.fecha)).getTime() === seleccionada)
    );
  }

  return {
    eventos: EVENTOS_DEMO,
    eventosDelDia,
    proximosEventos,
    obtenerEventosEnFecha,
    fechaSeleccionada,
    seleccionarFecha: (fecha: Date) => setFechaSeleccionada(inicioDelDia(fecha)),
    recordatorios,
    permisoNotificaciones,
    pedirPermiso,
    alternarRecordatorio,
    ocupado,
    error,
    limpiarError: () => setError(null),
  };
}
