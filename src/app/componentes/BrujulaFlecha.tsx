import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import { calcularRumboGrados } from '../../servicios/ubicacion';

interface BrujulaProps {
  origen: { latitud: number; longitud: number };
  destino: { latitud: number; longitud: number };
  nombreLugar?: string;
}

export default function BrujulaFlecha({ origen, destino, nombreLugar }: BrujulaProps) {
  const [anguloBrujula, setAnguloBrujula] = useState<number>(0);
  const [suscripcion, setSuscripcion] = useState<any>(null);

  useEffect(() => {
    // Configurar frecuencia de actualización (en milisegundos)
    Magnetometer.setUpdateInterval(100);

    // Suscribirse a las lecturas del magnetómetro
    const sub = Magnetometer.addListener((data) => {
      let { x, y } = data;
      // Calcular el ángulo magnético
      let angulo = Math.atan2(y, x) * (180 / Math.PI);
      if (angulo < 0) {
        angulo += 360;
      }
      setAnguloBrujula(angulo);
    });

    setSuscripcion(sub);

    // Cancelar la suscripción al desmontar el componente para ahorrar batería
    return () => {
      if (sub) sub.remove();
    };
  }, []);

  // 1. Calcular el rumbo directo hacia el destino
  const rumboHaciaDestino = calcularRumboGrados(origen, destino);

  // 2. Calcular la rotación relativa de la flecha respecto a la cabeza del celular
  const rotacionFlecha = (rumboHaciaDestino - anguloBrujula + 360) % 360;

  return (
    <View style={styles.container}>
      {/* Flecha indicadora que rota según el movimiento del teléfono */}
      <View style={{ transform: [{ rotate: `${rotacionFlecha}deg` }] }}>
        <Ionicons name="navigate-outline" size={48} color="#007AFF" />
      </View>

      {nombreLugar && (
        <Text style={styles.textoLugar}>
          Caminá hacia {nombreLugar}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  textoLugar: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
});