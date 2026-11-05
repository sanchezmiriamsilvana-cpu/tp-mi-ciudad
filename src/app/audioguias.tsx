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
import { router, Stack, useLocalSearchParams } from 'expo-router';
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
  
  // 🔹 Leemos los parámetros enviados desde la pantalla de detalle
  const params = useLocalSearchParams<{
    id?: string;
    lugarId?: string;
    urlAudio?: string;
    titulo?: string;
  }>();

  const reproductor = useAudioPlayer(null, { updateInterval: 250 });
  const estado = useAudioPlayerStatus(reproductor);
  
  const [audiosLocales, setAudiosLocales] = useState<Record<string, string>>({});
  const [pistaActiva, setPistaActiva] = useState<string | null>(null);
  const [importando, setImportando] = useState<string | null>(null);
  const [anchoProgreso, setAnchoProgreso] = useState(0);

  useEffect(() => {
    let montada = true;
    
    // Configurar modo de audio de fondo
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch((error) => console.warn('No se pudo configurar el audio:', error));

    // Cargar audios locales guardados en el almacenamiento del dispositivo
    Promise.all(AUDIOGUIAS.map(async (guia) => [guia.id, await obtenerAudioLocal(guia.id)] as const))
      .then((entradas) => {
        if (!montada) return;

        const dictLocales = Object.fromEntries(
          entradas.filter((entrada): entrada is readonly [string, string] => !!entrada)
        );
        setAudiosLocales(dictLocales);

        // 🎧 Auto-reproducir si se ingresó seleccionando un lugar específico
        const idBuscado = params.id || params.lugarId;
        if (idBuscado) {
          const guiaEncontrada = AUDIOGUIAS.find(
            (g) => g.id === idBuscado || (g as any).lugarId === idBuscado
          );

          // Prioridad: 1. Archivo local -> 2. URL parámetro -> 3. URL en objeto guía -> 4. URL fallback
          const uriFinal =
            dictLocales[idBuscado] ||
            dictLocales[guiaEncontrada?.id || ''] ||
            params.urlAudio ||
            (guiaEncontrada as any)?.urlAudio ||
            '[suspicious link removed]';

          const guiaAFinal: Audioguia = guiaEncontrada || {
            id: idBuscado,
            titulo: params.titulo || 'Audioguía Atractivo',
            descripcion: 'Relato del lugar',
          };

          if (uriFinal) {
            reproductor.replace({ uri: uriFinal });
            reproductor.setActiveForLockScreen(true, {
              title: guiaAFinal.titulo,
              artist: 'Audioguías de Colón',
              albumTitle: 'Mi Ciudad',
            });
            setPistaActiva(guiaAFinal.id);
            reproductor.play();
          }
        }
      })
      .catch((error) => console.warn('No se pudieron buscar audios locales:', error));

    return () => {
      montada = false;
    };
  }, [params.id, params.lugarId, params.urlAudio]);

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
    // 💡 Fallback: Si no existe el archivo local, busca la URL remota
    const uri =
      audiosLocales[guia.id] ||
      (guia as any).urlAudio ||
      (params.id === guia.id ? params.urlAudio : null) ||
      '[suspicious link removed]';

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
      <SafeAreaView style={[styles.container, { backgroundColor: colores?.fondo || '#F8F9FA' }]}>
        
        {/* Encabezado */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.btnVolver}>
            <Ionicons name="arrow-back" size={24} color={colores?.textoPrincipal || '#0F172A'} />
          </TouchableOpacity>
          <Text style={[styles.tituloHeader, { color: colores?.textoPrincipal || '#0F172A' }]}>
            Audioguías de la Ciudad
          </Text>
        </View>

        {/* Lista de Audioguías */}
        <FlatList
          data={AUDIOGUIAS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const tieneLocal = !!audiosLocales[item.id];
            const esActiva = pistaActiva === item.id;

            return (
              <View style={[styles.tarjeta, { backgroundColor: colores?.tarjetaFondo || '#FFFFFF' }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.tituloTarjeta, { color: colores?.textoPrincipal || '#0F172A' }]}>
                    {item.titulo}
                  </Text>
                  <Text style={[styles.descTarjeta, { color: colores?.textoSecundario || '#64748B' }]}>
                    {item.descripcion}
                  </Text>
                </View>

                {importando === item.id ? (
                  <ActivityIndicator color="#007AFF" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {/* Botón Reproducir / Pausar */}
                    <TouchableOpacity
                      style={[styles.btnAccion, esActiva && styles.btnAccionActivo]}
                      onPress={() => reproducir(item)}
                    >
                      <Ionicons
                        name={esActiva && estado.playing ? 'pause' : 'play'}
                        size={20}
                        color={esActiva ? '#FFF' : '#007AFF'}
                      />
                    </TouchableOpacity>

                    {/* Botón Importar Local */}
                    <TouchableOpacity
                      style={styles.btnImportar}
                      onPress={() => agregarAudio(item)}
                    >
                      <Ionicons
                        name={tieneLocal ? 'checkmark-circle' : 'cloud-download-outline'}
                        size={22}
                        color={tieneLocal ? '#34C759' : '#64748B'}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />

        {/* Reproductor Inferior Flotante */}
        {pistaActiva && (
          <View style={[styles.reproductorInferior, { backgroundColor: colores?.tarjetaFondo || '#FFFFFF' }]}>
            {/* Barra de Progreso */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => buscarEnProgreso(e.nativeEvent.locationX)}
              onLayout={(e) => setAnchoProgreso(e.nativeEvent.layout.width)}
              style={styles.barraProgresoContainer}
            >
              <View
                style={[
                  styles.barraProgreso,
                  {
                    width: `${
                      estado.duration > 0
                        ? (estado.currentTime / estado.duration) * 100
                        : 0
                    }%`,
                  },
                ]}
              />
            </TouchableOpacity>

            <View style={styles.reproductorContenido}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tituloReproductor, { color: colores?.textoPrincipal || '#0F172A' }]} numberOfLines={1}>
                  {AUDIOGUIAS.find((g) => g.id === pistaActiva)?.titulo || params.titulo || 'Audioguía'}
                </Text>
                <Text style={{ fontSize: 12, color: colores?.textoSecundario || '#64748B' }}>
                  {formatoTiempo(estado.currentTime)} / {formatoTiempo(estado.duration)}
                </Text>
              </View>

              {/* Controles de reproducción */}
              <TouchableOpacity
                onPress={() => {
                  const guiaActiva = AUDIOGUIAS.find((g) => g.id === pistaActiva) || {
                    id: pistaActiva,
                    titulo: params.titulo || 'Audioguía',
                    descripcion: '',
                  };
                  reproducir(guiaActiva);
                }}
                style={styles.btnControl}
              >
                <Ionicons
                  name={estado.playing ? 'pause-circle' : 'play-circle'}
                  size={36}
                  color="#007AFF"
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={detener} style={styles.btnControl}>
                <Ionicons name="close-circle" size={30} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  btnVolver: { padding: 4 },
  tituloHeader: { fontSize: 20, fontWeight: 'bold' },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tituloTarjeta: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  descTarjeta: { fontSize: 13 },
  btnAccion: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,122,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnAccionActivo: { backgroundColor: '#007AFF' },
  btnImportar: { padding: 4 },
  reproductorInferior: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  barraProgresoContainer: {
    height: 4,
    width: '100%',
    backgroundColor: '#E2E8F0',
  },
  barraProgreso: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  reproductorContenido: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  tituloReproductor: { fontSize: 15, fontWeight: 'bold' },
  btnControl: { padding: 2 },
});