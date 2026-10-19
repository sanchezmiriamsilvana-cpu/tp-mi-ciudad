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

// 🎨 Hook del Tema Global (Modo Claro / Oscuro)
import { useTema } from '../../contexto/TemaContext';

export default function PantallaPrincipal() {
  const { colores } = useTema();

  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  
  // 🏷️ Arreglo de IDs para selección múltiple de filtros
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>(['cat-todas']);
  const [busquedaLugar, setBusquedaLugar] = useState<string>('');
  
  // 🗺️ Vista inicial por defecto
  const [modoVista, setModoVista] = useState<'mapa' | 'lista'>('mapa');
  const [cargando, setCargando] = useState<boolean>(true);

  // 📍 Lugar seleccionado para la tarjeta flotante en el mapa
  const [lugarSeleccionado, setLugarSeleccionado] = useState<any | null>(null);

  // Ubicación del usuario y lista de Favoritos SQLite
  const [miUbicacion, setMiUbicacion] = useState<Coordenadas | null>(null);
  const [favoritosIds, setFavoritosIds] = useState<string[]>([]);

  // 1. Cargar categorías, ubicación e inicializar base de datos
  useEffect(() => {
    async function inicializar() {
      try {
        await inicializarBaseDatosFavoritos();
        const resCategorias = await obtenerCategorias();
        setCategorias(resCategorias.datos || []);

        const pos = await obtenerUbicacionActual();
        if (pos) setMiUbicacion(pos);
      } catch (error) {
        console.error('Error al inicializar la pantalla principal:', error);
      }
    }
    inicializar();
  }, []);

  // 2. Recargar datos cuando la pantalla toma foco o cambia la búsqueda
  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [busquedaLugar])
  );

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const token = await obtenerToken();
      if (!token) {
        setFavoritosIds([]);
      } else {
        const favs = await obtenerFavoritosIds();
        setFavoritosIds(favs);
      }

      const resLugares = await obtenerLugares(busquedaLugar);
      setLugares(resLugares.datos || []);
    } catch (error) {
      console.error('Error al cargar lugares:', error);
    } finally {
      setCargando(false);
    }
  };

  // 🏷️ Lógica para activar/desactivar filtros múltiples
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

  // 👤 Navegación al Perfil protegida por sesión
  const handleIrAPerfil = async () => {
    const token = await obtenerToken();
    if (!token) {
      router.push('/login');
    } else {
      router.push('/perfil'); // Ajustá a '/yo' si tu archivo se llama yo.tsx
    }
  };

  // ❤️ Navegación a la lista de Favoritos protegida por sesión
  const handleIrAFavoritos = async () => {
    const token = await obtenerToken();
    if (!token) {
      router.push('/login');
    } else {
      router.push('/favoritos');
    }
  };

  // ❤️ Alternar estado de favorito en SQLite (protegido por sesión)
  const handleToggleFavorito = async (lugarId: string) => {
    const token = await obtenerToken();

    if (!token) {
      router.push('/login');
      return;
    }

    await alternarFavorito(lugarId);
    const favsActualizados = await obtenerFavoritosIds();
    setFavoritosIds(favsActualizados);
  };

  // 🔍 Filtrado cliente por múltiples categorías
  const lugaresFiltrados = lugares.filter((lugar) => {
    if (
      categoriasSeleccionadas.includes('cat-todas') ||
      categoriasSeleccionadas.length === 0
    ) {
      return true;
    }
    return categoriasSeleccionadas.includes(lugar.categoriaId);
  });

  // 📍 Calcular distancias ordenadas sobre los lugares filtrados
  const origen = miUbicacion || COLON_CENTRO;
  const lugaresConDistancia = lugaresFiltrados
    .map((lugar) => {
      const dist = calcularDistanciaKm(origen, {
        latitud: lugar.coordenadas.latitud,
        longitud: lugar.coordenadas.longitud,
      });
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

          {/* Botones de Acceso Rápido del Encabezado */}
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.iconButton} 
              accessibilityLabel="Audioguías"
              onPress={() => router.push('/audioguias-modulo')}
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

        {/* Chips de Categorías (Múltiple Selección) */}
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

        {/* Selector de Vista: Mapa 🗺️ vs Lista 📋 */}
        <View style={[styles.toggleContainer, { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde }]}>
          <TouchableOpacity
            style={[styles.toggleBtn, modoVista === 'mapa' && styles.toggleBtnActive]}
            onPress={() => setModoVista('mapa')}
          >
            <Ionicons
              name="map"
              size={18}
              color={modoVista === 'mapa' ? '#FFF' : colores.textoSecundario}
            />
            <Text
              style={[
                styles.toggleText,
                modoVista === 'mapa' ? styles.toggleTextActive : { color: colores.textoSecundario },
              ]}
            >
              Mapa
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, modoVista === 'lista' && styles.toggleBtnActive]}
            onPress={() => setModoVista('lista')}
          >
            <Ionicons
              name="list"
              size={18}
              color={modoVista === 'lista' ? '#FFF' : colores.textoSecundario}
            />
            <Text
              style={[
                styles.toggleText,
                modoVista === 'lista' ? styles.toggleTextActive : { color: colores.textoSecundario },
              ]}
            >
              Lista
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenido Principal */}
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
              {lugaresConDistancia
                .filter(
                  (lugar) =>
                    lugar &&
                    lugar.coordenadas &&
                    typeof lugar.coordenadas.latitud === 'number' &&
                    typeof lugar.coordenadas.longitud === 'number'
                )
                .map((lugar) => (
                  <Marker
                    key={lugar.id}
                    coordinate={{
                      latitude: lugar.coordenadas.latitud,
                      longitude: lugar.coordenadas.longitud,
                    }}
                    title={lugar.nombre}
                    onPress={(e) => {
                      e.stopPropagation();
                      setLugarSeleccionado(lugar);
                    }}
                  />
                ))}
            </MapView>

            {/* 🎴 Tarjeta Flotante en el Mapa */}
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
                    source={{ 
                      uri: Array.isArray(lugarSeleccionado.imagenes) 
                        ? lugarSeleccionado.imagenes 
                        : lugarSeleccionado.imagenes 
                    }} 
                    style={styles.tarjetaFlotanteImg} 
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.tarjetaFlotanteTitulo, { color: colores.textoPrincipal }]} numberOfLines={1}>
                      {lugarSeleccionado.nombre}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#0284c7', marginTop: 2, fontWeight: '500' }}>
                      📍 A {formatearDistancia(lugarSeleccionado.distanciaKm)} de vos
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
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
              const imagenUri = Array.isArray(item.imagenes) ? item.imagenes[0] : item.imagenes;

              return (
                <TouchableOpacity
                  style={[
                    styles.card,
                    { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde }
                  ]}
                  onPress={() => router.push(`/lugar/${item.id}` as any)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: imagenUri }} style={styles.cardImage} />
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={[styles.cardTitle, { color: colores.textoPrincipal }]}>
                        {item.nombre}
                      </Text>

                      {/* Botón de Favorito */}
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
                        📍 A {formatearDistancia(item.distanciaKm)} de vos
                      </Text>

                      <TouchableOpacity
                        style={styles.btnIr}
                        onPress={() =>
                          abrirMapaNativo(
                            item.coordenadas.latitud,
                            item.coordenadas.longitud,
                            item.nombre
                          )
                        }
                      >
                        <Ionicons name="navigate-outline" size={14} color="#0284c7" />
                        <Text style={styles.btnIrTexto}>Ir</Text>
                      </TouchableOpacity>
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
  
  /* Toggle Lista / Mapa */
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

  /* Mapa y Tarjeta Flotante */
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cerrarCardBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  tarjetaFlotanteImg: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  tarjetaFlotanteTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 16,
  },
  btnVerDetalle: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnVerDetalleTexto: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  /* Tarjetas de Lista */
  card: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 2,
  },
  cardImage: { width: '100%', height: 160 },
  cardContent: { padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 8 },
  cardDescription: { fontSize: 14, marginVertical: 8, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  distanciaText: { fontSize: 13, color: '#0284c7', fontWeight: '500' },
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