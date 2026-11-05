import { useEffect, useState } from 'react';

import { AUDIO_LOCAL, AUDIOGUIAS, Audioguia } from '../data/audioguias';
import {
  descargarAudio,
  eliminarDescarga,
  FuenteAudio,
  obtenerDescargaLocal,
  ProgresoDescarga,
  resolverFuenteReproduccion,
} from '../services/downloadService';

export function useAudioguias() {
  const [audiosLocales, setAudiosLocales] = useState<Record<string, string>>({});
  const [progresos, setProgresos] = useState<Record<string, ProgresoDescarga>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let montado = true;
    Promise.all(AUDIOGUIAS.map(async (guia) => [guia.id, await obtenerDescargaLocal(guia.id)] as const))
      .then((entradas) => {
        if (montado) {
          setAudiosLocales(Object.fromEntries(entradas.filter((entrada): entrada is readonly [string, string] => !!entrada[1])));
        }
      })
      .catch(() => {
        if (montado) setError('No se pudieron leer las descargas locales.');
      });
    return () => {
      montado = false;
    };
  }, []);

  // Guías con audio de demostración empaquetado: no necesitan descarga.
  const guiasIncluidas = Object.keys(AUDIO_LOCAL);

  function tieneAudioDisponible(guia: Audioguia): boolean {
    return guia.id in AUDIO_LOCAL || Boolean(guia.audioUrl) || Boolean(audiosLocales[guia.id]);
  }

  async function obtenerFuente(guia: Audioguia): Promise<FuenteAudio | null> {
    return resolverFuenteReproduccion(guia);
  }

  async function descargar(guia: Audioguia) {
    setOcupado(guia.id);
    setError(null);
    try {
      const uri = await descargarAudio(guia, (progreso) => {
        setProgresos((actuales) => ({ ...actuales, [guia.id]: progreso }));
      });
      setAudiosLocales((actuales) => ({ ...actuales, [guia.id]: uri }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falló la descarga. Comprueba tu conexión.');
    } finally {
      setOcupado(null);
      setProgresos((actuales) => {
        const siguientes = { ...actuales };
        delete siguientes[guia.id];
        return siguientes;
      });
    }
  }

  async function borrarDescarga(guiaId: string) {
    setOcupado(guiaId);
    setError(null);
    try {
      await eliminarDescarga(guiaId);
      setAudiosLocales((actuales) => {
        const siguientes = { ...actuales };
        delete siguientes[guiaId];
        return siguientes;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la descarga.');
    } finally {
      setOcupado(null);
    }
  }

  return {
    guias: AUDIOGUIAS,
    audiosLocales,
    guiasIncluidas,
    progresos,
    ocupado,
    error,
    tieneAudioDisponible,
    obtenerFuente,
    descargar,
    borrarDescarga,
  };
}