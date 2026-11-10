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
import { obtenerToken, obtenerUsuario } from '../../servicios/autenticacion';
import {
  obtenerUbicacionActual,
  abrirMapaNativo,
  Coordenadas,
} from '../../servicios/ubicacion';
import { BASE_URL } from '../../servicios/api';

import { useTema } from '../../contexto/TemaContext';
import BrujulaFlecha from '../componentes/BrujulaFlecha';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

//  Imagen de respaldo fija y pública
const IMAGEN_DEFAULT = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSYwl49SBaAWa5x5iCzdte_NsHghIRZiSWyphHOVNp6aw&s';

//  Helper para limpiar URLs de localhost y apuntar a tu IP (BASE_URL)
const normalizarUrl = (raw: any): string => {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return IMAGEN_DEFAULT;
  let url = raw.trim();
  if (url.includes('localhost:3000')) {
    const urlLimpia = BASE_URL.replace(/\/$/, '');
    return url.replace('http://localhost:3000', urlLimpia);
  }
  return url;
};

//  Helper que garantiza un arreglo (string[]) válido
const obtenerListaImagenes = (imagenes: any): string[] => {
  if (!imagenes) return [IMAGEN_DEFAULT];

  if (typeof imagenes === 'string' && imagenes.trim().startsWith('[')) {
    try {
      imagenes = JSON.parse(imagenes);
    } catch {}
  }

  if (Array.isArray(imagenes)) {
    const filtradas = imagenes
      .map(normalizarUrl)
      .filter((u) => u && u.length > 0);
    return filtradas.length > 0 ? filtradas : [IMAGEN_DEFAULT];
  }

  if (typeof imagenes === 'string') {
    return [normalizarUrl(imagenes)];
  }

  return [IMAGEN_DEFAULT];
};

// 🎧 Helper que detecta si el atractivo cuenta con audioguía
const tieneAudioguia = (lugar: any): boolean => {
  if (!lugar) return false;
  const audio = lugar.audioguia || lugar.audioUrl || lugar.audio || lugar.audiolibro;
  if (typeof audio === 'string') return audio.trim().length > 0;
  return Boolean(audio);
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
        // 1. Obtener datos del lugar
        const res = await obtenerLugarPorId(id);
        setDetalleLugar(res.datos);

        // 2. Cargar favoritos específicos del usuario activo en SQLite
        const usr = await obtenerUsuario();
        const usrId = usr?.email || 'usuario_invitado';

        const favs = await obtenerFavoritosIds(usrId);
        setEsFavorito(favs.includes(id));
      } catch (error) {
        console.error('Error al obtener detalle:', error);
      } finally {
        setCargando(false);
      }

      // 3. Obtener ubicación en segundo plano
      try {
        const pos = await obtenerUbicacionActual();
        if (pos) setMiUbicacion(pos);
      } catch (err) {
        console.warn('GPS tardó o no estuvo disponible:', err);
      }
    }

    cargarDetalle();
  }, [id]);

  // Manejo de favorito asociándolo a la cuenta del usuario activo
  const handleToggleFavorito = async () => {
    if (!id) return;
    const token = await obtenerToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const usr = await obtenerUsuario();
    const usrId = usr?.email || 'usuario_invitado';

    await alternarFavorito(id, usrId);
    const favsActualizados = await obtenerFavoritosIds(usrId);
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

  //  Normalización de imágenes garantizada
  const listaImagenes: string[] = obtenerListaImagenes(detalleLugar.imagenes);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: colores.fondo }]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          
          {/* Botón de volver atrás flotante */}
          <TouchableOpacity style={styles.btnVolver} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>

          {/* Galería de Imágenes o Imagen única */}
          {listaImagenes.length > 1 ? (
            <FlatList
              horizontal
              data={listaImagenes}
              keyExtractor={(_, index) => index.toString()}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={styles.detailImageGallery}
                  resizeMode="cover"
                />
              )}
            />
          ) : (
            <Image
              source={{ uri: listaImagenes[0] }}
              style={styles.detailImage}
              resizeMode="cover"
            />
          )}

          <View style={styles.detailBody}>
            {/* Título y Botón Corazón (filtrado por usuario en SQLite) */}
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
              {/* 🎧 Botón Escuchar Audioguía (solo si el lugar la tiene) */}
              {tieneAudioguia(detalleLugar) && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#8b5cf6' }]}
                  onPress={() => router.push('/audioguias' as any)}
                >
                  <Ionicons name="headset" size={18} color="#FFF" />
                  <Text style={styles.actionBtnText}>Audioguía</Text>
                </TouchableOpacity>
              )}

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
  detailImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  detailImageGallery: {
    width: 280,
    height: 250,
    borderRadius: 12,
    marginTop: 12,
    marginRight: 10,
    marginBottom: 16,
  },
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