import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Lugar, Categoria } from './src/tipos/lugares';
import { obtenerLugares, obtenerCategorias, obtenerLugarPorId } from './src/servicios/lugares';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function App() {
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('cat-todas');
  const [busquedaLugar, setBusquedaLugar] = useState<string>('');
  const [cargandoLugares, setCargandoLugares] = useState<boolean>(true);
  const [lugarSeleccionadoId, setLugarSeleccionadoId] = useState<string | null>(null);
  const [detalleLugar, setDetalleLugar] = useState<Lugar | null>(null);
  const [cargandoDetalleLugar, setCargandoDetalleLugar] = useState<boolean>(false);

  useEffect(() => {
    obtenerCategorias().then((res) => setCategorias(res.datos));
  }, []);

  useEffect(() => {
    cargarLugares();
  }, [busquedaLugar, categoriaSeleccionada]);

  useEffect(() => {
    if (lugarSeleccionadoId) {
      setCargandoDetalleLugar(true);
      obtenerLugarPorId(lugarSeleccionadoId).then((res) => {
        setDetalleLugar(res.datos);
        setCargandoDetalleLugar(false);
      });
    } else {
      setDetalleLugar(null);
    }
  }, [lugarSeleccionadoId]);

  const cargarLugares = async () => {
    setCargandoLugares(true);
    const res = await obtenerLugares(busquedaLugar, categoriaSeleccionada);
    setLugares(res.datos);
    setCargandoLugares(false);
  };

  // --- VISTA DETALLE DE LUGAR ---
  if (lugarSeleccionadoId) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setLugarSeleccionadoId(null)}
          >
            <Ionicons name="arrow-back-outline" size={20} color="#007AFF" style={{ marginRight: 6 }} />
            <Text style={styles.backButtonText}>Volver al Catálogo</Text>
          </TouchableOpacity>

          {cargandoDetalleLugar || !detalleLugar ? (
            <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
              <Image source={{ uri: detalleLugar.imagenes }} style={styles.detailImage} />
              <View style={styles.detailBody}>
                <Text style={styles.detailTitle}>{detalleLugar.nombre}</Text>
                <Text style={styles.detailAddress}>Dirección: {detalleLugar.direccion}</Text>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Descripción</Text>
                  <Text style={styles.text}>{detalleLugar.descripcion}</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Horarios de Atención</Text>
                  {detalleLugar.horarios.length > 0 ? (
                    detalleLugar.horarios.map((h, i) => (
                      <Text key={i} style={styles.text}>
                        - {DIAS_SEMANA[h.dia]}: {h.abre} a {h.cierra} hs
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.text}>Abierto todo el día / Sin horario específico</Text>
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Información del Atractivo</Text>
                  <Text style={styles.text}>
                    Entrada:{' '}
                    {detalleLugar.precioEntrada === 0
                      ? 'Gratuita'
                      : detalleLugar.precioEntrada
                      ? `$${detalleLugar.precioEntrada}`
                      : 'No especificada'}
                  </Text>
                  {detalleLugar.telefono && (
                    <Text style={styles.text}>Teléfono: {detalleLugar.telefono}</Text>
                  )}
                  <Text style={styles.text}>
                    Accesibilidad:{' '}
                    {detalleLugar.accesible
                      ? 'Apto para personas con movilidad reducida'
                      : 'No adaptado'}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // --- VISTA LISTADO PRINCIPAL (CATÁLOGO) ---
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.mainTitle}>Mi Ciudad - Colón</Text>
        <Text style={styles.subTitle}>Guía de Atractivos Turísticos</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Buscar por nombre, termas, bodegas..."
            value={busquedaLugar}
            onChangeText={setBusquedaLugar}
            style={styles.searchInput}
          />
        </View>

        {/* Filtro por Categorías */}
        <View style={styles.categoriesWrapper}>
          <FlatList
            horizontal
            data={categorias}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  categoriaSeleccionada === item.id && styles.categoryChipActive,
                ]}
                onPress={() => setCategoriaSeleccionada(item.id)}
              >
                <Ionicons
                  name={item.icono as any}
                  size={16}
                  color={categoriaSeleccionada === item.id ? '#FFF' : '#475569'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    categoriaSeleccionada === item.id && styles.categoryChipTextActive,
                  ]}
                >
                  {item.nombre}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {cargandoLugares ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={lugares}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => setLugarSeleccionadoId(item.id)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: item.imagenes }} style={styles.cardImage} />
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.nombre}</Text>
                    {item.accesible && (
                      <Ionicons name="accessibility-outline" size={18} color="#007AFF" />
                    )}
                  </View>
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {item.descripcionCorta}
                  </Text>
                  <Text style={styles.cardPrice}>
                    {item.precioEntrada === 0
                      ? 'Entrada Gratuita'
                      : item.precioEntrada
                      ? `$${item.precioEntrada}`
                      : 'Sin costo especificado'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No se encontraron atractivos turísticos en esta categoría.</Text>
            }
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingHorizontal: 16 },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginTop: 12 },
  subTitle: { fontSize: 14, color: '#64748B', marginBottom: 12 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  categoriesWrapper: { maxHeight: 42, marginBottom: 16 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: '#007AFF' },
  categoryChipText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  categoryChipTextActive: { color: '#FFF', fontWeight: 'bold' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  cardImage: { width: '100%', height: 160 },
  cardContent: { padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', flex: 1 },
  cardDescription: { fontSize: 14, color: '#64748B', marginVertical: 8, lineHeight: 20 },
  cardPrice: { fontSize: 14, fontWeight: '700', color: '#16A34A' },
  emptyText: { textAlign: 'center', color: '#64748B', marginTop: 40, fontSize: 15 },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, marginBottom: 8 },
  backButtonText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
  detailImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 12 },
  detailBody: { paddingBottom: 20 },
  detailTitle: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  detailAddress: { fontSize: 14, color: '#64748B', marginTop: 4, marginBottom: 8 },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#1E293B', marginBottom: 6 },
  text: { fontSize: 15, color: '#334155', lineHeight: 22, marginBottom: 4 },
});