import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

interface EscanerQRModalProps {
  visible: boolean;
  onCerrar: () => void;
  onCodigoEscaneado: (codigo: string) => void;
}

export default function EscanerQRModal({
  visible,
  onCerrar,
  onCodigoEscaneado,
}: EscanerQRModalProps) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [escaneado, setEscaneado] = useState<boolean>(false);

  // Reiniciamos la bandera de escaneo cada vez que se abre el modal
  useEffect(() => {
    if (visible) {
      setEscaneado(false);
    }
  }, [visible]);

  // Función al detectar un código con la cámara
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (escaneado) return;
    setEscaneado(true);

    // Validación del formato del QR de Colón ('COLON:<id_lugar>')
    if (!data.startsWith('COLON:')) {
      Alert.alert(
        'QR No Válido',
        'El código escaneado no corresponde a un cartel de la guía turística de Mi Ciudad.',
        [{ text: 'Reintentar', onPress: () => setEscaneado(false) }]
      );
      return;
    }

    onCodigoEscaneado(data);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCerrar}
      transparent={false}
    >
      <View style={styles.contenedor}>
        {/* 1. Cargando respuesta de permisos */}
        {!permiso && (
          <View style={styles.centrado}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.textoMensaje}>Cargando estado de la cámara...</Text>
          </View>
        )}

        {/* 2. Permisos no concedidos */}
        {permiso && !permiso.granted && (
          <View style={styles.centrado}>
            <Ionicons name="camera-outline" size={64} color="#8E8E93" />
            <Text style={styles.tituloPermiso}>Permiso de Cámara Requerido</Text>
            <Text style={styles.textoMensaje}>
              Para registrar tu visita escaneando los carteles de los atractivos, la aplicación necesita acceso a la cámara.
            </Text>
            <TouchableOpacity style={styles.botonPermiso} onPress={pedirPermiso}>
              <Text style={styles.textoBoton}>Permitir Acceso</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonCancelar} onPress={onCerrar}>
              <Text style={styles.textoBotonCancelar}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 3. Permisos otorgados -> Muestra la Cámara */}
        {permiso && permiso.granted && (
          <View style={StyleSheet.absoluteFillObject}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={escaneado ? undefined : handleBarCodeScanned}
            />

            {/* Cuadro guía visual para enfocar el código */}
            <View style={styles.overlay}>
              <View style={styles.marcoQR} />
              <Text style={styles.instruccionesText}>
                Apuntá con la cámara al código QR del cartel
              </Text>
            </View>

            {/* Botón flotante para cerrar el modal */}
            <TouchableOpacity style={styles.botonCerrarFlotante} onPress={onCerrar}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#000',
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1C1C1E',
  },
  tituloPermiso: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  textoMensaje: {
    fontSize: 15,
    color: '#AAA',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  botonPermiso: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginBottom: 12,
  },
  textoBoton: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  botonCancelar: {
    paddingVertical: 10,
  },
  textoBotonCancelar: {
    color: '#FF3B30',
    fontSize: 15,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  marcoQR: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#007AFF',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  instruccionesText: {
    color: '#FFF',
    marginTop: 24,
    fontSize: 15,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  botonCerrarFlotante: {
    position: 'absolute',
    top: 48,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});