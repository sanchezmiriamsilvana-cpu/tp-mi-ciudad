import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { estaConectado } from '../servicios/red'; 
import { TemaProvider, useTema } from '../contexto/TemaContext'; 
import { AudioguiasProvider } from '../features/audioguias-agenda/hooks/useAudioguia';
import AudioguiasAgendaOverlays from '../features/audioguias-agenda/components/AudioguiasAgendaOverlays';

// Componente del banner de red
function BannerRed() {
  const [online, setOnline] = useState<boolean>(true);

  useEffect(() => {
    async function revisarConexion() {
      const hayInternet = await estaConectado();
      setOnline(hayInternet);
    }

    revisarConexion();
    const intervalo = setInterval(revisarConexion, 10000);

    return () => clearInterval(intervalo);
  }, []);

  if (online) return null;

  return (
    <View style={stylesBanner.banner}>
      <Ionicons name="cloud-offline-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
      <Text style={stylesBanner.texto}>
        Sin conexión — Navegás con datos guardados en SQLite
      </Text>
    </View>
  );
}

const stylesBanner = StyleSheet.create({
  banner: {
    backgroundColor: '#b91c1c',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

// Componente interno para aplicar el tema dinámico al Stack
function ContenidoLayout() {
  const { colores, esOscuro } = useTema();

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      {/* Banner de alerta de red */}
      <BannerRed />

      {/* Navegador principal: Arranca SIEMPRE en (tabs) para permitir uso público */}
      <Stack
        initialRouteName="(tabs)"
        screenOptions={{
          headerStyle: {
            backgroundColor: esOscuro ? '#1e293b' : '#0284c7',
          },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: {
            backgroundColor: colores.fondo,
          },
        }}
      >
        {/* 1. Pestañas públicas (Mapa, Catálogo, Agenda, Recorrido) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* 2. Pantallas secundarias y modales */}
        <Stack.Screen name="lugar/[id]" options={{ title: 'Detalle del Atractivo' }} />
        <Stack.Screen name="favoritos" options={{ title: 'Mis Favoritos' }} />
        <Stack.Screen name="login" options={{ title: 'Iniciar Sesión', presentation: 'modal' }} />
        <Stack.Screen name="registro" options={{ title: 'Crear Cuenta' }} />

        {/* 3. Módulo de audioguías y agenda (pantallas con su propio encabezado) */}
        <Stack.Screen name="audioguias-modulo" options={{ headerShown: false }} />
        <Stack.Screen name="audioguia-player" options={{ headerShown: false }} />
        <Stack.Screen name="agenda-eventos" options={{ headerShown: false }} />
      </Stack>

      {/* Mini reproductor global y navegación por notificaciones */}
      <AudioguiasAgendaOverlays />
    </View>
  );
}

// Layout Principal envuelto en los proveedores de tema y audio
export default function RootLayout() {
  return (
    <TemaProvider>
      <AudioguiasProvider>
        <ContenidoLayout />
      </AudioguiasProvider>
    </TemaProvider>
  );
}