import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { obtenerConexionDB } from '../../servicios/db';
import {
  obtenerToken,
  obtenerUsuario,
  borrarToken,
  Usuario,
} from '../../servicios/autenticacion';

// 🟢 Importamos useTema y ModoTema desde tu TemaContext
import { useTema, ModoTema } from '../../contexto/TemaContext';

// 🏷️ Categorías disponibles para las preferencias en SQLite
const CATEGORIAS_DISPONIBLES = [
  { id: 'cat-termas', nombre: 'Termas', icono: 'water-outline' },
  { id: 'cat-playas', nombre: 'Playas y Ríos', icono: 'sunny-outline' },
  { id: 'cat-museos', nombre: 'Historia y Museos', icono: 'library-outline' },
  { id: 'cat-gastronomia', nombre: 'Gastronomía', icono: 'restaurant-outline' },
  { id: 'cat-naturaleza', nombre: 'Naturaleza', icono: 'leaf-outline' },
];

export default function PantallaPerfil() {
  // 🟢 1. Consumimos exactamente las propiedades de tu TemaContext
  const { colores, esOscuro, modo, setModo } = useTema();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [categoriasInteres, setCategoriasInteres] = useState<string[]>(['cat-termas']);

  // Recargar perfil y SQLite cada vez que la solapa gana foco
  useFocusEffect(
    useCallback(() => {
      cargarPerfilYPreferencias();
    }, [])
  );

  const cargarPerfilYPreferencias = async () => {
    setCargando(true);
    try {
      // 1. Verificamos si hay token activo
      const token = await obtenerToken();

      if (!token) {
        setUsuario(null);
      } else {
        const usr = await obtenerUsuario();
        setUsuario(usr || { nombre: 'Turista en Colón', email: 'turista@colon.gob.ar' });
      }

      // 2. Carga de preferencias guardadas en SQLite
      const db = await obtenerConexionDB();
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS preferencias (
          clave TEXT PRIMARY KEY NOT NULL,
          valor TEXT NOT NULL
        );
      `);

      const regTema = await db.getFirstAsync<{ valor: string }>(
        'SELECT valor FROM preferencias WHERE clave = ?;',
        ['tema_visual']
      );
      if (regTema?.valor) {
        setModo(regTema.valor as ModoTema);
      }

      const regCat = await db.getFirstAsync<{ valor: string }>(
        'SELECT valor FROM preferencias WHERE clave = ?;',
        ['categorias_interes']
      );
      if (regCat?.valor) {
        setCategoriasInteres(JSON.parse(regCat.valor));
      }
    } catch (error) {
      console.error('Error al cargar perfil o SQLite:', error);
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  };

  // 🎨 Cambia el tema usando setModo del TemaContext y guarda en SQLite
  const handleCambiarTema = async (nuevoModo: ModoTema) => {
    // 1. Cambiamos el modo en el TemaContext (se actualizan Mapa, Perfil, Tabs y Headers al instante)
    setModo(nuevoModo);

    // 2. Persistimos en SQLite
    try {
      const db = await obtenerConexionDB();
      await db.runAsync(
        'INSERT OR REPLACE INTO preferencias (clave, valor) VALUES (?, ?);',
        ['tema_visual', nuevoModo]
      );
    } catch (error) {
      console.error('Error guardando tema en SQLite:', error);
    }
  };

  // 🏷️ Guardar categorías de interés en SQLite
  const handleToggleCategoria = async (catId: string) => {
    let seleccionadas: string[];
    if (categoriasInteres.includes(catId)) {
      seleccionadas = categoriasInteres.filter((id) => id !== catId);
    } else {
      seleccionadas = [...categoriasInteres, catId];
    }
    setCategoriasInteres(seleccionadas);

    try {
      const db = await obtenerConexionDB();
      await db.runAsync(
        'INSERT OR REPLACE INTO preferencias (clave, valor) VALUES (?, ?);',
        ['categorias_interes', JSON.stringify(seleccionadas)]
      );
    } catch (error) {
      console.error('Error guardando categorías en SQLite:', error);
    }
  };

  // 🚪 Cerrar sesión
  const handleCerrarSesion = async () => {
    Alert.alert('Cerrar Sesión', '¿Estás segura de que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar Sesión',
        style: 'destructive',
        onPress: async () => {
          await borrarToken();
          setUsuario(null);
          Alert.alert('Sesión finalizada', 'Has cerrado sesión correctamente.');
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  if (cargando) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colores.fondo }]}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  // 👤 VISTA MODO INVITADO (Si NO hay sesión activa)
  if (!usuario) {
    return (
      <View style={[styles.container, styles.centerContainer, { backgroundColor: colores.fondo }]}>
        <Ionicons name="person-circle-outline" size={80} color={colores.textoSecundario} />
        <Text style={[styles.tituloInvitado, { color: colores.textoPrincipal }]}>
          Modo Invitado
        </Text>
        <Text style={[styles.subtituloInvitado, { color: colores.textoSecundario }]}>
          Estás navegando como turista anónimo. Iniciá sesión para guardar tus atractivos favoritos y sincronizar tu experiencia.
        </Text>

        <TouchableOpacity
          style={styles.botonLoginInvitado}
          onPress={() => router.push('/login')}
        >
          <Ionicons name="log-in-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.textoBotonLogin}>Iniciar Sesión / Registrarse</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 👤 VISTA PERFIL ACTIVO (Si SÍ hay sesión activa)
  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colores.fondo }]}>
      {/* 1. Tarjeta de Perfil */}
      <View
        style={[
          styles.cardPerfil,
          { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde },
        ]}
      >
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle-outline" size={72} color="#0284c7" />
        </View>
        <Text style={[styles.nombreUsuario, { color: colores.textoPrincipal }]}>
          {usuario.nombre}
        </Text>
        <Text style={[styles.emailUsuario, { color: colores.textoSecundario }]}>
          {usuario.email}
        </Text>
        <View style={styles.badgeSesion}>
          <Text style={styles.badgeTexto}>✓ Sesión Activa</Text>
        </View>
      </View>

      {/* 🎨 2. Sección de Apariencia / Tema Visual */}
      <Text style={[styles.seccionTitulo, { color: colores.textoPrincipal }]}>
        Apariencia de la App
      </Text>
      <View style={styles.opcionesRow}>
        <TouchableOpacity
          style={[
            styles.botonTema,
            { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde },
            modo === 'claro' && styles.botonTemaActivo,
          ]}
          onPress={() => handleCambiarTema('claro')}
        >
          <Ionicons
            name="sunny-outline"
            size={20}
            color={modo === 'claro' ? '#fff' : colores.textoSecundario}
          />
          <Text
            style={[
              styles.textoTema,
              { color: colores.textoSecundario },
              modo === 'claro' && styles.textoTemaActivo,
            ]}
          >
            Claro
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.botonTema,
            { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde },
            modo === 'oscuro' && styles.botonTemaActivo,
          ]}
          onPress={() => handleCambiarTema('oscuro')}
        >
          <Ionicons
            name="moon-outline"
            size={20}
            color={modo === 'oscuro' ? '#fff' : colores.textoSecundario}
          />
          <Text
            style={[
              styles.textoTema,
              { color: colores.textoSecundario },
              modo === 'oscuro' && styles.textoTemaActivo,
            ]}
          >
            Oscuro
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.botonTema,
            { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde },
            modo === 'sistema' && styles.botonTemaActivo,
          ]}
          onPress={() => handleCambiarTema('sistema')}
        >
          <Ionicons
            name="settings-outline"
            size={20}
            color={modo === 'sistema' ? '#fff' : colores.textoSecundario}
          />
          <Text
            style={[
              styles.textoTema,
              { color: colores.textoSecundario },
              modo === 'sistema' && styles.textoTemaActivo,
            ]}
          >
            Sistema
          </Text>
        </TouchableOpacity>
      </View>

      {/* 🏷️ 3. Sección de Categorías de Interés (SQLite) */}
      <Text style={[styles.seccionTitulo, { color: colores.textoPrincipal }]}>
        Tus Intereses Turísticos
      </Text>
      <Text style={[styles.seccionSubtitulo, { color: colores.textoSecundario }]}>
        Tocá las categorías para elegirlas o desmarcarlas:
      </Text>

      <View style={styles.chipsContainer}>
        {CATEGORIAS_DISPONIBLES.map((cat) => {
          const seleccionada = categoriasInteres.includes(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chipInteres,
                {
                  backgroundColor: seleccionada ? '#0284c7' : colores.tarjetaFondo,
                  borderColor: seleccionada ? '#0284c7' : colores.tarjetaBorde,
                },
              ]}
              onPress={() => handleToggleCategoria(cat.id)}
            >
              <Ionicons
                name={cat.icono as any}
                size={16}
                color={seleccionada ? '#fff' : esOscuro ? '#38bdf8' : '#0284c7'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.textoChip,
                  { color: seleccionada ? '#fff' : esOscuro ? '#38bdf8' : '#0284c7' },
                ]}
              >
                {cat.nombre}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ❤️ 4. Acceso Rápido a Favoritos */}
      <TouchableOpacity
        style={[
          styles.botonFavoritosAcceso,
          {
            backgroundColor: esOscuro ? '#1e293b' : '#e0f2fe',
            borderColor: esOscuro ? '#334155' : '#bae6fd',
          },
        ]}
        onPress={() => router.push('/favoritos')}
      >
        <Ionicons name="heart" size={20} color="#E74C3C" style={{ marginRight: 8 }} />
        <Text
          style={[
            styles.textoBotonFavoritos,
            { color: esOscuro ? '#38bdf8' : '#0284c7' },
          ]}
        >
          Mis Atractivos Favoritos
        </Text>
      </TouchableOpacity>

      {/* 🚪 5. Botón de Cerrar Sesión */}
      <TouchableOpacity
        style={[
          styles.botonCerrar,
          {
            backgroundColor: esOscuro ? '#2d1517' : '#fef2f2',
            borderColor: esOscuro ? '#7f1d1d' : '#fecaca',
          },
        ]}
        onPress={handleCerrarSesion}
      >
        <Ionicons name="log-out-outline" size={20} color="#ef4444" style={{ marginRight: 8 }} />
        <Text style={styles.textoBotonCerrar}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tituloInvitado: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
  },
  subtituloInvitado: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 12,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  botonLoginInvitado: {
    flexDirection: 'row',
    backgroundColor: '#0284c7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  textoBotonLogin: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  cardPerfil: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    elevation: 2,
  },
  avatarContainer: {
    marginBottom: 8,
  },
  nombreUsuario: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  emailUsuario: {
    fontSize: 14,
    marginTop: 2,
  },
  badgeSesion: {
    marginTop: 12,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeTexto: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: 'bold',
  },
  seccionTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 12,
  },
  seccionSubtitulo: {
    fontSize: 13,
    marginBottom: 12,
  },
  opcionesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  botonTema: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  botonTemaActivo: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  textoTema: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  textoTemaActivo: {
    color: '#fff',
    fontWeight: 'bold',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  chipInteres: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  textoChip: {
    fontSize: 13,
    fontWeight: '600',
  },
  botonFavoritosAcceso: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  textoBotonFavoritos: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  botonCerrar: {
    flexDirection: 'row',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonCerrar: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});