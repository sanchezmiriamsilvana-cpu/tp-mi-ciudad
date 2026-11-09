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
import { mensajeDeErrorApi } from '../../servicios/errores';
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
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState<number>(0);
  const [esFavorito, setEsFavorito] = useState<boolean>(false);
  const [miUbicacion, setMiUbicacion] = useState<Coordenadas | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargarDetalle() {
      if (!id) {
        setCargando(false);
        setError('No se indicó el lugar a mostrar.');
        return;
      }

      setCargando(true);
      setError(null);

      try {
        const res = await obtenerLugarPorId(id);
        if (!activo) return;

        if (res.exito && res.datos) {
          setDetalleLugar(res.datos);
          const favs = await obtenerFavoritosIds();
          if (activo) setEsFavorito(Array.isArray(favs) && favs.includes(id));
        } else {
          setDetalleLugar(null);
          setError(res.mensaje ?? 'No se pudo cargar el lugar.');
        }
      } catch (fallo) {
        if (!activo) return;
        const mensaje = mensajeDeErrorApi(fallo, 'el lugar');
        console.warn(`[API] ${mensaje}`);
        setDetalleLugar(null);
        setError(mensaje);
      } finally {
        if (activo) setCargando(false);
      }

      try {
        const pos = await obtenerUbicacionActual();
        if (activo && pos) setMiUbicacion(pos);
      } catch (err) {
        console.warn('GPS tardó o no estuvo disponible:', err);
      }
    }

    cargarDetalle();
    return () => {
      activo = false;
    };
  }, [id, intento]);

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

  if (cargando) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.containerCargando, { backgroundColor: colores.fondo }]}>
          <ActivityIndicator size="large" color="#007AFF" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (error || !detalleLugar) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.estadoContainer, { backgroundColor: colores.fondo }]}>
          <Ionicons name="cloud-offline-outline" size={44} color={colores.textoSecundario} />
          <Text style={[styles.estadoTitulo, { color: colores.textoPrincipal }]}>
            No se pudo cargar el lugar
          </Text>
          <Text style={[styles.estadoTexto, { color: colores.textoSecundario }]}>
            {error ?? 'El lugar no está disponible.'}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.botonReintentar}
            onPress={() => setIntento((valor) => valor + 1)}
          >
            <Ionicons name="refresh" size={17} color="#FFF" />
            <Text style={styles.textoReintentar}>Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.botonVolverTexto}>
            <Text style={styles.volverTexto}>Volver</Text>
          </TouchableOpacity>
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
  estadoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 10 },
  estadoTitulo: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  estadoTexto: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  botonReintentar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#0284c7',
  },
  textoReintentar: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  botonVolverTexto: { marginTop: 8, padding: 8 },
  volverTexto: { color: '#0284c7', fontSize: 14, fontWeight: '600' },
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