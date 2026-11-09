import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as ExpoNotifications from 'expo-notifications';

type ModuloNotificaciones = typeof ExpoNotifications;

/**
 * Expo Go dejó de incluir las notificaciones push remotas desde el SDK 53.
 * Importar `expo-notifications` allí dispara un `console.error` bloqueante
 * (`DevicePushTokenAutoRegistration.fx.js`). Por eso el módulo se carga de
 * forma condicional: en Expo Go devolvemos `null` y las funciones de
 * recordatorios degradan con un mensaje amigable.
 */
export const esExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const notificacionesDisponibles = !esExpoGo;

let modulo: ModuloNotificaciones | null = null;

export function obtenerNotificaciones(): ModuloNotificaciones | null {
  if (!notificacionesDisponibles) return null;

  if (!modulo) {
    // `require` condicional: Metro no evalúa expo-notifications dentro de Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    modulo = require('expo-notifications') as ModuloNotificaciones;
  }

  return modulo;
}
