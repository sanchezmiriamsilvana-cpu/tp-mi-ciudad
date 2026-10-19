import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { Audioguia } from '../data/audioguias';
import {
  activarControlesBloqueo,
  configurarAudioEnSegundoPlano,
  desactivarControlesBloqueo,
} from '../services/audioService';
import { FuenteAudio } from '../services/downloadService';
import { actualizarEstado, leerEstado } from '../services/storage';

type EstadoAudio = ReturnType<typeof useAudioPlayerStatus>;

interface AudioguiaContexto {
  guiaActiva: Audioguia | null;
  estado: EstadoAudio;
  velocidad: number;
  errorAudio: string | null;
  reproducir: (guia: Audioguia, fuente: FuenteAudio) => Promise<void>;
  alternarReproduccion: () => void;
  detener: () => void;
  buscar: (segundos: number) => void;
  saltar: (segundos: number) => void;
  cambiarVelocidad: (velocidad: number) => void;
}

const ContextoAudioguia = createContext<AudioguiaContexto | null>(null);

export function AudioguiasProvider({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const estado = useAudioPlayerStatus(player);
  const [guiaActiva, setGuiaActiva] = useState<Audioguia | null>(null);
  const [velocidad, setVelocidad] = useState(1);
  const [errorAudio, setErrorAudio] = useState<string | null>(null);
  const ultimaPosicionGuardada = useRef(0);
  const cargaDescargada = useRef(false);
  const solicitudCarga = useRef(0);
  const [posicionPendiente, setPosicionPendiente] = useState<{ id: string; segundos: number } | null>(null);

  useEffect(() => {
    configurarAudioEnSegundoPlano().catch(() => {
      setErrorAudio('No se pudo activar la sesión de audio en segundo plano.');
    });
  }, []);

  useEffect(() => {
    if (!guiaActiva || !estado.isLoaded || estado.currentTime < 0) return;
    if (Math.abs(estado.currentTime - ultimaPosicionGuardada.current) < 5) return;
    ultimaPosicionGuardada.current = estado.currentTime;
    void actualizarEstado((guardado) => ({
      ...guardado,
      posiciones: { ...guardado.posiciones, [guiaActiva.id]: estado.currentTime },
    })).catch(() => setErrorAudio('No se pudo guardar la posición de reproducción.'));
  }, [estado.currentTime, estado.isLoaded, guiaActiva]);

  useEffect(() => {
    if (!guiaActiva || !estado.isLoaded) {
      cargaDescargada.current = true;
      return;
    }
    if (!cargaDescargada.current || posicionPendiente?.id !== guiaActiva.id) return;

    cargaDescargada.current = false;
    const { segundos } = posicionPendiente;
    setPosicionPendiente(null);
    void (async () => {
      try {
        if (segundos > 0) await player.seekTo(segundos);
        player.play();
      } catch {
        setErrorAudio('No se pudo recuperar la posición guardada.');
        player.play();
      }
    })();
  }, [estado.isLoaded, guiaActiva, player, posicionPendiente]);

  async function reproducir(guia: Audioguia, fuente: FuenteAudio) {
    setErrorAudio(null);
    if (guiaActiva?.id === guia.id) {
      if (estado.didJustFinish) await player.seekTo(0);
      player.play();
      return;
    }

    const solicitud = ++solicitudCarga.current;
    player.pause();
    cargaDescargada.current = !player.isLoaded;
    setPosicionPendiente(null);
    player.replace(fuente);
    setGuiaActiva(guia);
    ultimaPosicionGuardada.current = 0;
    activarControlesBloqueo(player, guia);
    const guardado = await leerEstado();
    if (solicitud === solicitudCarga.current) {
      setPosicionPendiente({ id: guia.id, segundos: guardado.posiciones[guia.id] ?? 0 });
    }
  }

  function alternarReproduccion() {
    if (estado.playing) player.pause();
    else if (guiaActiva) player.play();
  }

  function detener() {
    solicitudCarga.current += 1;
    player.pause();
    void player.seekTo(0);
    desactivarControlesBloqueo(player);
    setPosicionPendiente(null);
    if (guiaActiva) {
      void actualizarEstado((guardado) => ({
        ...guardado,
        posiciones: { ...guardado.posiciones, [guiaActiva.id]: 0 },
      })).catch(() => setErrorAudio('No se pudo reiniciar la posición guardada.'));
    }
    setGuiaActiva(null);
    ultimaPosicionGuardada.current = 0;
  }

  function buscar(segundos: number) {
    if (!Number.isFinite(segundos) || estado.duration <= 0) return;
    void player.seekTo(Math.max(0, Math.min(estado.duration, segundos)));
  }

  function saltar(segundos: number) {
    buscar(estado.currentTime + segundos);
  }

  function cambiarVelocidad(nuevaVelocidad: number) {
    const limitada = Math.max(0.5, Math.min(2, nuevaVelocidad));
    player.playbackRate = limitada;
    setVelocidad(limitada);
  }

  return (
    <ContextoAudioguia.Provider
      value={{
        guiaActiva,
        estado,
        velocidad,
        errorAudio,
        reproducir,
        alternarReproduccion,
        detener,
        buscar,
        saltar,
        cambiarVelocidad,
      }}
    >
      {children}
    </ContextoAudioguia.Provider>
  );
}

export function useAudioguia(): AudioguiaContexto {
  const contexto = useContext(ContextoAudioguia);
  if (!contexto) throw new Error('useAudioguia debe usarse dentro de AudioguiasProvider.');
  return contexto;
}