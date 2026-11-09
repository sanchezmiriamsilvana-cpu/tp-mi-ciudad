import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Lugar, Categoria } from '../../tipos/lugares';
import { obtenerLugares, obtenerCategorias } from '../../servicios/lugares';
import { mensajeDeErrorApi } from '../../servicios/errores';
import { obtenerToken } from '../../servicios/autenticacion';
import {
  inicializarBaseDatosFavoritos,
  obtenerFavoritosIds,
  alternarFavorito,
} from '../../servicios/favoritos';
import {
  obtenerUbicacionActual,
  calcularDistanciaKm,
  formatearDistancia,
  abrirMapaNativo,
  Coordenadas,
  COLON_CENTRO,
} from '../../servicios/ubicacion';

import { useTema } from '../../contexto/TemaContext';
import { BASE_URL } from '../../servicios/api';

const IMAGEN_DEFAULT = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSYwl49SBaAWa5x5iCzdte_NsHghIRZiSWyphHOVNp6aw&s';

// 🟢 Helper seguro para obtener la URL de imagen y reemplazar localhost por BASE_URL
const obtenerImagenSegura = (imagenes: any): string => {
  if (!imagenes) return IMAGEN_DEFAULT;

  // Extraemos la primera posición si viene como arreglo
  let url = Array.isArray(imagenes) && imagenes.length > 0 ? imagenes[0] : imagenes;

  if (typeof url === 'object' && url !== null) {
    url = url.url || url.uri || '';
  }

  if (typeof url !== 'string' || url.trim() === '') return IMAGEN_DEFAULT;

  url = url.trim();

  // Si viene localhost:3000 de la API, se adapta a la BASE_URL activa de DevTunnels
  if (url.includes('localhost:3000')) {
    const urlLimpia = BASE_URL.replace(/\/$/, '');
    return url.replace('http://localhost:3000', urlLimpia);
  }

  return url;
};

// 🟢 Helper que verifica si el lugar cuenta con audioguía disponible
const tieneAudioguia = (lugar: any): boolean => {
  if (!lugar) return false;
  const audio = lugar.audioUrl || lugar.audio || lugar.audioguia || lugar.audiolibro;
  if (typeof audio === 'string') return audio.trim().length > 0;
  return Boolean(audio);
};

export default function PantallaPrincipal() {
  const { colores } = useTema();

  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>(['cat-todas']);
  const [busquedaLugar, setBusquedaLugar] = useState<string>('');
  
  const [modoVista, setModoVista] = useState<'mapa' | 'lista'>('mapa');
  const [cargando, setCargando] = useState<boolean>(true);
  const [lugarSeleccionado, setLugarSeleccionado] = useState<any | null>(null);

  const [miUbicacion, setMiUbicacion] = useState<Coordenadas | null>(null);
  const [favoritosIds, setFavoritosIds] = useState<string[]>([]);
  const [errorLugares, setErrorLugares] = useState<string | null>(null);

  const cargarCategorias = useCallback(async () => {
    try {
      const resCategorias = await obtenerCategorias();
      setCategorias(Array.isArray(resCategorias.datos) ? resCategorias.datos : []);

      if (!resCategorias.exito) {
        setErrorLugares(
          (actual) => actual ?? resCategorias.mensaje ?? 'No se pudieron cargar las categorías.'
        );
      }
    } catch (error) {
      const mensaje = mensajeDeErrorApi(error, 'las categorías');
      console.warn(`[API] ${mensaje}`);
      setErrorLugares((actual) => actual ?? mensaje);
    }
  }, []);

  useEffect(() => {
    async function inicializar() {
      try {
        await inicializarBaseDatosFavoritos();
        await cargarCategorias();

        const pos = await obtenerUbicacionActual();
        if (pos) setMiUbicacion(pos);
      } catch (error) {
        console.warn('No se pudo inicializar parte de la pantalla principal:', error);
      }
    }
    inicializar();
  }, [cargarCategorias]);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const favs = await obtenerFavoritosIds();
      setFavoritosIds(Array.isArray(favs) ? favs : []);

      const resLugares = await obtenerLugares(busquedaLugar);
      const lista = Array.isArray(resLugares.datos) ? resLugares.datos : [];
      setLugares(lista);
      setErrorLugares(
        resLugares.exito ? null : resLugares.mensaje ?? 'No se pudieron cargar los lugares.'
      );
    } catch (error) {
      const mensaje = mensajeDeErrorApi(error, 'los lugares');
      console.warn(`[API] ${mensaje}`);
      setErrorLugares(mensaje);
    } finally {
      setCargando(false);
    }
  }, [busquedaLugar]);

  useFocusEffect(
    useCallback(() => {
      void cargarDatos();
    }, [cargarDatos])
  );

  const reintentarCarga = () => {
    setErrorLugares(null);
    void cargarCategorias();
    void cargarDatos();
  };

  const handleToggleCategoria = (catId: string) => {
    if (catId === 'cat-todas') {
      setCategoriasSeleccionadas(['cat-todas']);
      return;
    }

    setCategoriasSeleccionadas((prev) => {
      const sinTodas = prev.filter((id) => id !== 'cat-todas');
      if (sinTodas.includes(catId)) {
        const filtradas = sinTodas.filter((id) => id !== catId);
        return filtradas.length === 0 ? ['cat-todas'] : filtradas;
      } else {
        return [...sinTodas, catId];
      }
    });
  };

  const handleIrAPerfil = async () => {
    const token = await obtenerToken();
    if (!token) {
      router.push('/login');
    } else {
      router.push('/perfil');
    }
  };

  const handleIrAFavoritos = async () => {
    const token = await obtenerToken();
    if (!token) {
      router.push('/login');
    } else {
      router.push('/favoritos');
    }
  };

  // 🔒 Alterna favorito pidiendo autenticación
  const handleToggleFavorito = async (lugarId: string) => {
    const token = await obtenerToken();
    if (!token) {
      router.push('/login');
      return;
    }

    await alternarFavorito(lugarId);
    const favsActualizados = await obtenerFavoritosIds();
    setFavoritosIds(Array.isArray(favsActualizados) ? favsActualizados : []);
  };

  const lugaresFiltrados = lugares.filter((lugar) => {
    if (
      categoriasSeleccionadas.includes('cat-todas') ||
      categoriasSeleccionadas.length === 0
    ) {
      return true;
    }
    return categoriasSeleccionadas.includes(lugar.categoriaId);
  });

  const origen = miUbicacion || COLON_CENTRO;
  const lugaresConDistancia = lugaresFiltrados
    .map((lugar) => {
      const lat = lugar.coordenadas?.latitud || COLON_CENTRO.latitud;
      const lng = lugar.coordenadas?.longitud || COLON_CENTRO.longitud;
      const dist = calcularDistanciaKm(origen, { latitud: lat, longitud: lng });
      return { ...lugar, distanciaKm: dist };
    })
    .sort((a, b) => a.distanciaKm - b.distanciaKm);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: colores.fondo }]}>
        
        {/* Encabezado Principal */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.mainTitle, { color: colores.textoPrincipal }]}>
              Mi Ciudad - Colón
            </Text>
            <Text style={[styles.subTitle, { color: colores.textoSecundario }]}>
              Guía de Atractivos Turísticos
            </Text>
          </View>

          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.iconButton} 
              accessibilityLabel="Audioguías"
              onPress={() => router.push('/audioguias-modulo' as any)}
            >
              <Ionicons name="headset-outline" size={22} color="#0284c7" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.iconButton, { marginLeft: 8 }]} 
              onPress={handleIrAFavoritos}
            >
              <Ionicons name="heart-outline" size={22} color="#0284c7" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.iconButton, { marginLeft: 8 }]} 
              onPress={handleIrAPerfil}
            >
              <Ionicons name="person-outline" size={22} color="#0284c7" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Buscador */}
        <View style={[
          styles.searchContainer, 
          { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde }
        ]}>
          <Ionicons name="search-outline" size={20} color={colores.textoSecundario} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Buscar por nombre, termas, bodegas..."
            placeholderTextColor={colores.textoSecundario}
            value={busquedaLugar}
            onChangeText={setBusquedaLugar}
            style={[styles.searchInput, { color: colores.textoPrincipal }]}
          />
        </View>

        {errorLugares && (
          <View style={[styles.bannerError, { backgroundColor: colores.tarjetaFondo, borderColor: '#fecaca' }]}>
            <Ionicons name="cloud-offline-outline" size={18} color="#b91c1c" />
            <Text
              accessibilityRole="alert"
              style={[styles.bannerErrorTexto, { color: colores.textoPrincipal }]}
              numberOfLines={2}
            >
              {errorLugares}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Reintentar carga de lugares"
              onPress={reintentarCarga}
              style={styles.bannerErrorBoton}
            >
              <Text style={styles.bannerErrorAccion}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Chips de Categorías */}
        {categorias.length > 0 && (
          <View style={styles.categoriesWrapper}>
            <FlatList
              horizontal
              data={categorias}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const esActiva = categoriasSeleccionadas.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      esActiva
                        ? styles.categoryChipActive
                        : { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde },
                    ]}
                    onPress={() => handleToggleCategoria(item.id)}
                  >
                    <Ionicons
                      name={(item.icono as any) || 'pricetag-outline'}
                      size={16}
                      color={esActiva ? '#FFF' : colores.textoSecundario}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        esActiva ? styles.categoryChipTextActive : { color: colores.textoSecundario },
                      ]}
                    >
                      {item.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {/* Selector Mapa vs Lista */}
        <View style={[styles.toggleContainer, { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde }]}>
          <TouchableOpacity
            style={[styles.toggleBtn, modoVista === 'mapa' && styles.toggleBtnActive]}
            onPress={() => setModoVista('mapa')}
          >
            <Ionicons name="map" size={18} color={modoVista === 'mapa' ? '#FFF' : colores.textoSecundario} />
            <Text style={[styles.toggleText, modoVista === 'mapa' ? styles.toggleTextActive : { color: colores.textoSecundario }]}>
              Mapa
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, modoVista === 'lista' && styles.toggleBtnActive]}
            onPress={() => setModoVista('lista')}
          >
            <Ionicons name="list" size={18} color={modoVista === 'lista' ? '#FFF' : colores.textoSecundario} />
            <Text style={[styles.toggleText, modoVista === 'lista' ? styles.toggleTextActive : { color: colores.textoSecundario }]}>
              Lista
            </Text>
          </TouchableOpacity>
        </View>

        {cargando ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : modoVista === 'mapa' ? (
          /* 🗺️ VISTA DE MAPA */
          <View style={styles.mapWrapper}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.mapa}
              initialRegion={{
                latitude: COLON_CENTRO.latitud,
                longitude: COLON_CENTRO.longitud,
                latitudeDelta: 0.045,
                longitudeDelta: 0.045,
              }}
              onPress={() => setLugarSeleccionado(null)}
            >
              {lugaresConDistancia.map((lugar) => (
                <Marker
                  key={lugar.id}
                  coordinate={{
                    latitude: lugar.coordenadas?.latitud || COLON_CENTRO.latitud,
                    longitude: lugar.coordenadas?.longitud || COLON_CENTRO.longitud,
                  }}
                  title={lugar.nombre}
                  onPress={(e) => {
                    e.stopPropagation();
                    setLugarSeleccionado(lugar);
                  }}
                />
              ))}
            </MapView>

            {/* Tarjeta Flotante en el Mapa */}
            {lugarSeleccionado && (
              <View style={[
                styles.tarjetaFlotante, 
                { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde }
              ]}>
                <TouchableOpacity 
                  style={styles.cerrarCardBtn} 
                  onPress={() => setLugarSeleccionado(null)}
                >
                  <Ionicons name="close-circle" size={22} color={colores.textoSecundario} />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image 
                    source={{ uri: obtenerImagenSegura(lugarSeleccionado.imagenes) }} 
                    style={styles.tarjetaFlotanteImg} 
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.tarjetaFlotanteTitulo, { color: colores.textoPrincipal }]} numberOfLines={1}>
                      {lugarSeleccionado.nombre}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#0284c7', marginTop: 2, fontWeight: '500' }}>
                      📍 A {formatearDistancia(lugarSeleccionado.distanciaKm)}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 8 }}>
                  {/* 🎧 Muestra Audioguía SOLO si el lugar la posee */}
                  {tieneAudioguia(lugarSeleccionado) && (
                    <TouchableOpacity 
                      style={styles.btnAudioguiaFlotante} 
                      onPress={() => router.push('/audioguias-modulo' as any)}
                    >
                      <Ionicons name="headset" size={14} color="#0284c7" />
                      <Text style={styles.btnAudioguiaTexto}>Audioguía</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity 
                    style={styles.btnVerDetalle} 
                    onPress={() => router.push(`/lugar/${lugarSeleccionado.id}` as any)}
                  >
                    <Text style={styles.btnVerDetalleTexto}>Ver Detalle ➔</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ) : (
          /* 📋 VISTA DE LISTA */
          <FlatList
            data={lugaresConDistancia}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => {
              const esFav = favoritosIds.includes(item.id);
              const imagenUri = obtenerImagenSegura(item.imagenes);
              const poseeAudio = tieneAudioguia(item);

              return (
                <TouchableOpacity
                  style={[
                    styles.card,
                    { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde }
                  ]}
                  onPress={() => router.push(`/lugar/${item.id}` as any)}
                  activeOpacity={0.8}
                >
                  <Image 
                    source={{ uri: imagenUri }} 
                    style={styles.cardImage} 
                    resizeMode="cover"
                  />
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={[styles.cardTitle, { color: colores.textoPrincipal }]}>
                        {item.nombre}
                      </Text>

                      <TouchableOpacity
                        onPress={() => handleToggleFavorito(item.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={esFav ? 'heart' : 'heart-outline'}
                          size={22}
                          color={esFav ? '#E74C3C' : colores.textoSecundario}
                        />
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.cardDescription, { color: colores.textoSecundario }]} numberOfLines={2}>
                      {item.descripcionCorta}
                    </Text>

                    <View style={styles.cardFooter}>
                      <Text style={styles.distanciaText}>
                        📍 A {formatearDistancia(item.distanciaKm)}
                      </Text>

                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {/* 🎧 Muestra Audioguía SOLO si el lugar la posee */}
                        {poseeAudio && (
                          <TouchableOpacity
                            style={styles.btnAudioguiaCard}
                            onPress={() => router.push('/audioguias-modulo' as any)}
                          >
                            <Ionicons name="headset-outline" size={14} color="#0284c7" />
                            <Text style={styles.btnAudioguiaTexto}>Audioguía</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.btnIr}
                          onPress={() =>
                            abrirMapaNativo(
                              item.coordenadas?.latitud || COLON_CENTRO.latitud,
                              item.coordenadas?.longitud || COLON_CENTRO.longitud,
                              item.nombre
                            )
                          }
                        >
                          <Ionicons name="navigate-outline" size={14} color="#0284c7" />
                          <Text style={styles.btnIrTexto}>Ir</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colores.textoSecundario }]}>
                No se encontraron atractivos turísticos que coincidan con tu búsqueda.
              </Text>
            }
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  mainTitle: { fontSize: 24, fontWeight: 'bold' },
  subTitle: { fontSize: 14, marginBottom: 12 },
  headerButtons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 8, backgroundColor: '#e0f2fe', borderRadius: 20 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15 },
  bannerError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  bannerErrorTexto: { flex: 1, fontSize: 12, lineHeight: 17 },
  bannerErrorBoton: { paddingHorizontal: 8, paddingVertical: 4 },
  bannerErrorAccion: { color: '#0284c7', fontSize: 12, fontWeight: '700' },
  categoriesWrapper: { maxHeight: 42, marginBottom: 10 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  categoryChipText: { fontSize: 14, fontWeight: '500' },
  categoryChipTextActive: { color: '#FFF', fontWeight: 'bold' },
  
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    borderWidth: 1,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleBtnActive: { backgroundColor: '#007AFF' },
  toggleText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  toggleTextActive: { color: '#FFF' },

  mapWrapper: { flex: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 12, position: 'relative' },
  mapa: { width: '100%', height: '100%' },
  tarjetaFlotante: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    elevation: 5,
  },
  cerrarCardBtn: { position: 'absolute', top: 8, right: 8, zIndex: 10 },
  tarjetaFlotanteImg: { width: 50, height: 50, borderRadius: 8 },
  tarjetaFlotanteTitulo: { fontSize: 16, fontWeight: 'bold', marginRight: 16 },
  btnVerDetalle: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnVerDetalleTexto: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  btnAudioguiaFlotante: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  card: { borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, elevation: 2 },
  cardImage: { width: '100%', height: 160 },
  cardContent: { padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 8 },
  cardDescription: { fontSize: 14, marginVertical: 8, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  distanciaText: { fontSize: 13, color: '#0284c7', fontWeight: '500' },
  
  btnAudioguiaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  btnAudioguiaTexto: { color: '#0284c7', fontWeight: 'bold', marginLeft: 4, fontSize: 12 },
  
  btnIr: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  btnIrTexto: { color: '#0284c7', fontWeight: 'bold', marginLeft: 4, fontSize: 12 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 15 },
});