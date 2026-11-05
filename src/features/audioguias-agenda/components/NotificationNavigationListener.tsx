import React, { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { escucharToqueNotificacion } from '../services/notificationService';

export default function NotificationNavigationListener() {
  const ultimoEventoAbierto = useRef<{ id: string; instante: number } | null>(null);

  useEffect(() => {
    function abrirEvento(eventoId: string) {
      const ahora = Date.now();
      if (ultimoEventoAbierto.current?.id === eventoId && ahora - ultimoEventoAbierto.current.instante < 1500) return;
      ultimoEventoAbierto.current = { id: eventoId, instante: ahora };
      router.push({ pathname: '/agenda-eventos', params: { eventId: eventoId } });
      void Notifications.clearLastNotificationResponseAsync();
    }

    const suscripcion = escucharToqueNotificacion(abrirEvento);
    void Notifications.getLastNotificationResponseAsync().then((respuesta) => {
      const eventoId = respuesta?.notification.request.content.data?.eventoId;
      if (typeof eventoId === 'string') abrirEvento(eventoId);
    });
    return () => suscripcion.remove();
  }, []);

  return null;
}