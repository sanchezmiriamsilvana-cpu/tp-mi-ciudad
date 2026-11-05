import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

// Coordenadas por defecto del centro de Colón (Entre Ríos) si no hay permiso de GPS
export const COLON_CENTRO: Coordenadas = {
  latitud: -32.2239,
  longitud: -58.1428,
};

// 1. Solicitar permisos de GPS y obtener la posición del turista (Optimizado para rapidez)
export async function obtenerUbicacionActual(): Promise<Coordenadas | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Permiso de ubicación denegado por el usuario.');
      return null; // Si niega el permiso, la app sigue funcionando
    }

    // ⚡ Intenta obtener primero la última ubicación conocida (Instantáneo < 50ms)
    let pos = await Location.getLastKnownPositionAsync({});

    // Si no hay una posición reciente en caché, consulta al GPS activo
    if (!pos) {
      pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    }

    if (!pos) return null;

    return {
      latitud: pos.coords.latitude,
      longitud: pos.coords.longitude,
    };
  } catch (error) {
    console.error('Error al obtener coordenadas GPS:', error);
    return null;
  }
}

// 2. Calcular distancia en kilómetros entre dos coordenadas (Fórmula Haversine)
export function calcularDistanciaKm(origen: Coordenadas, destino: Coordenadas): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((destino.latitud - origen.latitud) * Math.PI) / 180;
  const dLon = ((destino.longitud - origen.longitud) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((origen.latitud * Math.PI) / 180) *
      Math.cos((destino.latitud * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 3. Formatear la distancia para el turista (ej: "450 m" o "1.2 km")
export function formatearDistancia(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

// 4. Abrir la app de mapas nativa (Google Maps en Android / Apple Maps en iOS)
export function abrirMapaNativo(lat: number, lng: number, nombreLugar: string) {
  const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
  const latLng = `${lat},${lng}`;
  const label = encodeURIComponent(nombreLugar);
  
  const url = Platform.select({
    ios: `${scheme}${label}@${latLng}`,
    android: `${scheme}${latLng}(${label})`,
  });

  if (url) {
    Linking.openURL(url).catch((err) =>
      console.error('Error al abrir la app de mapas:', err)
    );
  }
}

// 5. CalcularRumboGrados: Calcula el rumbo en grados desde el origen hacia el destino
export function calcularRumboGrados(
  origen: { latitud: number; longitud: number },
  destino: { latitud: number; longitud: number }
): number {
  const RAD = Math.PI / 180;
  const lat1 = origen.latitud * RAD;
  const lat2 = destino.latitud * RAD;
  const dLon = (destino.longitud - origen.longitud) * RAD;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const rumboRadianes = Math.atan2(y, x);
  const rumboGrados = (rumboRadianes * 180) / Math.PI;

  return (rumboGrados + 360) % 360;
}