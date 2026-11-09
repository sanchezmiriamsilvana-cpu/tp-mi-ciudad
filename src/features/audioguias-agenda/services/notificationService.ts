import { Platform } from 'react-native';
import type * as ExpoNotifications from 'expo-notifications';
import { obtenerNotificaciones } from '../../../servicios/notificacionesExpo';
import { EventoAgenda } from '../data/eventos';
import { actualizarEstado, leerEstado } from './storage';

export { notificacionesDisponibles } from '../../../servicios/notificacionesExpo';

const CANAL_EVENTOS = 'agenda-audioguias';

const Notificaciones = obtenerNotificaciones();

if (Notificaciones) {
  Notificaciones.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Mensaje que se muestra cuando se piden recordatorios dentro de Expo Go. */
export const MENSAJE_NOTIFICACIONES_EXPO_GO =
  'Los recordatorios necesitan una development build: Expo Go ya no admite notificaciones.';

export async function solicitarPermisoAgenda(): Promise<boolean> {
  if (!Notificaciones) return false;

  if (Platform.OS === 'android') {
    await Notificaciones.setNotificationChannelAsync(CANAL_EVENTOS, {
      name: 'Recordatorios de eventos',
      description: 'Avisos locales de la agenda de Colón',
      importance: Notificaciones.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 100, 180],
      lightColor: '#0284c7',
    });
  }

  const actual = await Notificaciones.getPermissionsAsync();
  if (actual.granted || actual.ios?.status === Notificaciones.IosAuthorizationStatus.PROVISIONAL) return true;
  const respuesta = await Notificaciones.requestPermissionsAsync();
  return respuesta.granted || respuesta.ios?.status === Notificaciones.IosAuthorizationStatus.PROVISIONAL;
}

export async function obtenerRecordatorio(eventoId: string): Promise<string | null> {
  if (!Notificaciones) return null;

  const estado = await leerEstado();
  const id = estado.notificaciones[eventoId];
  if (!id) return null;
  const programadas = await Notificaciones.getAllScheduledNotificationsAsync();
  return programadas.some((notificacion) => notificacion.identifier === id) ? id : null;
}

export async function programarRecordatorio(
  evento: EventoAgenda,
  anticipacionMinutos: number
): Promise<string> {
  if (!Notificaciones) {
    throw new Error(MENSAJE_NOTIFICACIONES_EXPO_GO);
  }

  const fechaEvento = new Date(evento.fecha);
  const fechaAviso = new Date(fechaEvento.getTime() - anticipacionMinutos * 60_000);
  if (Number.isNaN(fechaEvento.getTime()) || fechaAviso.getTime() <= Date.now()) {
    throw new Error('Ese aviso ya habría ocurrido. Elige una anticipación menor.');
  }
  if (!(await solicitarPermisoAgenda())) {
    throw new Error('No hay permiso para notificaciones. Puedes activarlo en los ajustes del dispositivo.');
  }

  const anterior = await obtenerRecordatorio(evento.id);
  if (anterior) await Notificaciones.cancelScheduledNotificationAsync(anterior);
  const id = await Notificaciones.scheduleNotificationAsync({
    content: {
      title: `Próximo evento: ${evento.titulo}`,
      body: `${evento.lugar} · ${new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(fechaEvento)}`,
      data: { eventoId: evento.id },
    },
    trigger: {
      type: Notificaciones.SchedulableTriggerInputTypes.DATE,
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
  if (!Notificaciones) return;

  const id = await obtenerRecordatorio(eventoId);
  if (id) await Notificaciones.cancelScheduledNotificationAsync(id);
  await actualizarEstado((estado) => {
    const notificaciones = { ...estado.notificaciones };
    delete notificaciones[eventoId];
    return { ...estado, notificaciones };
  });
}

export function escucharToqueNotificacion(
  alAbrirEvento: (eventoId: string) => void
): ExpoNotifications.EventSubscription {
  if (!Notificaciones) return { remove: () => {} };

  return Notificaciones.addNotificationResponseReceivedListener((respuesta) => {
    const eventoId = respuesta.notification.request.content.data?.eventoId;
    if (typeof eventoId === 'string') alAbrirEvento(eventoId);
  });
}

/** Borra la última respuesta para que no se reabra el evento al volver a la app. */
export async function limpiarUltimaNotificacion(): Promise<void> {
  if (!Notificaciones) return;
  await Notificaciones.clearLastNotificationResponseAsync();
}

/** Devuelve el `eventoId` de la última notificación tocada, si corresponde. */
export async function obtenerEventoDeUltimaNotificacion(): Promise<string | null> {
  if (!Notificaciones) return null;

  const respuesta = await Notificaciones.getLastNotificationResponseAsync();
  const eventoId = respuesta?.notification.request.content.data?.eventoId;
  return typeof eventoId === 'string' ? eventoId : null;
}
