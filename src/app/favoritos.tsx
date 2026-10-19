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
import { obtenerFavoritosIds, alternarFavorito } from '../servicios/favoritos';
import { obtenerUsuario } from '../servicios/autenticacion';
import { useTema } from '../contexto/TemaContext'; 

export default function FavoritosPantalla() {
  const { colores } = useTema();

  const [lugaresFavoritos, setLugaresFavoritos] = useState<Lugar[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);

  useFocusEffect(
    useCallback(() => {
      async function cargarFavoritos() {
        setCargando(true);
        try {
          // 1. Identificar si hay un usuario en SecureStore o usar el usuario por defecto
          const usuario = await obtenerUsuario();
          const usuarioId = usuario?.email || 'usuario_invitado';

          // 2. Obtener los IDs guardados en la base de datos SQLite
          const favIds = await obtenerFavoritosIds(usuarioId);

          if (!favIds || favIds.length === 0) {
            setLugaresFavoritos([]);
          } else {
            // 3. Obtener el catalogo completo de lugares y filtrar por ID
            const respuesta = await obtenerLugares();
            const filtrados = respuesta.datos.filter((lugar) =>
              favIds.includes(lugar.id)
            );
            setLugaresFavoritos(filtrados);
          }
        } catch (error) {
          console.error('Error al cargar la lista de favoritos desde SQLite:', error);
          setLugaresFavoritos([]);
        } finally {
          setCargando(false);
        }
      }

      cargarFavoritos();
    }, [])
  );

  const handleQuitarFavorito = async (lugarId: string) => {
    try {
      const usuario = await obtenerUsuario();
      const usuarioId = usuario?.email || 'usuario_invitado';

      // Eliminar o alternar de SQLite
      await alternarFavorito(lugarId, usuarioId);

      // Actualizar el estado local para quitar la tarjeta inmediatamente de la lista
      setLugaresFavoritos((prev) => prev.filter((item) => item.id !== lugarId));
    } catch (error) {
      console.error('Error al quitar elemento de favoritos:', error);
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

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: colores.fondo }]}>
        <FlatList
          data={lugaresFavoritos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            // Obtencion segura de la URL de la primera imagen
            const imagenUri = Array.isArray(item.imagenes) && item.imagenes.length > 0
              ? item.imagenes[0]
              : typeof item.imagenes === 'string'
              ? item.imagenes
              : '[suspicious link removed]';

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
                  <Image source={{ uri: imagenUri }} style={styles.cardImage} />
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
                Pulsá el ícono del corazón en los atractivos turísticos para
                guardarlos en esta sección.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardContent: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: 14,
    marginVertical: 8,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});