import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Lugar } from '../../tipos/lugares';
import { obtenerLugarPorId } from '../../servicios/lugares';
import { obtenerFavoritosIds, alternarFavorito } from '../../servicios/favoritos';
import { obtenerToken } from '../../servicios/autenticacion';
import {
  obtenerUbicacionActual,
  abrirMapaNativo,
  Coordenadas,
} from '../../servicios/ubicacion';

import { useTema } from '../../contexto/TemaContext';
import BrujulaFlecha from '../componentes/BrujulaFlecha';
import { AUDIOGUIAS } from '../../servicios/audioguias';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function DetalleLugarPantalla() {
  const { colores } = useTema();
  const col = colores as any; // 🟢 Evita errores en rojo con las propiedades de colores

  const { id } = useLocalSearchParams<{ id: string }>();

  const [detalleLugar, setDetalleLugar] = useState<Lugar | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [esFavorito, setEsFavorito] = useState<boolean>(false);
  const [miUbicacion, setMiUbicacion] = useState<Coordenadas | null>(null);

  useEffect(() => {
    async function cargarDetalle() {
      if (!id) return;
      setCargando(true);
      try {
        // 🟢 ": any" quita el subrayado rojo de TypeScript en res.datos
        const res: any = await obtenerLugarPorId(id);
        if (res?.datos) {
          setDetalleLugar(res.datos);
        }

        const favs = await obtenerFavoritosIds();
        setEsFavorito(favs.includes(id));
      } catch (error) {
        console.error('Error al obtener detalle:', error);
      } finally {
        setCargando(false);
      }

      try {
        const pos = await obtenerUbicacionActual();
        if (pos) setMiUbicacion(pos);
      } catch (err) {
        console.warn('GPS tardó o no estuvo disponible:', err);
      }
    }

    cargarDetalle();
  }, [id]);

  const handleToggleFavorito = async () => {
    if (!id) return;
    const token = await obtenerToken();
    if (!token) {
      router.push('/login');
      return;
    }

    await alternarFavorito(id);
    const favsActualizados = await obtenerFavoritosIds();
    setEsFavorito(favsActualizados.includes(id));
  };

  const handleLlamar = (telefono: string) => {
    Linking.openURL(`tel:${telefono}`);
  };

  const handleAbrirWeb = (url: string) => {
    const webUrl = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(webUrl);
  };

  if (cargando || !detalleLugar) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.containerCargando, { backgroundColor: col?.fondo || '#F8F9FA' }]}>
          <ActivityIndicator size="large" color="#007AFF" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // 🖼️ Extrae la primera imagen del arreglo usando
  const imagenes = detalleLugar.imagenes as any;
  const uriImagenPrincipal =
    Array.isArray(imagenes) && imagenes.length > 0
      ? imagenes[0] 
      : typeof imagenes === 'string'
      ? imagenes
      : '[suspicious link removed]';

  const colorTexto = col?.textoPrincipal || col?.texto || '#1E293B';
  const colorSubtexto = col?.textoSecundario || col?.subtexto || '#64748B';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: col?.fondo || '#FFFFFF' }]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
          {/* Imagen Principal */}
          <Image
            source={{ uri: uriImagenPrincipal } as any}
            style={styles.detailImage}
          />

          <View style={styles.detailBody}>
            {/* Título y Botón Corazón */}
            <View style={styles.titleRow}>
              <Text style={[styles.detailTitle, { color: colorTexto }]}>
                {detalleLugar.nombre}
              </Text>
              <TouchableOpacity onPress={handleToggleFavorito} hitSlop={10}>
                <Ionicons
                  name={esFavorito ? 'heart' : 'heart-outline'}
                  size={30}
                  color={esFavorito ? '#E74C3C' : '#64748B'}
                />
              </TouchableOpacity>
            </View>

            {/* Dirección */}
            {detalleLugar.direccion && (
              <Text style={[styles.detailAddress, { color: colorSubtexto }]}>
                📍 {detalleLugar.direccion}
              </Text>
            )}

            {/* Descripción */}
            {detalleLugar.descripcion && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colorTexto }]}>
                  Descripción
                </Text>
                <Text style={[styles.text, { color: colorSubtexto }]}>
                  {detalleLugar.descripcion}
                </Text>
              </View>
            )}

            {/* Horarios */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colorTexto }]}>
                Horarios de Atención
              </Text>
              {detalleLugar.horarios && detalleLugar.horarios.length > 0 ? (
                detalleLugar.horarios.map((h, i) => (
                  <Text key={i} style={[styles.text, { color: colorSubtexto }]}>
                    • {DIAS_SEMANA[h.dia]}: {h.abre} a {h.cierra} hs
                  </Text>
                ))
              ) : (
                <Text style={[styles.text, { color: colorSubtexto }]}>
                  Abierto todo el día / Sin horario específico
                </Text>
              )}
            </View>

            {/* Información adicional */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colorTexto }]}>
                Información del Atractivo
              </Text>
              <Text style={[styles.text, { color: colorSubtexto }]}>
                Entrada:{' '}
                {detalleLugar.precioEntrada === 0
                  ? 'Gratuita'
                  : detalleLugar.precioEntrada
                  ? `$${detalleLugar.precioEntrada}`
                  : 'No especificada'}
              </Text>
              <Text style={[styles.text, { color: colorSubtexto }]}>
                ♿ Accesibilidad:{' '}
                {detalleLugar.accesible
                  ? 'Apto para personas con movilidad reducida'
                  : 'No adaptado'}
              </Text>
            </View>

            {/* Brújula si está disponible la ubicación */}
            {miUbicacion && detalleLugar.coordenadas && (
              <BrujulaFlecha
                origen={miUbicacion}
                destino={{
                  latitud: detalleLugar.coordenadas.latitud,
                  longitud: detalleLugar.coordenadas.longitud,
                }}
              />
            )}

            {/* 🎧 BOTÓN AZUL DE AUDIOGUÍA */}
            {(detalleLugar.audioguia !== null || (AUDIOGUIAS && (AUDIOGUIAS as any)[detalleLugar.id])) && (
              <TouchableOpacity
                style={styles.btnAudioguia}
                onPress={() => router.push(`/audioguias-modulo?id=${detalleLugar.id}` as any)}
              >
                <Ionicons name="headset-outline" size={24} color="#FFF" />
                <Text style={styles.btnAudioguiaTexto}>Escuchar Audioguía</Text>
              </TouchableOpacity>
            )}

            {/* Botones de Contacto */}
            {detalleLugar.telefono && (
              <TouchableOpacity
                style={styles.btnContacto}
                onPress={() => handleLlamar(detalleLugar.telefono!)}
              >
                <Ionicons name="call-outline" size={20} color="#007AFF" />
                <Text style={styles.btnContactoTexto}>{detalleLugar.telefono}</Text>
              </TouchableOpacity>
            )}

            {detalleLugar.sitioWeb && (
              <TouchableOpacity
                style={styles.btnContacto}
                onPress={() => handleAbrirWeb(detalleLugar.sitioWeb!)}
              >
                <Ionicons name="globe-outline" size={20} color="#007AFF" />
                <Text style={styles.btnContactoTexto}>{detalleLugar.sitioWeb}</Text>
              </TouchableOpacity>
            )}

            {/* Botón Abrir Mapa */}
            {detalleLugar.coordenadas && (
              <TouchableOpacity
                style={styles.btnMapa}
                onPress={() =>
                  abrirMapaNativo(
                    detalleLugar.coordenadas.latitud,
                    detalleLugar.coordenadas.longitud,
                    detalleLugar.nombre
                  )
                }
              >
                <Ionicons name="map-outline" size={20} color="#FFF" />
                <Text style={styles.btnMapaTexto}>Cómo llegar (Abrir Mapa)</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  containerCargando: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  detailImage: { width: '100%', height: 220, borderRadius: 12, marginTop: 12, marginBottom: 12 },
  detailBody: { paddingBottom: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  detailTitle: { fontSize: 24, fontWeight: 'bold', flex: 1, marginRight: 8 },
  detailAddress: { fontSize: 14, marginBottom: 12 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '600', marginBottom: 6 },
  text: { fontSize: 15, lineHeight: 22, marginBottom: 4 },
  btnAudioguia: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  btnAudioguiaTexto: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  btnContacto: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  btnContactoTexto: { color: '#007AFF', fontSize: 15, marginLeft: 8, fontWeight: '500' },
  btnMapa: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  btnMapaTexto: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});