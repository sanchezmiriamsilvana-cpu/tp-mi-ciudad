import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Lugar } from '../tipos/lugares';
import { obtenerLugares } from '../servicios/lugares';
import { mensajeDeErrorApi } from '../servicios/errores';
import { obtenerFavoritosIds, alternarFavorito } from '../servicios/favoritos';
import { useTema } from '../contexto/TemaContext';
import { BASE_URL } from '../servicios/api';

const IMAGEN_DEFAULT = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSYwl49SBaAWa5x5iCzdte_NsHghIRZiSWyphHOVNp6aw&s';

// 🟢 Helper seguro: procesa cualquier formato de imagen y reemplaza URLs locales por la BASE_URL activa
const obtenerImagenSegura = (imagenes: any): string => {
  if (!imagenes) return IMAGEN_DEFAULT;

  let url: any = imagenes;

  // 1. Si viene como un string JSON (ej: '["/uploads/foto.jpg"]')
  if (typeof url === 'string' && url.trim().startsWith('[')) {
    try {
      url = JSON.parse(url);
    } catch {
      // Ignorar si no es un JSON válido
    }
  }

  // 2. Si es un arreglo, tomamos la primera posición
  if (Array.isArray(url)) {
    url = url.length > 0 ? url[0] : '';
  }

  // 3. Si el elemento resultante es un objeto (ej: { url: '...' })
  if (typeof url === 'object' && url !== null) {
    url = url.url || url.uri || url.path || url.imagen || '';
  }

  // 4. Si no es una cadena válida de texto, devolvemos la imagen por defecto
  if (typeof url !== 'string' || url.trim() === '') {
    return IMAGEN_DEFAULT;
  }

  url = url.trim();

  const hostLimpio = BASE_URL.replace(/\/$/, '');

  // 5. Reemplazar localhost / IPs locales por la BASE_URL de DevTunnels
  if (url.includes('localhost:3000')) {
    return url.replace('http://localhost:3000', hostLimpio);
  }
  if (url.includes('127.0.0.1:3000')) {
    return url.replace('http://127.0.0.1:3000', hostLimpio);
  }
  if (url.includes('10.0.2.2:3000')) {
    return url.replace('http://10.0.2.2:3000', hostLimpio);
  }

  // 6. Si es una ruta relativa (ej: "/uploads/foto.jpg"), le concatenamos la BASE_URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const rutaLimpia = url.startsWith('/') ? url : '/' + url;
    return `${hostLimpio}${rutaLimpia}`;
  }

  return url;
};

export default function FavoritosPantalla() {
  const { colores } = useTema();

  const [lugaresFavoritos, setLugaresFavoritos] = useState<Lugar[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const cargarFavoritos = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      const favIds = await obtenerFavoritosIds();

      if (!favIds || favIds.length === 0) {
        setLugaresFavoritos([]);
        return;
      }

      const res = await obtenerLugares();
      if (!res.exito) {
        setLugaresFavoritos([]);
        setError(res.mensaje ?? 'No se pudieron cargar los lugares favoritos.');
        return;
      }

      const lista = Array.isArray(res.datos) ? res.datos : [];
      setLugaresFavoritos(lista.filter((lugar) => favIds.includes(lugar.id)));
    } catch (fallo) {
      const mensaje = mensajeDeErrorApi(fallo, 'los favoritos');
      console.warn(`[API] ${mensaje}`);
      setLugaresFavoritos([]);
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargarFavoritos();
    }, [cargarFavoritos])
  );

  const handleQuitarFavorito = async (lugarId: string) => {
    try {
      await alternarFavorito(lugarId);
      // Elimina la tarjeta inmediatamente del estado local
      setLugaresFavoritos((prev) => prev.filter((item) => item.id !== lugarId));
    } catch (error) {
      console.warn('No se pudo quitar el favorito:', error);
    }
  };

  if (cargando) {
    return (
      <SafeAreaProvider>
        <SafeAreaView
          style={[styles.centerContainer, { backgroundColor: colores.fondo }]}
        >
          <ActivityIndicator size="large" color="#0284c7" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (error) {
    return (
      <SafeAreaProvider>
        <SafeAreaView
          style={[styles.centerContainer, { backgroundColor: colores.fondo }]}
        >
          <Ionicons name="cloud-offline-outline" size={48} color={colores.textoSecundario} />
          <Text style={[styles.emptyTitle, { color: colores.textoPrincipal }]}>
            No se pudieron cargar tus favoritos
          </Text>
          <Text style={[styles.emptySubtext, { color: colores.textoSecundario }]}>
            {error}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.botonReintentar}
            onPress={() => void cargarFavoritos()}
          >
            <Ionicons name="refresh" size={17} color="#FFF" />
            <Text style={styles.textoReintentar}>Reintentar</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: colores.fondo }]}>
        <FlatList
          data={lugaresFavoritos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const imagenUri = obtenerImagenSegura(item.imagenes);

            return (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colores.tarjetaFondo,
                    borderColor: colores.tarjetaBorde,
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push(`/lugar/${item.id}` as any)}
                >
                  <Image
                    source={{ uri: imagenUri }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>

                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <TouchableOpacity
                      style={{ flex: 1, marginRight: 8 }}
                      onPress={() => router.push(`/lugar/${item.id}` as any)}
                    >
                      <Text
                        style={[styles.cardTitle, { color: colores.textoPrincipal }]}
                        numberOfLines={1}
                      >
                        {item.nombre}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleQuitarFavorito(item.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="heart" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push(`/lugar/${item.id}` as any)}
                  >
                    <Text
                      style={[
                        styles.cardDescription,
                        { color: colores.textoSecundario },
                      ]}
                      numberOfLines={2}
                    >
                      {item.descripcionCorta}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="heart-dislike-outline"
                size={60}
                color={colores.textoSecundario}
              />
              <Text
                style={[styles.emptyTitle, { color: colores.textoPrincipal }]}
              >
                Sin favoritos guardados
              </Text>
              <Text
                style={[
                  styles.emptySubtext,
                  { color: colores.textoSecundario },
                ]}
              >
                Tocá el ícono del corazón en los atractivos turísticos para guardarlos acá.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, gap: 10 },
  botonReintentar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#0284c7',
  },
  textoReintentar: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  card: { borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, elevation: 2 },
  cardImage: { width: '100%', height: 160 },
  cardContent: { padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold' },
  cardDescription: { fontSize: 14, marginVertical: 8, lineHeight: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
  emptySubtext: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});