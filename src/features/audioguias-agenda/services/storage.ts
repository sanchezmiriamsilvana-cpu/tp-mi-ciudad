import { File, Paths } from 'expo-file-system';

export interface EstadoModulo {
  posiciones: Record<string, number>;
  descargas: Record<string, string>;
  notificaciones: Record<string, string>;
}

const estadoInicial: EstadoModulo = {
  posiciones: {},
  descargas: {},
  notificaciones: {},
};

const archivoEstado = new File(Paths.document, 'audioguias-agenda.json');
let colaEscritura: Promise<void> = Promise.resolve();

function registroNumerico(valor: unknown): Record<string, number> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {};
  return Object.fromEntries(Object.entries(valor).filter((par): par is [string, number] => typeof par[1] === 'number'));
}

function registroTexto(valor: unknown): Record<string, string> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {};
  return Object.fromEntries(Object.entries(valor).filter((par): par is [string, string] => typeof par[1] === 'string'));
}

export async function leerEstado(): Promise<EstadoModulo> {
  if (!archivoEstado.exists) return { ...estadoInicial };
  try {
    const valor: unknown = JSON.parse(await archivoEstado.text());
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return { ...estadoInicial };
    const campos = valor as Record<string, unknown>;
    return {
      posiciones: { ...estadoInicial.posiciones, ...registroNumerico(campos.posiciones) },
      descargas: { ...estadoInicial.descargas, ...registroTexto(campos.descargas) },
      notificaciones: { ...estadoInicial.notificaciones, ...registroTexto(campos.notificaciones) },
    };
  } catch {
    return { ...estadoInicial };
  }
}

export function actualizarEstado(
  actualizar: (estado: EstadoModulo) => EstadoModulo
): Promise<void> {
  colaEscritura = colaEscritura.catch(() => undefined).then(async () => {
    const actual = await leerEstado();
    const siguiente = actualizar(actual);
    if (!archivoEstado.exists) archivoEstado.create({ intermediates: true });
    await archivoEstado.write(JSON.stringify(siguiente));
  });
  return colaEscritura;
}