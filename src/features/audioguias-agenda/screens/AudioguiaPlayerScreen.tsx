import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '../../../contexto/TemaContext';
import { AUDIOGUIAS } from '../data/audioguias';
import { useAudioguia } from '../hooks/useAudioguia';
import { useAudioguias } from '../hooks/useAudioguias';

function formatoTiempo(segundos: number): string {
  const valor = Math.max(0, Math.floor(segundos));
  return `${Math.floor(valor / 60)}:${String(valor % 60).padStart(2, '0')}`;
}

const velocidades = [1, 1.25, 1.5, 1.75, 2];

export default function AudioguiaPlayerScreen() {
  const { colores } = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const guia = AUDIOGUIAS.find((item) => item.id === id);
  const audio = useAudioguia();
  const catalogo = useAudioguias();
  const [anchoBarra, setAnchoBarra] = useState(0);
  const [descargando, setDescargando] = useState(false);
  const [fuenteResuelta, setFuenteResuelta] = useState<Awaited<ReturnType<typeof catalogo.obtenerFuente>>>(null);
  const activa = Boolean(guia && audio.guiaActiva?.id === guia.id);
  const descargada = Boolean(guia && catalogo.audiosLocales[guia.id]);
  const incluida = Boolean(guia && catalogo.guiasIncluidas.includes(guia.id));
  const fuente = guia ? fuenteResuelta : null;
  const avance = activa && audio.estado.duration > 0 ? audio.estado.currentTime / audio.estado.duration : 0;

  React.useEffect(() => {
    if (!guia) return;
    let vigente = true;
    void catalogo.obtenerFuente(guia).then((resultado) => {
      if (vigente) setFuenteResuelta(resultado);
    });
    return () => {
      vigente = false;
    };
  }, [guia, descargada]);

  if (!guia) {
    return (
      <SafeAreaView style={[styles.container, styles.centrado, { backgroundColor: colores.fondo }]}>
        <Text style={{ color: colores.textoPrincipal }}>No se encontró esta audioguía.</Text>
      </SafeAreaView>
    );
  }

  function cambiarPosicion(x: number) {
    if (anchoBarra > 0 && activa && audio.estado.duration > 0) {
      audio.buscar((Math.max(0, Math.min(anchoBarra, x)) / anchoBarra) * audio.estado.duration);
    }
  }

  async function manejarDescarga() {
    if (!guia) return;
    setDescargando(true);
    await catalogo.descargar(guia);
    const resultado = await catalogo.obtenerFuente(guia);
    setFuenteResuelta(resultado);
    setDescargando(false);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colores.fondo }]} edges={['top', 'bottom']}>
        <View style={styles.encabezado}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a audioguías" onPress={() => router.back()} style={styles.volver}>
            <Ionicons name="arrow-back" size={22} color={colores.textoPrincipal} />
          </TouchableOpacity>
          <Text style={[styles.textoEncabezado, { color: colores.textoPrincipal }]}>Reproductor</Text>
        </View>

        <View style={styles.contenido}>
          <View style={styles.portada}>
            <Ionicons name="headset-outline" size={58} color="#0284c7" />
          </View>
          <Text style={[styles.titulo, { color: colores.textoPrincipal }]}>{guia.titulo}</Text>
          <Text style={[styles.descripcion, { color: colores.textoSecundario }]}>{guia.descripcion}</Text>

          <View style={styles.controlesReproductor}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Retroceder 10 segundos"
              disabled={!activa}
              onPress={() => audio.saltar(-10)}
              style={styles.botonSalto}
            >
              <Ionicons name="play-back" size={20} color={activa ? colores.textoPrincipal : colores.textoSecundario} />
              <Text style={[styles.segundos, { color: colores.textoSecundario }]}>10</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={activa && audio.estado.playing ? 'Pausar' : 'Reproducir'}
              disabled={fuente === null}
              onPress={() => {
                if (fuente === null) return;
                if (activa) audio.alternarReproduccion();
                else void audio.reproducir(guia, fuente);
              }}
              style={[styles.botonPrincipal, { opacity: fuente !== null ? 1 : 0.45 }]}
            >
              <Ionicons name={activa && audio.estado.playing ? 'pause' : 'play'} size={26} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Adelantar 10 segundos"
              disabled={!activa}
              onPress={() => audio.saltar(10)}
              style={styles.botonSalto}
            >
              <Ionicons name="play-forward" size={20} color={activa ? colores.textoPrincipal : colores.textoSecundario} />
              <Text style={[styles.segundos, { color: colores.textoSecundario }]}>10</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progresoZona}>
            <TouchableOpacity
              accessibilityRole="adjustable"
              accessibilityLabel="Posición de reproducción"
              accessibilityValue={{ min: 0, max: Math.round(activa ? audio.estado.duration : 0), now: Math.round(activa ? audio.estado.currentTime : 0) }}
              onLayout={(evento) => setAnchoBarra(evento.nativeEvent.layout.width)}
              onPress={(evento) => cambiarPosicion(evento.nativeEvent.locationX)}
              style={[styles.pista, { backgroundColor: colores.tarjetaBorde }]}
            >
              <View style={[styles.avance, { width: `${Math.max(0, Math.min(1, avance)) * 100}%` }]} />
            </TouchableOpacity>
            <View style={styles.tiempos}>
              <Text style={[styles.tiempo, { color: colores.textoSecundario }]}>{formatoTiempo(activa ? audio.estado.currentTime : 0)}</Text>
              <Text style={[styles.tiempo, { color: colores.textoSecundario }]}>{formatoTiempo(activa ? audio.estado.duration : guia.duracion ?? 0)}</Text>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Velocidad ${audio.velocidad} por, cambiar velocidad`}
            onPress={() => {
              const indice = velocidades.indexOf(audio.velocidad);
              audio.cambiarVelocidad(velocidades[(indice + 1) % velocidades.length]);
            }}
            style={[styles.botonVelocidad, { borderColor: colores.tarjetaBorde }]}
          >
            <Text style={[styles.textoVelocidad, { color: colores.textoPrincipal }]}>{audio.velocidad}×</Text>
          </TouchableOpacity>

          {incluida && !descargada && (
            <Text style={[styles.origen, { color: colores.textoSecundario }]}>Versión de demostración incluida en la app.</Text>
          )}
          {!descargada && guia.audioUrl && (
            <TouchableOpacity disabled={descargando} onPress={() => void manejarDescarga()} style={styles.botonDescarga}>
              {descargando ? <ActivityIndicator size="small" color="#0284c7" /> : <Ionicons name="download-outline" size={18} color="#0284c7" />}
              <Text style={[styles.textoDescarga, { color: '#0284c7' }]}>
                {descargando ? 'Descargando audio' : 'Descargar para escuchar sin conexión'}
              </Text>
            </TouchableOpacity>
          )}
          {catalogo.error && <Text accessibilityRole="alert" style={styles.error}>{catalogo.error}</Text>}
          {audio.errorAudio && <Text accessibilityRole="alert" style={styles.error}>{audio.errorAudio}</Text>}
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  encabezado: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  volver: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  textoEncabezado: { fontSize: 16, fontWeight: '700' },
  contenido: { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 26 },
  portada: { width: 220, aspectRatio: 1, maxWidth: '75%', borderRadius: 8, backgroundColor: '#e7f4fa', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  titulo: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  descripcion: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 8 },
  controlesReproductor: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 34, marginTop: 28 },
  botonSalto: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  segundos: { position: 'absolute', fontSize: 8, fontWeight: '800', top: 23 },
  botonPrincipal: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center', paddingLeft: 3 },
  progresoZona: { width: '100%', marginTop: 22 },
  pista: { height: 10, borderRadius: 5, overflow: 'hidden', justifyContent: 'center' },
  avance: { height: 4, borderRadius: 2, backgroundColor: '#0284c7' },
  tiempos: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  tiempo: { fontSize: 11, fontVariant: ['tabular-nums'] },
  botonVelocidad: { minWidth: 52, height: 36, borderWidth: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  textoVelocidad: { fontSize: 12, fontWeight: '700' },
  botonDescarga: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 22, paddingHorizontal: 8 },
  textoDescarga: { fontSize: 12, fontWeight: '700' },
  origen: { fontSize: 12, marginTop: 18, textAlign: 'center' },
  error: { color: '#b91c1c', fontSize: 12, marginTop: 10, textAlign: 'center' },
});