import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { EventoAgenda } from '../data/eventos';
import { actualizarEstado, leerEstado } from './storage';

const CANAL_EVENTOS = 'agenda-audioguias';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function solicitarPermisoAgenda(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL_EVENTOS, {
      name: 'Recordatorios de eventos',
      description: 'Avisos locales de la agenda de Colón',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 100, 180],
      lightColor: '#0284c7',
    });
  }

  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted || actual.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
  const respuesta = await Notifications.requestPermissionsAsync();
  return respuesta.granted || respuesta.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function obtenerRecordatorio(eventoId: string): Promise<string | null> {
  const estado = await leerEstado();
  const id = estado.notificaciones[eventoId];
  if (!id) return null;
  const programadas = await Notifications.getAllScheduledNotificationsAsync();
  return programadas.some((notificacion) => notificacion.identifier === id) ? id : null;
}

export async function programarRecordatorio(
  evento: EventoAgenda,
  anticipacionMinutos: number
): Promise<string> {
  const fechaEvento = new Date(evento.fecha);
  const fechaAviso = new Date(fechaEvento.getTime() - anticipacionMinutos * 60_000);
  if (Number.isNaN(fechaEvento.getTime()) || fechaAviso.getTime() <= Date.now()) {
    throw new Error('Ese aviso ya habría ocurrido. Elige una anticipación menor.');
  }
  if (!(await solicitarPermisoAgenda())) {
    throw new Error('No hay permiso para notificaciones. Puedes activarlo en los ajustes del dispositivo.');
  }

  const anterior = await obtenerRecordatorio(evento.id);
  if (anterior) await Notifications.cancelScheduledNotificationAsync(anterior);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Próximo evento: ${evento.titulo}`,
      body: `${evento.lugar} · ${new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(fechaEvento)}`,
      data: { eventoId: evento.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fechaAviso,
      ...(Platform.OS === 'android' ? { channelId: CANAL_EVENTOS } : {}),
    },
  });
  await actualizarEstado((estado) => ({
    ...estado,
    notificaciones: { ...estado.notificaciones, [evento.id]: id },
  }));
  return id;
}

export async function cancelarRecordatorio(eventoId: string): Promise<void> {
  const id = await obtenerRecordatorio(eventoId);
  if (id) await Notifications.cancelScheduledNotificationAsync(id);
  await actualizarEstado((estado) => {
    const notificaciones = { ...estado.notificaciones };
    delete notificaciones[eventoId];
    return { ...estado, notificaciones };
  });
}

export function escucharToqueNotificacion(
  alAbrirEvento: (eventoId: string) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener((respuesta) => {
    const eventoId = respuesta.notification.request.content.data?.eventoId;
    if (typeof eventoId === 'string') alAbrirEvento(eventoId);
  });
}