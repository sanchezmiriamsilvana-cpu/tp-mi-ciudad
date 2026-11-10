import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { estaConectado } from '../servicios/red';
import { TemaProvider, useTema } from '../contexto/TemaContext';
import { AudioguiasProvider } from '../features/audioguias-agenda/hooks/useAudioguia';
import { AudioguiasCatalogoProvider } from '../features/audioguias-agenda/hooks/useAudioguias';
import AudioguiasAgendaOverlays from '../features/audioguias-agenda/components/AudioguiasAgendaOverlays';

// Componente del banner de red flotante y visible
function BannerRed() {
  const [online, setOnline] = useState<boolean>(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    async function revisarConexion() {
      try {
        const hayInternet = await estaConectado();
        setOnline(hayInternet);
      } catch (err) {
        setOnline(false);
      }
    }

    revisarConexion();
    //  Chequeo cada 2.5 segundos para detección rápida
    const intervalo = setInterval(revisarConexion, 2500);

    return () => clearInterval(intervalo);
  }, []);

  // Si hay red, no mostramos nada
  if (online) return null;

  return (
    <View style={[stylesBanner.banner, { top: insets.top > 0 ? insets.top : 10 }]}>
      <Ionicons name="cloud-offline-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
      <Text style={stylesBanner.texto}>
        Sin conexión — Navegás con datos guardados en SQLite
      </Text>
    </View>
  );
}

const stylesBanner = StyleSheet.create({
  banner: {
    position: 'absolute', 
    left: 16,
    right: 16,
    zIndex: 99999,        
    elevation: 10,         
    backgroundColor: '#b91c1c',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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

        {/* 3. Audioguías y agenda de eventos */}
        <Stack.Screen name="audioguias-modulo" options={{ headerShown: false }} />
        <Stack.Screen name="audioguia-player" options={{ headerShown: false }} />
        <Stack.Screen name="agenda-eventos" options={{ headerShown: false }} />
        <Stack.Screen name="audioguias" options={{ headerShown: false }} />
      </Stack>

      {/* 🔴 Banner de alerta de red colocado DESPUÉS del Stack para que flote encima */}
      <BannerRed />

      {/* Mini reproductor y navegación desde notificaciones */}
      <AudioguiasAgendaOverlays />
    </View>
  );
}

// Layout Principal envuelto en los proveedores globales
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TemaProvider>
        <AudioguiasCatalogoProvider>
          <AudioguiasProvider>
            <ContenidoLayout />
          </AudioguiasProvider>
        </AudioguiasCatalogoProvider>
      </TemaProvider>
    </SafeAreaProvider>
  );
}
