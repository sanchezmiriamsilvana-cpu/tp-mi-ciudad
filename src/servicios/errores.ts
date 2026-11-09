import { isAxiosError } from 'axios';

/** Mensaje homogéneo para errores de red o respuestas HTTP fallidas. */
export function mensajeDeErrorApi(error: unknown, contexto = 'los datos'): string {
  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message)) {
      return `La API tardó demasiado en responder al pedir ${contexto}.`;
    }
    if (!error.response) {
      return `No se pudo conectar con la API para obtener ${contexto}.`;
    }
    if (error.response.status === 404) {
      return `La API no encontró ${contexto}.`;
    }
    if (error.response.status === 401 || error.response.status === 403) {
      return `La API rechazó la solicitud de ${contexto}.`;
    }
    return `La API respondió ${error.response.status} al pedir ${contexto}.`;
  }
  return error instanceof Error ? error.message : `No se pudo obtener ${contexto}.`;
}
