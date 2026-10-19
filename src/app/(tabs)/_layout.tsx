import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'
import { useTema } from '../../contexto/TemaContext'; 

export default function LayoutTabs() {
  // Intentamos obtener el tema global si existe, o usamos un valor por defecto
  const temaContext = useTema?.();
  const colores = temaContext?.colores || {
    tarjetaFondo: '#FFFFFF',
    tarjetaBorde: '#E2E8F0',
    textoPrincipal: '#0F172A',
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#0284c7', // Color azul destacado para la solapa seleccionada
        tabBarInactiveTintColor: '#64748b', // Color gris para las solapas inactivas
        tabBarStyle: {
          backgroundColor: colores.tarjetaFondo,
          borderTopColor: colores.tarjetaBorde,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: colores.tarjetaFondo,
        },
        headerTitleStyle: {
          color: colores.textoPrincipal,
          fontWeight: 'bold',
        },
      }}
    >
      {/* 🗺️ Pestaña 1: Mapa (Tu pantalla principal) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mapa',
          headerTitle: 'Mi Ciudad - Colón',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size || 22} color={color} />
          ),
        }}
      />

      {/* 📅 Pestaña 2: Agenda de eventos */}
      <Tabs.Screen
        name="eventos"
        options={{
          title: 'Agenda',
          headerTitle: 'Agenda de Eventos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size || 22} color={color} />
          ),
        }}
      />

      {/* 📸 Pestaña 3: Mi Recorrido / QR */}
      <Tabs.Screen
        name="mirecorrido"
        options={{
          title: 'Mi recorrido',
          headerTitle: 'Mi Historial de Visitas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="footsteps-outline" size={size || 22} color={color} />
          ),
        }}
      />

      {/* 👤 Pestaña 4: Perfil / Yo */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Yo',
          headerTitle: 'Mi Perfil y Favoritos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size || 22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}