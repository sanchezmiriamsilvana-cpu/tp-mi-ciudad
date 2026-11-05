import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Abre la cámara del dispositivo para tomar una foto y retorna su URI local.
 */
export async function tomarFotoVisita(): Promise<string | null> {
  // 1. Solicitar permisos de la cámara
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) {
    Alert.alert(
      'Permiso Denegado',
      'Se necesita acceso a la cámara para tomar la foto de la visita.'
    );
    return null;
  }

  // 2. Abrir la interfaz de la cámara
  const resultado = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.7,
  });

  if (!resultado.canceled && resultado.assets.length > 0) {
    return resultado.assets[0].uri;
  }

  return null;
}