import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { mensajeDeErrorApi } from '../../../servicios/errores';
import type { Audioguia } from '../data/audioguias';
import { guardarCatalogoCache, leerCatalogoCache } from '../services/cacheAudioguias';
import { obtenerCatalogoAudioguias } from '../services/apiAudioguias';
import {
  descargarAudio,
  eliminarDescarga,
  FuenteAudio,
  obtenerDescargasLocales,
  ProgresoDescarga,
  resolverFuenteReproduccion,
} from '../services/downloadService';

interface ContextoAudioguias {
  /** Catálogo vigente: API o copia guardada de una respuesta anterior. */
  guias: Audioguia[];
  cargando: boolean;
  refrescando: boolean;
  /** Aviso no bloqueante cuando la API falla y se usa la caché. */
  errorCatalogo: string | null;
  desdeCache: boolean;
  actualizadoEn: string | null;
  endpoint: string | null;
  recargar: () => Promise<void>;
  buscarGuia: (id: string) => Audioguia | undefined;
  audiosLocales: Record<string, string>;
  progresos: Record<string, ProgresoDescarga>;
  ocupado: string | null;
  error: string | null;
  tieneAudioDisponible: (guia: Audioguia) => boolean;
  obtenerFuente: (guia: Audioguia) => Promise<FuenteAudio | null>;
  descargar: (guia: Audioguia) => Promise<void>;
  borrarDescarga: (guiaId: string) => Promise<void>;
}

const Contexto = createContext<ContextoAudioguias | null>(null);

function mensajeDeError(error: unknown): string {
  return mensajeDeErrorApi(error, 'el catálogo de audioguías');
}

export function AudioguiasCatalogoProvider({ children }: { children: React.ReactNode }) {
  const [guias, setGuias] = useState<Audioguia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(null);
  const [desdeCache, setDesdeCache] = useState(false);
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);

  const [audiosLocales, setAudiosLocales] = useState<Record<string, string>>({});
  const [progresos, setProgresos] = useState<Record<string, ProgresoDescarga>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const montado = useRef(true);
  const guiasRef = useRef<Audioguia[]>([]);

  useEffect(() => {
    guiasRef.current = guias;
  }, [guias]);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const cargarCatalogo = useCallback(
    async (modo: 'inicial' | 'refresco' = 'inicial') => {
      const esRefresco = modo === 'refresco';
      if (esRefresco) setRefrescando(true);
      else if (guiasRef.current.length === 0) setCargando(true);
      setErrorCatalogo(null);

      let hayCatalogoVisible = guiasRef.current.length > 0;

      try {
        // Primera carga: mostramos de inmediato la copia guardada (si existe)
        // mientras la API responde en segundo plano.
        if (!esRefresco && guiasRef.current.length === 0) {
          const cache = await leerCatalogoCache();
          if (cache && montado.current) {
            setGuias(cache.guias);
            setDesdeCache(true);
            setActualizadoEn(cache.actualizadoEn);
            setEndpoint(cache.endpoint);
            setCargando(false);
            hayCatalogoVisible = cache.guias.length > 0;
          }
        }

        const resultado = await obtenerCatalogoAudioguias();
        if (!montado.current) return;

        setGuias(resultado.guias);
        setDesdeCache(false);
        setEndpoint(resultado.endpoint);

        const ahora = new Date().toISOString();
        setActualizadoEn(ahora);
        await guardarCatalogoCache({
          actualizadoEn: ahora,
          endpoint: resultado.endpoint,
          guias: resultado.guias,
        }).catch((fallo) => {
          console.warn('No se pudo guardar el catálogo para uso sin conexión:', fallo);
        });
      } catch (fallo) {
        if (!montado.current) return;
        const mensaje = mensajeDeError(fallo);
        setErrorCatalogo(
          hayCatalogoVisible ? `${mensaje} Se mantiene el catálogo guardado.` : mensaje
        );
      } finally {
        if (montado.current) {
          setCargando(false);
          setRefrescando(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void cargarCatalogo('inicial');
  }, [cargarCatalogo]);

  useEffect(() => {
    let vigente = true;
    obtenerDescargasLocales()
      .then((descargas) => {
        if (!vigente) return;
        setAudiosLocales(descargas);
      })
      .catch(() => {
        if (vigente) setError('No se pudieron leer las descargas locales.');
      });
    return () => {
      vigente = false;
    };
  }, []);

  const recargar = useCallback(async () => {
    await cargarCatalogo('refresco');
  }, [cargarCatalogo]);

  const buscarGuia = useCallback(
    (id: string) => guias.find((guia) => guia.id === id),
    [guias]
  );

  const tieneAudioDisponible = useCallback(
    (guia: Audioguia): boolean =>
      Boolean(guia.audioUrl) || Boolean(audiosLocales[guia.id]),
    [audiosLocales]
  );

  const obtenerFuente = useCallback(
    (guia: Audioguia): Promise<FuenteAudio | null> => resolverFuenteReproduccion(guia),
    []
  );

  async function descargar(guia: Audioguia) {
    setOcupado(guia.id);
    setError(null);
    try {
      const uri = await descargarAudio(guia, (progreso) => {
        setProgresos((actuales) => ({ ...actuales, [guia.id]: progreso }));
      });
      setAudiosLocales((actuales) => ({ ...actuales, [guia.id]: uri }));
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'Falló la descarga. Comprueba tu conexión.');
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
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo eliminar la descarga.');
    } finally {
      setOcupado(null);
    }
  }

  const valor = useMemo<ContextoAudioguias>(
    () => ({
      guias,
      cargando,
      refrescando,
      errorCatalogo,
      desdeCache,
      actualizadoEn,
      endpoint,
      recargar,
      buscarGuia,
      audiosLocales,
      progresos,
      ocupado,
      error,
      tieneAudioDisponible,
      obtenerFuente,
      descargar,
      borrarDescarga,
    }),
    [
      guias,
      cargando,
      refrescando,
      errorCatalogo,
      desdeCache,
      actualizadoEn,
      endpoint,
      recargar,
      buscarGuia,
      audiosLocales,
      progresos,
      ocupado,
      error,
      tieneAudioDisponible,
      obtenerFuente,
    ]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAudioguias(): ContextoAudioguias {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error('useAudioguias debe usarse dentro de AudioguiasCatalogoProvider.');
  }
  return contexto;
}
