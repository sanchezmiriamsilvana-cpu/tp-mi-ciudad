import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '../../../contexto/TemaContext';
import AudioguiaCard from '../components/AudioguiaCard';
import { useAudioguias } from '../hooks/useAudioguias';
import { useAudioguia } from '../hooks/useAudioguia';

function formatoFecha(iso: string | null): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const dos = (valor: number) => String(valor).padStart(2, '0');
  return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)} ${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

export default function AudioguiasScreen() {
  const { colores } = useTema();
  const {
    guias,
    cargando,
    refrescando,
    errorCatalogo,
    desdeCache,
    actualizadoEn,
    recargar,
    audiosLocales,
    progresos,
    ocupado,
    error,
    descargar,
    borrarDescarga,
    obtenerFuente,
  } = useAudioguias();
  const audio = useAudioguia();

  const mostrarCargando = cargando && guias.length === 0;
  const avisoCatalogo = desdeCache
    ? `Catálogo guardado${actualizadoEn ? ` · ${formatoFecha(actualizadoEn)}` : ''}`
    : null;

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
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Actualizar catálogo"
            accessibilityState={{ busy: refrescando }}
            disabled={refrescando}
            onPress={() => void recargar()}
            style={styles.volver}
          >
            {refrescando ? (
              <ActivityIndicator size="small" color={colores.textoPrincipal} />
            ) : (
              <Ionicons name="refresh" size={20} color={colores.textoPrincipal} />
            )}
          </TouchableOpacity>
        </View>

        {avisoCatalogo && (
          <View style={styles.aviso}>
            <Ionicons name="cloud-offline-outline" size={16} color="#92400e" />
            <Text style={styles.textoAviso}>{avisoCatalogo}</Text>
          </View>
        )}

        {errorCatalogo && (
          <View style={styles.bannerError}>
            <Text accessibilityRole="alert" style={styles.textoErrorBanner}>
              {errorCatalogo}
            </Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reintentar carga" onPress={() => void recargar()}>
              <Text style={styles.reintentar}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {mostrarCargando ? (
          <View style={styles.centrado}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={[styles.cargandoTexto, { color: colores.textoSecundario }]}>Cargando audioguías…</Text>
          </View>
        ) : (
          <FlatList
            data={guias}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.lista, guias.length === 0 && styles.listaVacia]}
            refreshControl={
              <RefreshControl
                refreshing={refrescando}
                onRefresh={() => void recargar()}
                tintColor="#0284c7"
                colors={['#0284c7']}
              />
            }
            ListEmptyComponent={
              <View style={styles.centrado}>
                <Ionicons name="headset-outline" size={42} color={colores.textoSecundario} />
                <Text style={[styles.vacioTitulo, { color: colores.textoPrincipal }]}>No hay audioguías disponibles</Text>
                <Text style={[styles.vacioTexto, { color: colores.textoSecundario }]}>
                  Revisá tu conexión y volvé a intentarlo.
                </Text>
                <TouchableOpacity style={styles.botonReintentar} onPress={() => void recargar()}>
                  <Text style={styles.textoBotonReintentar}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => (
              <AudioguiaCard
                guia={item}
                descargada={Boolean(audiosLocales[item.id])}
                progreso={progresos[item.id]}
                ocupada={ocupado === item.id}
                alDescargar={() => void descargar(item)}
                alEliminar={() => void borrarDescarga(item.id)}
                alReproducir={() => {
                  void (async () => {
                    const fuente = await obtenerFuente(item);
                    if (fuente === null) return;
                    await audio.reproducir(item, fuente);
                    router.push({ pathname: '/audioguia-player', params: { id: item.id } });
                  })();
                }}
              />
            )}
            ListFooterComponent={
              guias.length > 0 ? (
                <View style={styles.pieLista}>
                  <Text style={[styles.nota, { color: colores.textoSecundario }]}>
                    El catálogo se actualiza desde la API. Las audioguías con audio oficial se pueden descargar para
                    escucharlas sin conexión.
                  </Text>
                  {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
                  {audio.errorAudio && <Text accessibilityRole="alert" style={styles.error}>{audio.errorAudio}</Text>}
                </View>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 10,
  },
  volver: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  titulos: { flex: 1 },
  titulo: { fontSize: 24, fontWeight: '800' },
  subtitulo: { fontSize: 13, marginTop: 3 },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
  },
  textoAviso: { flex: 1, color: '#92400e', fontSize: 12, fontWeight: '600' },
  bannerError: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
    gap: 4,
  },
  textoErrorBanner: { color: '#991b1b', fontSize: 12, lineHeight: 17 },
  reintentar: { color: '#b91c1c', fontSize: 12, fontWeight: '800' },
  lista: { paddingHorizontal: 16, paddingBottom: 104 },
  listaVacia: { flexGrow: 1 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  cargandoTexto: { marginTop: 12, fontSize: 13 },
  vacioTitulo: { fontSize: 16, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  vacioTexto: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  botonReintentar: {
    marginTop: 18,
    backgroundColor: '#0284c7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  textoBotonReintentar: { color: '#fff', fontWeight: '700', fontSize: 13 },
  pieLista: { alignItems: 'center', paddingHorizontal: 18, paddingVertical: 20 },
  nota: { textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 4 },
  error: { color: '#b91c1c', fontSize: 13, marginTop: 8, textAlign: 'center' },
});
