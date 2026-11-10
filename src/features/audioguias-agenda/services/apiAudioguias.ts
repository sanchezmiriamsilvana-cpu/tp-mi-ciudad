import { isAxiosError } from 'axios';

import { api } from '../../../servicios/api';
import {
  esRegistro,
  extraerLista,
  generarId,
  numeroASegundos,
  primerElemento,
  texto,
  textoDe,
  urlDe,
} from '../../../servicios/normalizacion';
import { resolverUrlMedia } from '../../../servicios/urls';
import { Audioguia } from '../data/audioguias';

/**
 * En la API de Mi Ciudad las audioguías no tienen un endpoint propio: cada
 * `Lugar` trae un objeto `audioguia` (`{ url, duracionSegundos, idioma }`) o
 * `null`. Por eso el catálogo se arma desde `GET /lugares?porPagina=500`.
 *
 * Se pueden dejar rutas alternativas para otros backends; se prueban en orden
 * y se usa la primera que responda. Se puede forzar una con
 * `EXPO_PUBLIC_AUDIOGUIAS_PATH`.
 */
const RUTA_LUGARES = '/lugares';
const RUTAS_CATALOGO = [RUTA_LUGARES, '/audioguias', '/audiolibros'];
const POR_PAGINA_LUGARES = 500;

const TIEMPO_ESPERA_MS = 8000;
const CAMPOS_LISTA = ['datos', 'data', 'items', 'results', 'audioguias', 'audiolibros', 'catalogo', 'contenido'];

export interface ResultadoCatalogo {
  guias: Audioguia[];
  endpoint: string;
}

function minutosASegundos(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return Math.round(valor * 60);
  if (typeof valor === 'string') {
    const numero = Number(valor.trim().replace(',', '.'));
    return Number.isFinite(numero) ? Math.round(numero * 60) : null;
  }
  return null;
}

function extraerAudio(item: Record<string, unknown>): string | null {
  const candidatos = [
    item.audioUrl,
    item.urlAudio,
    item.audio_url,
    item.url_audio,
    item.audioURL,
    item.audio,
    item.archivoAudio,
    item.archivo_audio,
    item.recursoAudio,
    item.audioguia,
    item.audiolibro,
    item.mp3,
    item.archivo,
  ];

  for (const candidato of candidatos) {
    const url = urlDe(candidato);
    if (url) return url;
  }

  // `url` genérica: solo se acepta si apunta a un archivo de audio.
  const urlGenerica = urlDe(item.url);
  if (urlGenerica && /\.(mp3|m4a|aac|wav|ogg)(\?|#|$)/i.test(urlGenerica)) return urlGenerica;
  return null;
}

function normalizarAudioguia(item: unknown, tipoPorDefecto: string): Audioguia | null {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return null;
  const registro = item as Record<string, unknown>;

  const titulo =
    texto(registro.titulo) ??
    texto(registro.nombre) ??
    texto(registro.title) ??
    texto(registro.name) ??
    textoDe(registro.lugar) ??
    texto(registro.nombreLugar);
  const idBruto =
    texto(registro.id) ??
    texto(registro._id) ??
    texto(registro.audioguiaId) ??
    texto(registro.audiolibroId) ??
    texto(registro.slug) ??
    texto(registro.uuid);

  if (!titulo && !idBruto) return null;

  const tituloFinal = titulo ?? idBruto ?? 'Audioguía';
  const descripcion =
    texto(registro.descripcion) ??
    texto(registro.descripcionCorta) ??
    texto(registro.descripcion_corta) ??
    texto(registro.descripcionLarga) ??
    texto(registro.descripcion_larga) ??
    texto(registro.description) ??
    texto(registro.resumen) ??
    texto(registro.detalle) ??
    texto(registro.summary) ??
    '';

  return {
    id: idBruto ?? generarId(tituloFinal, 'audioguia'),
    titulo: tituloFinal,
    descripcion,
    duracion:
      numeroASegundos(registro.duracion) ??
      numeroASegundos(registro.duracionSegundos) ??
      numeroASegundos(registro.duracion_segundos) ??
      minutosASegundos(registro.duracionMinutos) ??
      minutosASegundos(registro.duracion_minutos) ??
      numeroASegundos(registro.duration) ??
      numeroASegundos(registro.segundos) ??
      numeroASegundos(registro.tiempo),
    imagen: resolverUrlMedia(
      primerElemento(
        registro.imagen ??
          registro.imagenUrl ??
          registro.imagen_url ??
          registro.imagenPrincipal ??
          registro.imagen_principal ??
          registro.portada ??
          registro.foto ??
          registro.urlImagen ??
          registro.image ??
          registro.cover ??
          registro.thumbnail ??
          registro.imagenes
      )
    ),
    audioUrl: resolverUrlMedia(extraerAudio(registro)),
    tipo:
      texto(registro.tipo) ??
      texto(registro.tipoContenido) ??
      texto(registro.tipo_contenido) ??
      texto(registro.categoria) ??
      texto(registro.type) ??
      texto(registro.clase) ??
      tipoPorDefecto,
    autor:
      texto(registro.autor) ??
      texto(registro.autorNombre) ??
      texto(registro.narrador) ??
      texto(registro.author) ??
      texto(registro.voz),
  };
}

/**
 * Convierte un `Lugar` de la API en una audioguía. Sólo los lugares que traen
 * `audioguia` con URL entran al catálogo.
 */
function normalizarLugar(item: unknown): Audioguia | null {
  if (!esRegistro(item)) return null;
  const audio = item.audioguia;
  if (!esRegistro(audio)) return null;

  const url = urlDe(audio.url ?? audio.audioUrl ?? audio);
  if (!url) return null;

  const guia = normalizarAudioguia(item, 'audioguia');
  if (!guia) return null;

  return {
    ...guia,
    descripcion: texto(item.descripcionCorta) ?? guia.descripcion,
    duracion:
      guia.duracion ??
      numeroASegundos(audio.duracionSegundos) ??
      numeroASegundos(audio.duracion) ??
      minutosASegundos(audio.duracionMinutos),
    audioUrl: resolverUrlMedia(url),
  };
}

function normalizarLista(lista: unknown[], tipoPorDefecto: string): Audioguia[] {
  const vistos = new Set<string>();
  const guias: Audioguia[] = [];

  for (const item of lista) {
    const guia = normalizarAudioguia(item, tipoPorDefecto);
    if (!guia) continue;

    let id = guia.id;
    let sufijo = 2;
    while (vistos.has(id)) {
      id = `${guia.id}-${sufijo}`;
      sufijo += 1;
    }
    vistos.add(id);
    guias.push({ ...guia, id });
  }
  return guias;
}

export function obtenerRutasCatalogo(): string[] {
  const rutaConfigurada = process.env.EXPO_PUBLIC_AUDIOGUIAS_PATH?.trim();
  if (rutaConfigurada) {
    const limpia = rutaConfigurada.replace(/\/+$/, '');
    return [limpia.startsWith('/') ? limpia : `/${limpia}`];
  }
  return RUTAS_CATALOGO;
}

/**
 * Descarga el catálogo de audioguías desde la API REST configurada en
 * `BASE_URL`. El catálogo real sale de `GET /lugares?porPagina=500` (los
 * lugares con `audioguia`), con rutas alternativas para otros backends.
 * Una respuesta exitosa sin elementos es un catálogo vacío, no un error.
 */
export async function obtenerCatalogoAudioguias(): Promise<ResultadoCatalogo> {
  let ultimoError: unknown = null;

  for (const ruta of obtenerRutasCatalogo()) {
    const esLugares = ruta === RUTA_LUGARES;
    try {
      const respuesta = await api.get(
        ruta,
        esLugares
          ? { params: { porPagina: POR_PAGINA_LUGARES }, timeout: TIEMPO_ESPERA_MS }
          : { timeout: TIEMPO_ESPERA_MS }
      );
      const lista = extraerLista(respuesta.data, CAMPOS_LISTA);
      const tipo = ruta.toLowerCase().includes('libro') ? 'audiolibro' : 'audioguia';
      const guias = esLugares
        ? lista
            .map(normalizarLugar)
            .filter((guia): guia is Audioguia => guia !== null)
        : normalizarLista(lista, tipo);

      return {
        guias,
        endpoint: esLugares ? `${ruta}?porPagina=${POR_PAGINA_LUGARES}` : ruta,
      };
    } catch (error) {
      ultimoError = error;
      const estado = isAxiosError(error) ? error.response?.status : undefined;
      // Sin respuesta del servidor no tiene sentido seguir probando rutas.
      if (estado === undefined) break;
      if (estado !== 404) break;
    }
  }

  if (ultimoError instanceof Error) throw ultimoError;
  throw new Error('No se pudo obtener el catálogo desde la API.');
}
