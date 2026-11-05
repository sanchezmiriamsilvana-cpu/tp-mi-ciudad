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
import { BASE_URL } from '../../servicios/api';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const IMAGEN_DEFAULT = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSYwl49SBaAWa5x5iCzdte_NsHghIRZiSWyphHOVNp6aw&s';

// 🟢 Helper que limpia la URL reemplazando localhost por BASE_URL
const normalizarUrlImagen = (rawUrl: any): string => {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') return IMAGEN_DEFAULT;
  let url = rawUrl.trim();
  if (url.includes('localhost:3000')) {
    const urlLimpia = BASE_URL.replace(/\/$/, '');
    return url.replace('http://localhost:3000', urlLimpia);
  }
  return url;
};

// 🟢 Helper que garantiza un arreglo (string[]) real de fotos válidas
const obtenerListaImagenes = (imagenes: any): string[] => {
  if (!imagenes) return [IMAGEN_DEFAULT];

  if (Array.isArray(imagenes)) {
    if (imagenes.length === 0) return [IMAGEN_DEFAULT];
    return imagenes.map((img) => normalizarUrlImagen(img));
  }

  if (typeof imagenes === 'string') {
    return [normalizarUrlImagen(imagenes)];
  }

  if (typeof imagenes === 'object' && imagenes !== null) {
    const uri = imagenes.url || imagenes.uri || '';
    return [normalizarUrlImagen(uri)];
  }

  return [IMAGEN_DEFAULT];
};

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
        const res = await obtenerLugarPorId(id);
        setDetalleLugar(res.datos);

        const favs = await obtenerFavoritosIds();
        setEsFavorito(Array.isArray(favs) && favs.includes(id));
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
    setEsFavorito(Array.isArray(favsActualizados) && favsActualizados.includes(id));
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
        <SafeAreaView style={[styles.containerCargando, { backgroundColor: colores.fondo }]}>
          <ActivityIndicator size="large" color="#007AFF" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // 🟢 Normalización correcta que devuelve un arreglo real de imágenes
  const listaImagenes = obtenerListaImagenes(detalleLugar.imagenes);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: colores.fondo }]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          
          {/* Botón de volver atrás flotante */}
          <TouchableOpacity style={styles.btnVolver} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>

          {/* Galería de Imágenes */}
          {listaImagenes.length > 1 ? (
            <FlatList
              horizontal
              data={listaImagenes}
              keyExtractor={(_, index) => index.toString()}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.detailImageGallery} resizeMode="cover" />
              )}
            />
          ) : (
            <Image source={{ uri: listaImagenes [0]}} style={styles.detailImage} resizeMode="cover" />
          )}

          <View style={styles.detailBody}>
            {/* Título y Botón Corazón */}
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

            {/* Botones de Acción Rápida */}
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
  
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: 13 },

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