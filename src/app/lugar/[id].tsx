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
  FlatList,
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

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function DetalleLugarPantalla() {
  const { colores } = useTema();

  // Leemos el ID del lugar desde la ruta dinámica (/lugar/[id])
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
      // 1. Obtener datos del lugar y favoritos (súper rápido)
      const res = await obtenerLugarPorId(id);
      setDetalleLugar(res.datos);

      const favs = await obtenerFavoritosIds();
      setEsFavorito(favs.includes(id));
    } catch (error) {
      console.error('Error al obtener detalle:', error);
    } finally {
      setCargando(false); 
    }

    // 2. Obtener ubicación en segundo plano (sin bloquear la vista)
    try {
      const pos = await obtenerUbicacionActual();
      if (pos) setMiUbicacion(pos);
    } catch (err) {
      console.warn('GPS tardó o no estuvo disponible:', err);
    }
  }

  cargarDetalle();
}, [id]);

  // Manejo de favorito con validación de autenticación
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

  // Acción para llamar por teléfono
  const handleLlamar = (telefono: string) => {
    Linking.openURL(`tel:${telefono}`);
  };

  // Acción para abrir sitio web
  const handleAbrirWeb = (url: string) => {
    const webUrl = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(webUrl);
  };

  if (cargando || !detalleLugar) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.containerCargando, { backgroundColor: colores.fondo }]}>
          <ActivityIndicator size="large" color="#007AFF" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Normalización de imágenes (Maneja un string único o un arreglo de fotos)
  const listaImagenes: string[] = Array.isArray(detalleLugar.imagenes)
    ? detalleLugar.imagenes[0]
    : [detalleLugar.imagenes as any];

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: colores.fondo }]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          
          {/* Botón de volver atrás flotante */}
          <TouchableOpacity style={styles.btnVolver} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>

          {/* Galería de Imágenes (Horizontal si hay múltiples) */}
          {listaImagenes.length > 1 ? (
            <FlatList
              horizontal
              data={listaImagenes}
              keyExtractor={(_, index) => index.toString()}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.detailImageGallery} />
              )}
            />
          ) : (
            <Image source={{ uri: listaImagenes[0] }} style={styles.detailImage} />
          )}

          <View style={styles.detailBody}>
            {/* Título y Botón Corazón (SQLite) */}
            <View style={styles.titleRow}>
              <Text style={[styles.detailTitle, { color: colores.textoPrincipal }]}>
                {detalleLugar.nombre}
              </Text>
              <TouchableOpacity onPress={handleToggleFavorito} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons
                  name={esFavorito ? 'heart' : 'heart-outline'}
                  size={30}
                  color={esFavorito ? '#E74C3C' : colores.textoSecundario}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.detailAddress, { color: colores.textoSecundario }]}>
              📍 {detalleLugar.direccion}
            </Text>

            {/* Botones de Acción Rápida (Ir en Mapa, Llamar, Web) */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#0284c7' }]}
                onPress={() =>
                  abrirMapaNativo(
                    detalleLugar.coordenadas.latitud,
                    detalleLugar.coordenadas.longitud,
                    detalleLugar.nombre
                  )
                }
              >
                <Ionicons name="navigate-outline" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>Cómo llegar</Text>
              </TouchableOpacity>

              {detalleLugar.telefono && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#16a34a' }]}
                  onPress={() => handleLlamar(detalleLugar.telefono!)}
                >
                  <Ionicons name="call-outline" size={18} color="#FFF" />
                  <Text style={styles.actionBtnText}>Llamar</Text>
                </TouchableOpacity>
              )}

              {detalleLugar.sitioWeb && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#4f46e5' }]}
                  onPress={() => handleAbrirWeb(detalleLugar.sitioWeb!)}
                >
                  <Ionicons name="globe-outline" size={18} color="#FFF" />
                  <Text style={styles.actionBtnText}>Web</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Componente de Brújula / Dirección con Magnetómetro */}
            {miUbicacion && detalleLugar.coordenadas && (
              <View style={[styles.cardSeccion, { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde }]}>
                <Text style={[styles.sectionTitle, { color: colores.textoPrincipal }]}>🧭 Orientación en vivo</Text>
                <BrujulaFlecha
                  origen={miUbicacion}
                  destino={{
                    latitud: detalleLugar.coordenadas.latitud,
                    longitud: detalleLugar.coordenadas.longitud,
                  }}
                  nombreLugar={detalleLugar.nombre}
                />
              </View>
            )}

            {/* Descripción */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colores.textoPrincipal }]}>Descripción</Text>
              <Text style={[styles.text, { color: colores.textoSecundario }]}>
                {detalleLugar.descripcion}
              </Text>
            </View>

            {/* Horarios de Atención */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colores.textoPrincipal }]}>Horarios de Atención</Text>
              {detalleLugar.horarios && detalleLugar.horarios.length > 0 ? (
                detalleLugar.horarios.map((h, i) => (
                  <Text key={i} style={[styles.text, { color: colores.textoSecundario }]}>
                    • {DIAS_SEMANA[h.dia]}: {h.abre} a {h.cierra} hs
                  </Text>
                ))
              ) : (
                <Text style={[styles.text, { color: colores.textoSecundario }]}>
                  Abierto todo el día / Sin horario específico
                </Text>
              )}
            </View>

            {/* Información General y Accesibilidad */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colores.textoPrincipal }]}>Información General</Text>
              
              <Text style={[styles.text, { color: colores.textoSecundario }]}>
                💵 Entrada:{' '}
                {detalleLugar.precioEntrada === 0
                  ? 'Gratuita'
                  : detalleLugar.precioEntrada
                  ? `$${detalleLugar.precioEntrada}`
                  : 'No especificada'}
              </Text>

              <Text style={[styles.text, { color: colores.textoSecundario }]}>
                ♿ Accesibilidad:{' '}
                {detalleLugar.accesible
                  ? 'Apto para personas con movilidad reducida'
                  : 'No adaptado'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  containerCargando: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnVolver: {
    position: 'absolute',
    top: 16,
    left: 12,
    zIndex: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 20,
  },
  detailImage: { width: '100%', height: 240, borderRadius: 12, marginTop: 12, marginBottom: 12 },
  detailImageGallery: { width: 280, height: 200, borderRadius: 12, marginTop: 12, marginRight: 10 },
  detailBody: { paddingBottom: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  detailTitle: { fontSize: 24, fontWeight: 'bold', flex: 1, marginRight: 8 },
  detailAddress: { fontSize: 14, marginBottom: 16 },
  
  /* Botones de Acción */
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: 13 },

  /* Card Brújula */
  cardSeccion: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },

  section: { marginTop: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '600', marginBottom: 6 },
  text: { fontSize: 15, lineHeight: 22, marginBottom: 4 },
});