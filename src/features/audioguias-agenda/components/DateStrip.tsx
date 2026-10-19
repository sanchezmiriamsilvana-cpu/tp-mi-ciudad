import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTema } from '../../../contexto/TemaContext';
import { EventoAgenda } from '../data/eventos';

interface PropsDateStrip {
  fechaSeleccionada: Date;
  eventos: EventoAgenda[];
  alSeleccionar: (fecha: Date) => void;
  dias?: number;
}

function claveFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
}

export default function DateStrip({ fechaSeleccionada, eventos, alSeleccionar, dias = 14 }: PropsDateStrip) {
  const { colores } = useTema();
  const fechas = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Array.from({ length: dias }, (_, indice) => {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + indice);
      return fecha;
    });
  }, [dias]);
  const fechasConEventos = new Set(eventos.map((evento) => claveFecha(new Date(evento.fecha))));
  const diaSemana = new Intl.DateTimeFormat('es-AR', { weekday: 'short' });

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fechas}>
      {fechas.map((fecha) => {
        const seleccionada = claveFecha(fecha) === claveFecha(fechaSeleccionada);
        const tieneEventos = fechasConEventos.has(claveFecha(fecha));
        return (
          <TouchableOpacity
            key={claveFecha(fecha)}
            accessibilityRole="button"
            accessibilityState={{ selected: seleccionada }}
            accessibilityLabel={`${diaSemana.format(fecha)}, ${fecha.getDate()}${tieneEventos ? ', con eventos' : ''}`}
            onPress={() => alSeleccionar(fecha)}
            style={[
              styles.dia,
              { backgroundColor: seleccionada ? '#0284c7' : colores.tarjetaFondo, borderColor: seleccionada ? '#0284c7' : colores.tarjetaBorde },
            ]}
          >
            <Text style={[styles.nombreDia, { color: seleccionada ? '#fff' : colores.textoSecundario }]}>
              {fecha.toDateString() === new Date().toDateString() ? 'Hoy' : diaSemana.format(fecha).replace('.', '')}
            </Text>
            <Text style={[styles.numeroDia, { color: seleccionada ? '#fff' : colores.textoPrincipal }]}>{fecha.getDate()}</Text>
            <View style={[styles.marca, { backgroundColor: tieneEventos ? (seleccionada ? '#fff' : '#16835d') : 'transparent' }]} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fechas: { gap: 7, paddingVertical: 3, paddingRight: 18 },
  dia: { width: 52, minHeight: 72, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 7 },
  nombreDia: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  numeroDia: { fontSize: 17, fontWeight: '800', marginTop: 3 },
  marca: { width: 5, height: 5, borderRadius: 3, marginTop: 4 },
});