import { AudioPlayer, setAudioModeAsync } from 'expo-audio';

import { Audioguia } from '../data/audioguias';

export async function configurarAudioEnSegundoPlano(): Promise<void> {
  await setAudioModeAsync({
    shouldPlayInBackground: true,
    playsInSilentMode: true,
    interruptionMode: 'doNotMix',
  });
}

export function activarControlesBloqueo(player: AudioPlayer, guia: Audioguia): void {
  player.setActiveForLockScreen(true, {
    title: guia.titulo,
    artist: 'Mi Ciudad - Colón',
    artworkUrl: guia.imagen ?? undefined,
  });
}

export function desactivarControlesBloqueo(player: AudioPlayer): void {
  player.setActiveForLockScreen(false);
}