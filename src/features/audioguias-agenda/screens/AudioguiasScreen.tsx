import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '../../../contexto/TemaContext';
import AudioguiaCard from '../components/AudioguiaCard';
import { useAudioguias } from '../hooks/useAudioguias';
import { useAudioguia } from '../hooks/useAudioguia';

export default function AudioguiasScreen() {
  const { colores } = useTema();
  const { guias, guiasIncluidas, audiosLocales, progresos, ocupado, error, descargar, borrarDescarga, obtenerFuente } = useAudioguias();
  const audio = useAudioguia();

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
            <Text style={[styles.subtitulo, { color: colores.textoSecundario }]}>Recorridos autoguiados de Colón</Text>
          </View>
        </View>

        <FlatList
          data={guias}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          ListHeaderComponent={error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          renderItem={({ item }) => (
            <AudioguiaCard
              guia={item}
              descargada={Boolean(audiosLocales[item.id])}
              incluida={guiasIncluidas.includes(item.id)}
              progreso={progresos[item.id]}
              ocupada={ocupado === item.id}
              alDescargar={() => void descargar(item)}
              alEliminar={() => void borrarDescarga(item.id)}
              alReproducir={() => {
                void (async () => {
                  const fuente = await obtenerFuente(item);
                  if (fuente !== null) await audio.reproducir(item, fuente);
                })();
                router.push({ pathname: '/audioguia-player', params: { id: item.id } });
              }}
            />
          )}
          ListFooterComponent={
            <View style={styles.pieLista}>
              <Text style={[styles.nota, { color: colores.textoSecundario }]}>Las audioguías incluidas se reproducen sin conexión. Las que tienen URL oficial permiten descargarlas.</Text>
              {audio.errorAudio && <Text style={styles.error}>{audio.errorAudio}</Text>}
            </View>
          }
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  encabezado: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14, gap: 10 },
  volver: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  titulos: { flex: 1 },
  titulo: { fontSize: 24, fontWeight: '800' },
  subtitulo: { fontSize: 13, marginTop: 3 },
  lista: { paddingHorizontal: 16, paddingBottom: 104 },
  pieLista: { alignItems: 'center', paddingHorizontal: 18, paddingVertical: 20 },
  nota: { textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 4 },
  error: { color: '#b91c1c', fontSize: 13, marginBottom: 10 },
});