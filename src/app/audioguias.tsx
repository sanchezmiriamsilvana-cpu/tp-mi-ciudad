import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';

import { useTema } from '../contexto/TemaContext';
import {
  AUDIOGUIAS,
  Audioguia,
  importarAudioLocal,
  obtenerAudioLocal,
} from '../servicios/audioguias';

function formatoTiempo(segundos: number): string {
  const valor = Math.max(0, Math.floor(segundos));
  return `${Math.floor(valor / 60)}:${String(valor % 60).padStart(2, '0')}`;
}

export default function PantallaAudioguias() {
  const { colores } = useTema();
  const reproductor = useAudioPlayer(null, { updateInterval: 250 });
  const estado = useAudioPlayerStatus(reproductor);
  const [audiosLocales, setAudiosLocales] = useState<Record<string, string>>({});
  const [pistaActiva, setPistaActiva] = useState<string | null>(null);
  const [importando, setImportando] = useState<string | null>(null);
  const [anchoProgreso, setAnchoProgreso] = useState(0);

  useEffect(() => {
    let montada = true;
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch((error) => console.warn('No se pudo configurar el audio:', error));

    Promise.all(AUDIOGUIAS.map(async (guia) => [guia.id, await obtenerAudioLocal(guia.id)] as const))
      .then((entradas) => {
        if (montada) {
          setAudiosLocales(
            Object.fromEntries(entradas.filter((entrada): entrada is readonly [string, string] => !!entrada[1]))
          );
        }
      })
      .catch((error) => console.warn('No se pudieron buscar audios locales:', error));

    return () => {
      montada = false;
    };
  }, []);

  async function agregarAudio(guia: Audioguia) {
    setImportando(guia.id);
    try {
      const uri = await importarAudioLocal(guia.id);
      if (uri) setAudiosLocales((audios) => ({ ...audios, [guia.id]: uri }));
    } catch (error) {
      Alert.alert('No se pudo importar el audio', error instanceof Error ? error.message : 'Intenta con otro archivo.');
    } finally {
      setImportando(null);
    }
  }

  function reproducir(guia: Audioguia) {
    const uri = audiosLocales[guia.id];
    if (!uri) return;

    if (pistaActiva === guia.id) {
      if (estado.playing) reproductor.pause();
      else reproductor.play();
      return;
    }

    reproductor.replace({ uri });
    reproductor.setActiveForLockScreen(true, {
      title: guia.titulo,
      artist: 'Audioguías de Colón',
      albumTitle: 'Mi Ciudad',
    });
    setPistaActiva(guia.id);
    reproductor.play();
  }

  function detener() {
    reproductor.pause();
    void reproductor.seekTo(0);
    reproductor.setActiveForLockScreen(false);
    setPistaActiva(null);
  }

  function buscarEnProgreso(x: number) {
    if (pistaActiva && anchoProgreso > 0 && estado.duration > 0) {
      void reproductor.seekTo(Math.max(0, Math.min(1, x / anchoProgreso)) * estado.duration);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colores.fondo }]} edges={['top', 'bottom']}>
        <View style={styles.encabezado}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={styles.volver}>
          <Ionicons name="arrow-back" size={22} color={colores.textoPrincipal} />
        </TouchableOpacity>
        <View style={styles.titulos}>
          <Text style={[styles.titulo, { color: colores.textoPrincipal }]}>Audioguías</Text>
          <Text style={[styles.subtitulo, { color: colores.textoSecundario }]}>Puntos de interés de Colón</Text>
        </View>
        </View>

        <FlatList
        data={AUDIOGUIAS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        renderItem={({ item, index }) => {
          const disponible = Boolean(audiosLocales[item.id]);
          const activa = pistaActiva === item.id;
          return (
            <View style={[styles.fila, { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde }]}>
              <View style={styles.numero}>
                <Text style={[styles.numeroTexto, { color: colores.textoSecundario }]}>{String(index + 1).padStart(2, '0')}</Text>
              </View>
              <View style={styles.contenidoFila}>
                <Text style={[styles.nombre, { color: colores.textoPrincipal }]}>{item.titulo}</Text>
                <Text style={[styles.descripcion, { color: colores.textoSecundario }]}>{item.descripcion}</Text>
                {activa && (
                  <View style={styles.progresoContenedor}>
                    <TouchableOpacity
                      accessibilityRole="adjustable"
                      accessibilityLabel="Posición de reproducción"
                      accessibilityValue={{ min: 0, max: Math.round(estado.duration), now: Math.round(estado.currentTime) }}
                      onLayout={(event) => setAnchoProgreso(event.nativeEvent.layout.width)}
                      onPress={(event) => buscarEnProgreso(event.nativeEvent.locationX)}
                      style={styles.pistaProgreso}
                    >
                      <View style={[styles.progreso, { width: `${estado.duration ? (estado.currentTime / estado.duration) * 100 : 0}%` }]} />
                    </TouchableOpacity>
                    <View style={styles.tiempos}>
                      <Text style={[styles.tiempo, { color: colores.textoSecundario }]}>{formatoTiempo(estado.currentTime)}</Text>
                      <Text style={[styles.tiempo, { color: colores.textoSecundario }]}>{formatoTiempo(estado.duration)}</Text>
                    </View>
                  </View>
                )}
                <View style={styles.pieFila}>
                  <Text style={[styles.disponibilidad, { color: disponible ? '#16835d' : colores.textoSecundario }]}>
                    {disponible ? 'Audio disponible' : 'Sin audio local'}
                  </Text>
                  <View style={styles.controles}>
                    {disponible && activa && (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Detener reproducción"
                        onPress={detener}
                        style={styles.botonControl}
                      >
                        <Ionicons name="stop" size={18} color={colores.textoSecundario} />
                      </TouchableOpacity>
                    )}
                    {disponible ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={activa && estado.playing ? 'Pausar' : 'Reproducir'}
                        onPress={() => reproducir(item)}
                        style={[styles.botonPlay, { backgroundColor: '#0284c7' }]}
                      >
                        <Ionicons name={activa && estado.playing ? 'pause' : 'play'} size={17} color="#fff" />
                        <Text style={styles.textoPlay}>{activa && estado.playing ? 'Pausar' : 'Reproducir'}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Añadir audio para ${item.titulo}`}
                        disabled={importando === item.id}
                        onPress={() => agregarAudio(item)}
                        style={styles.botonImportar}
                      >
                        {importando === item.id ? (
                          <ActivityIndicator size="small" color="#0284c7" />
                        ) : (
                          <Ionicons name="add-circle-outline" size={19} color="#0284c7" />
                        )}
                        <Text style={styles.textoImportar}>Añadir audio</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>
          );
        }}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  encabezado: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 16, gap: 12 },
  volver: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  titulos: { flex: 1 },
  titulo: { fontSize: 24, fontWeight: '800' },
  subtitulo: { fontSize: 13, marginTop: 3 },
  lista: { paddingHorizontal: 16, paddingBottom: 24 },
  fila: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, padding: 14, marginBottom: 9 },
  numero: { width: 36, paddingTop: 2 },
  numeroTexto: { fontSize: 12, fontWeight: '800' },
  contenidoFila: { flex: 1 },
  nombre: { fontSize: 15, fontWeight: '700' },
  descripcion: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  progresoContenedor: { marginTop: 12 },
  pistaProgreso: { height: 12, borderRadius: 6, backgroundColor: '#dbe4e8', overflow: 'hidden', justifyContent: 'center' },
  progreso: { height: 4, backgroundColor: '#0284c7', borderRadius: 2 },
  tiempos: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  tiempo: { fontSize: 10, fontVariant: ['tabular-nums'] },
  pieFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  disponibilidad: { fontSize: 11, fontWeight: '600' },
  controles: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  botonControl: { minWidth: 34, minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  botonPlay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 34, paddingHorizontal: 11, borderRadius: 6 },
  textoPlay: { color: '#fff', fontSize: 12, fontWeight: '700' },
  botonImportar: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 34, paddingHorizontal: 4 },
  textoImportar: { color: '#0284c7', fontSize: 12, fontWeight: '700' },
});