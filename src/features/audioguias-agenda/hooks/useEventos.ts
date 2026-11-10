import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { mensajeDeErrorApi } from '../../../servicios/errores';
import type { EventoAgenda } from '../data/eventos';
import { cargarAgendaEventos } from '../services/apiEventos';
import {
  MENSAJE_NOTIFICACIONES_EXPO_GO,
  cancelarRecordatorio,
  notificacionesDisponibles,
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

interface OpcionesUseEventos {
  /** Permite desactivar la carga cuando la pantalla no necesita el listado. */
  habilitado?: boolean;
}

export function useEventos({ habilitado = true }: OpcionesUseEventos = {}) {
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [cargando, setCargando] = useState(habilitado);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => inicioDelDia(new Date()));
  const [recordatorios, setRecordatorios] = useState<Record<string, string>>({});
  const [permisoNotificaciones, setPermisoNotificaciones] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const montado = useRef(true);
  const seleccionInicialAplicada = useRef(false);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const cargar = useCallback(async (modo: 'inicial' | 'refresco' = 'inicial') => {
    if (modo === 'inicial') setCargando(true);
    else setRefrescando(true);

    try {
      const datos = await cargarAgendaEventos();
      if (!montado.current) return;
      setEventos(datos);
      setError(null);
    } catch (e) {
      if (!montado.current) return;
      setError(mensajeDeErrorApi(e, 'los eventos'));
    } finally {
      if (montado.current) {
        setCargando(false);
        setRefrescando(false);
      }
    }
  }, []);

  const recargar = useCallback(() => cargar('inicial'), [cargar]);
  const refrescar = useCallback(() => cargar('refresco'), [cargar]);

  useEffect(() => {
    if (!habilitado) {
      setCargando(false);
      return;
    }
    void cargar('inicial');
  }, [habilitado, cargar]);

  // Estado de los recordatorios ya programados para los eventos cargados.
  useEffect(() => {
    if (eventos.length === 0) return;

    let activa = true;
    Promise.all(eventos.map(async (evento) => [evento.id, await obtenerRecordatorio(evento.id)] as const))
      .then((entradas) => {
        if (!activa) return;
        setRecordatorios(
          Object.fromEntries(
            entradas.filter((entrada): entrada is readonly [string, string] => Boolean(entrada[1]))
          )
        );
      })
      .catch(() => {
        if (activa) setAviso('No se pudieron recuperar los avisos guardados.');
      });

    return () => {
      activa = false;
    };
  }, [eventos]);

  // Si hoy no hay eventos, abre la agenda en el día del próximo evento.
  useEffect(() => {
    if (seleccionInicialAplicada.current || eventos.length === 0) return;
    seleccionInicialAplicada.current = true;

    const hoy = inicioDelDia(new Date()).getTime();
    const hayEventosHoy = eventos.some(
      (evento) => inicioDelDia(new Date(evento.fecha)).getTime() === hoy
    );
    if (hayEventosHoy) return;

    const proximo = ordenarPorFecha(
      eventos.filter((evento) => new Date(evento.fecha).getTime() >= hoy)
    )[0];
    if (proximo) setFechaSeleccionada(inicioDelDia(new Date(proximo.fecha)));
  }, [eventos]);

  const eventosDelDia = useMemo(() => {
    const seleccionado = inicioDelDia(fechaSeleccionada).getTime();
    return ordenarPorFecha(
      eventos.filter((evento) => inicioDelDia(new Date(evento.fecha)).getTime() === seleccionado)
    );
  }, [eventos, fechaSeleccionada]);

  const proximosEventos = useMemo(() => {
    const ahora = Date.now();
    return ordenarPorFecha(eventos.filter((evento) => new Date(evento.fecha).getTime() >= ahora));
  }, [eventos]);

  async function pedirPermiso(): Promise<boolean> {
    if (!notificacionesDisponibles) {
      setPermisoNotificaciones(false);
      setAviso(MENSAJE_NOTIFICACIONES_EXPO_GO);
      return false;
    }

    try {
      const concedido = await solicitarPermisoAgenda();
      setPermisoNotificaciones(concedido);
      if (!concedido) {
        setAviso('Permiso denegado. Puedes habilitar notificaciones en los ajustes del dispositivo.');
      }
      return concedido;
    } catch {
      setPermisoNotificaciones(false);
      setAviso('No se pudo solicitar permiso para notificaciones.');
      return false;
    }
  }

  async function alternarRecordatorio(evento: EventoAgenda, anticipacionMinutos: number) {
    if (!notificacionesDisponibles) {
      setAviso(MENSAJE_NOTIFICACIONES_EXPO_GO);
      return;
    }

    setOcupado(evento.id);
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
      setAviso(e instanceof Error ? e.message : 'No se pudo programar el recordatorio.');
    } finally {
      setOcupado(null);
    }
  }

  const obtenerEventosEnFecha = useCallback(
    (fecha: Date): EventoAgenda[] => {
      const seleccionada = inicioDelDia(fecha).getTime();
      return ordenarPorFecha(
        eventos.filter((evento) => inicioDelDia(new Date(evento.fecha)).getTime() === seleccionada)
      );
    },
    [eventos]
  );

  return {
    eventos,
    cargando,
    refrescando,
    error,
    recargar,
    refrescar,
    aviso,
    limpiarAviso: () => setAviso(null),
    limpiarError: () => setError(null),
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
  };
}
