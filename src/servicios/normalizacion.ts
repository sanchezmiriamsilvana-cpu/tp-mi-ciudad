/**
 * Helpers de normalización para respuestas heterogéneas de la API.
 * Se usan tanto en audioguías como en eventos para tolerar cambios de forma
 * (`{ datos }`, `{ data }`, arreglos directos, alias de campos, etc.).
 */
export type Registro = Record<string, unknown>;

export function esRegistro(valor: unknown): valor is Registro {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

export function texto(valor: unknown): string | null {
  if (typeof valor === 'string') {
    const limpio = valor.trim();
    return limpio !== '' ? limpio : null;
  }
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  return null;
}

/** Texto directo o el nombre de un objeto anidado (`lugar: { nombre }`). */
export function textoDe(valor: unknown): string | null {
  const directo = texto(valor);
  if (directo) return directo;
  if (esRegistro(valor)) {
    return texto(valor.nombre) ?? texto(valor.titulo) ?? texto(valor.title) ?? texto(valor.name);
  }
  return null;
}

/** URL directa o el campo `url`/`src` de un objeto multimedia. */
export function urlDe(valor: unknown): string | null {
  const directo = texto(valor);
  if (directo) return directo;
  if (esRegistro(valor)) {
    return texto(valor.url) ?? texto(valor.src) ?? texto(valor.href) ?? texto(valor.path);
  }
  return null;
}

export function numero(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (typeof valor !== 'string') return null;

  const limpio = valor.trim().replace(/[^\d.,-]/g, '');
  if (limpio === '' || limpio === '-' || limpio === '.' || limpio === ',') return null;

  const normalizado = limpio.replace(',', '.');
  const resultado = Number(normalizado);
  return Number.isFinite(resultado) ? resultado : null;
}

/** Duración en segundos a partir de un número o de formatos `mm:ss` / `3 min`. */
export function numeroASegundos(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return Math.max(0, Math.round(valor));
  if (typeof valor !== 'string') return null;

  const limpio = valor.trim();
  if (limpio === '') return null;

  if (/^\d+(?:[.,]\d+)?$/.test(limpio)) {
    return Math.max(0, Math.round(Number(limpio.replace(',', '.'))));
  }

  const partes = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(limpio);
  if (partes) {
    const horas = partes[3] ? Number(partes[1]) : 0;
    const minutos = partes[3] ? Number(partes[2]) : Number(partes[1]);
    const segundos = partes[3] ? Number(partes[3]) : Number(partes[2]);
    return horas * 3600 + minutos * 60 + segundos;
  }

  const conMinutos = /^(\d+(?:[.,]\d+)?)\s*(?:min|mins|minutos?)$/i.exec(limpio);
  if (conMinutos) {
    return Math.round(Number(conMinutos[1].replace(',', '.')) * 60);
  }
  return null;
}

/** Extrae el primer valor útil de una lista, un JSON serializado o un string separado por comas. */
export function primerElemento(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor[0];
  if (typeof valor !== 'string') return valor;

  const limpio = valor.trim();
  if (limpio.startsWith('[')) {
    try {
      const analizado: unknown = JSON.parse(limpio);
      if (Array.isArray(analizado)) return analizado[0];
    } catch {
      return valor;
    }
  }
  if (limpio.includes(',')) {
    const primero = limpio.split(',')[0].trim();
    if (primero) return primero;
  }
  return valor;
}

/** Busca la primera lista no vacía dentro de una respuesta envuelta. */
export function extraerLista(
  datos: unknown,
  campos: readonly string[],
  profundidad = 0
): unknown[] {
  if (Array.isArray(datos)) return datos;
  if (!esRegistro(datos) || profundidad > 3) return [];

  for (const campo of campos) {
    const valor = datos[campo];
    if (Array.isArray(valor) && valor.length > 0) return valor;
    if (esRegistro(valor)) {
      const anidada = extraerLista(valor, campos, profundidad + 1);
      if (anidada.length > 0) return anidada;
    }
  }
  return [];
}

/** Devuelve el objeto útil de una respuesta de detalle (`{ datos: {...} }`, etc.). */
export function extraerObjeto(datos: unknown, campos: readonly string[]): Registro | null {
  if (!esRegistro(datos)) return null;

  for (const campo of campos) {
    const valor = datos[campo];
    if (esRegistro(valor)) return valor;
  }
  return datos;
}

export function generarId(titulo: string, respaldo = 'elemento'): string {
  return (
    titulo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || respaldo
  );
}
