import { useEffect, useRef } from 'react';
import { router } from 'expo-router';

import {
  escucharToqueNotificacion,
  limpiarUltimaNotificacion,
  obtenerEventoDeUltimaNotificacion,
} from '../services/notificationService';

export default function NotificationNavigationListener() {
  const ultimoEventoAbierto = useRef<{ id: string; instante: number } | null>(null);

  useEffect(() => {
    function abrirEvento(eventoId: string) {
      const ahora = Date.now();
      if (ultimoEventoAbierto.current?.id === eventoId && ahora - ultimoEventoAbierto.current.instante < 1500) return;
      ultimoEventoAbierto.current = { id: eventoId, instante: ahora };
      router.push({ pathname: '/agenda-eventos', params: { eventId: eventoId } });
      void limpiarUltimaNotificacion();
    }

    const suscripcion = escucharToqueNotificacion(abrirEvento);
    void obtenerEventoDeUltimaNotificacion().then((eventoId) => {
      if (eventoId) abrirEvento(eventoId);
    });
    return () => suscripcion.remove();
  }, []);

  return null;
}
