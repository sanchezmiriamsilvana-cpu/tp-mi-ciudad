import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { Evento } from '../tipos/eventos';

const CANAL_AGENDA = 'agenda-eventos';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function obtenerRecordatoriosEventos(): Promise<string[]> {
  const programadas = await Notifications.getAllScheduledNotificationsAsync();
  return programadas
    .map((notificacion) => notificacion.content.data?.eventoId)
    .filter((id): id is string => typeof id === 'string');
}

async function solicitarPermisoNotificaciones(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL_AGENDA, {
      name: 'Agenda de eventos',
      description: 'Avisos locales para eventos guardados',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#0284c7',
    });
  }

  const permisos = await Notifications.getPermissionsAsync();
  if (permisos.granted || permisos.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const solicitados = await Notifications.requestPermissionsAsync();
  return solicitados.granted || solicitados.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function alternarRecordatorioEvento(evento: Evento): Promise<boolean> {
  const programadas = await Notifications.getAllScheduledNotificationsAsync();
  const existente = programadas.find(
    (notificacion) => notificacion.content.data?.eventoId === evento.id
  );

  if (existente) {
    await Notifications.cancelScheduledNotificationAsync(existente.identifier);
    return false;
  }

  const inicio = new Date(evento.inicio);
  if (Number.isNaN(inicio.getTime()) || inicio.getTime() <= Date.now()) {
    throw new Error('El evento ya comenzó y no admite recordatorios.');
  }
  if (!(await solicitarPermisoNotificaciones())) {
    throw new Error('Activa los permisos de notificación para crear un aviso.');
  }

  const aviso = new Date(inicio.getTime() - 15 * 60 * 1000);
  const fechaAviso = aviso.getTime() > Date.now() ? aviso : inicio;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Próximo evento: ${evento.titulo}`,
      body: 'Tu evento comienza pronto.',
      data: { eventoId: evento.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fechaAviso,
      ...(Platform.OS === 'android' ? { channelId: CANAL_AGENDA } : {}),
    },
  });
  return true;
}