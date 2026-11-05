import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTema } from '../../../contexto/TemaContext';
import { useAudioguia } from '../hooks/useAudioguia';

export default function MiniPlayer() {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { guiaActiva, estado, alternarReproduccion, detener } = useAudioguia();
  if (!guiaActiva || pathname === '/audioguia-player') return null;

  const avance = estado.duration > 0 ? Math.min(100, (estado.currentTime / estado.duration) * 100) : 0;

  return (
    <View pointerEvents="box-none" style={[styles.contenedorFlotante, { bottom: Math.max(insets.bottom + (pathname.includes('(tabs)') ? 60 : 0), 8) + 4 }]}>
      <View style={[styles.miniPlayer, { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Abrir reproductor de ${guiaActiva.titulo}`}
          onPress={() => router.push({ pathname: '/audioguia-player', params: { id: guiaActiva.id } })}
          style={styles.pista}
        >
          <Ionicons name="headset" size={19} color="#0284c7" />
          <View style={styles.textos}>
            <Text numberOfLines={1} style={[styles.titulo, { color: colores.textoPrincipal }]}>{guiaActiva.titulo}</Text>
            <Text style={[styles.subtitulo, { color: colores.textoSecundario }]}>{estado.playing ? 'Reproduciendo' : 'En pausa'}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={estado.playing ? 'Pausar audio' : 'Reanudar audio'} onPress={alternarReproduccion} style={styles.control}>
          <Ionicons name={estado.playing ? 'pause' : 'play'} size={20} color="#0284c7" />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Detener audio" onPress={detener} style={styles.control}>
          <Ionicons name="close" size={20} color={colores.textoSecundario} />
        </TouchableOpacity>
        <View style={styles.pistaFondo}>
          <View style={[styles.pistaAvance, { width: `${avance}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedorFlotante: { position: 'absolute', left: 12, right: 12, zIndex: 20 },
  miniPlayer: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, elevation: 5 },
  pista: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8 },
  textos: { flex: 1, minWidth: 0 },
  titulo: { fontSize: 12, fontWeight: '700' },
  subtitulo: { fontSize: 10, marginTop: 2 },
  control: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  pistaFondo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, overflow: 'hidden', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: '#dce5e9' },
  pistaAvance: { height: 2, backgroundColor: '#0284c7' },
});