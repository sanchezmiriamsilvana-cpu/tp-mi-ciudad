import Constants from 'expo-constants';

/**
 * Configuración de entorno validada.
 *
 * Expo solo expone al cliente las variables con prefijo `EXPO_PUBLIC_`.
 * Se acepta `EXPO_PUBLIC_BASE_URL` como nombre principal y
 * `EXPO_PUBLIC_API_URL` por compatibilidad con versiones anteriores.
 *
 * Si no hay variable definida, se intenta deducir la IP de la computadora a
 * partir del host de Metro (`Constants.expoConfig.hostUri`) y se usa el puerto
 * 3000, que es donde escucha la API en desarrollo.
 */
const PUERTO_API_POR_DEFECTO = 3000;
const BASE_URL_POR_DEFECTO = `http://localhost:${PUERTO_API_POR_DEFECTO}`;

/** Valida y normaliza una URL base HTTP(S). Devuelve `null` si no es válida. */
export function validarBaseUrl(valor: string | null | undefined): string | null {
  if (typeof valor !== 'string') return null;

  const limpio = valor.trim().replace(/\/+$/, '');
  if (limpio === '') return null;

  try {
    const url = new URL(limpio);
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error('URL base no válida');
    }

    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    console.warn('[config] EXPO_PUBLIC_BASE_URL inválida. Se usará la URL por defecto.');
    return null;
  }
}

/** Deduce `http://<IP de la PC>:3000` desde el host que usa Metro. */
function baseUrlDesdeMetro(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  const sinProtocolo = hostUri.replace(/^[a-z]+:\/\//i, '');
  const host = sinProtocolo.split('/')[0]?.split(':')[0];
  if (!host) return null;

  return validarBaseUrl(`http://${host}:${PUERTO_API_POR_DEFECTO}`);
}

const baseUrlEntorno =
  validarBaseUrl(process.env.EXPO_PUBLIC_BASE_URL) ?? validarBaseUrl(process.env.EXPO_PUBLIC_API_URL);

const baseUrlDetectada = baseUrlEntorno ? null : baseUrlDesdeMetro();

export const BASE_URL = baseUrlEntorno ?? baseUrlDetectada ?? BASE_URL_POR_DEFECTO;

if (!baseUrlEntorno) {
  console.warn(
    `[config] No se definió EXPO_PUBLIC_BASE_URL. Usando ${BASE_URL}` +
      (baseUrlDetectada ? ' (detectada desde Metro).' : '.')
  );
}

/** Tiempo máximo por defecto de las peticiones a la API. */
export const API_TIMEOUT_MS = 12000;
