import { BASE_URL } from '../config/env';
import { urlDe } from './normalizacion';

const HOSTS_LOCALES = ['localhost', '127.0.0.1', '0.0.0.0'];

/**
 * Convierte rutas relativas y hosts locales en URLs accesibles desde el
 * dispositivo, usando la `BASE_URL` configurada.
 */
export function resolverUrlMedia(valor: unknown): string | null {
  const url = urlDe(valor);
  if (!url) return null;
  if (/^(data:|file:|content:|assets-library:)/i.test(url)) return url;

  if (/^https?:\/\//i.test(url)) {
    try {
      const analizada = new URL(url);
      if (HOSTS_LOCALES.includes(analizada.hostname)) {
        const base = new URL(BASE_URL);
        return `${base.protocol}//${base.host}${analizada.pathname}${analizada.search}${analizada.hash}`;
      }
      return url;
    } catch {
      return url;
    }
  }

  try {
    const base = new URL(BASE_URL);
    if (url.startsWith('/')) {
      return `${base.protocol}//${base.host}${url}`;
    }
    return `${base.protocol}//${base.host}${base.pathname.replace(/\/+$/, '')}/${url}`;
  } catch {
    return `${BASE_URL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
  }
}
