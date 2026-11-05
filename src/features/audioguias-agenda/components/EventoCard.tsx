import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTema } from '../../../contexto/TemaContext';
import { EventoAgenda } from '../data/eventos';

interface PropsEventoCard {
  evento: EventoAgenda;
  recordatorioActivo: boolean;
  ocupado: boolean;
  anticipacionMinutos: number;
  onCambiarAnticipacion: (minutos: number) => void;
  onAlternarRecordatorio: () => void;
  onAbrirDetalle: () => void;
}

const opcionesAnticipacion = [
  { etiqueta: '1 h', minutos: 60 },
  { etiqueta: '1 día', minutos: 1440 },
];

const fechaCompleta = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function EventoCard({
  evento,
  recordatorioActivo,
  ocupado,
  anticipacionMinutos,
  onCambiarAnticipacion,
  onAlternarRecordatorio,
  onAbrirDetalle,
}: PropsEventoCard) {
  const { colores } = useTema();
  const fecha = new Date(evento.fecha);

  return (
    <View style={[styles.tarjeta, { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde }]}>
      <TouchableOpacity accessibilityRole="button" onPress={onAbrirDetalle} style={styles.cuerpo}>
        <View style={styles.fechaIcono}>
          <Ionicons name="calendar-outline" size={19} color="#0284c7" />
        </View>
        <View style={styles.textos}>
          <Text style={[styles.titulo, { color: colores.textoPrincipal }]}>{evento.titulo}</Text>
          <Text style={[styles.fecha, { color: '#0284c7' }]}>{fechaCompleta.format(fecha)}</Text>
          <Text style={[styles.lugar, { color: colores.textoPrincipal }]}>{evento.lugar}</Text>
          <Text style={[styles.direccion, { color: colores.textoSecundario }]}>{evento.direccion}</Text>
          <Text style={[styles.descripcion, { color: colores.textoSecundario }]}>{evento.descripcion}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colores.textoSecundario} />
      </TouchableOpacity>

      <View style={[styles.pie, { borderTopColor: colores.tarjetaBorde }]}>
        <View style={styles.selector}>
          {opcionesAnticipacion.map((opcion) => {
            const seleccionada = opcion.minutos === anticipacionMinutos;
            return (
              <TouchableOpacity
                key={opcion.minutos}
                accessibilityRole="radio"
                accessibilityState={{ checked: seleccionada }}
                onPress={() => onCambiarAnticipacion(opcion.minutos)}
                style={[styles.opcion, seleccionada && styles.opcionActiva]}
              >
                <Text style={[styles.textoOpcion, { color: seleccionada ? '#fff' : colores.textoSecundario }]}>{opcion.etiqueta}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          accessibilityRole="switch"
          accessibilityState={{ checked: recordatorioActivo, disabled: ocupado }}
          accessibilityLabel={`${recordatorioActivo ? 'Cancelar' : 'Programar'} recordatorio: ${evento.titulo}`}
          disabled={ocupado}
          onPress={onAlternarRecordatorio}
          style={styles.botonAviso}
        >
          {ocupado ? (
            <ActivityIndicator size="small" color="#0284c7" />
          ) : (
            <>
              <Ionicons name={recordatorioActivo ? 'notifications' : 'notifications-outline'} size={17} color={recordatorioActivo ? '#0284c7' : colores.textoSecundario} />
              <Text style={[styles.textoAviso, { color: recordatorioActivo ? '#0284c7' : colores.textoSecundario }]}>
                {recordatorioActivo ? 'Recordatorio activo' : 'Recordarme'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 8, marginBottom: 10, overflow: 'hidden' },
  cuerpo: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  fechaIcono: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e7f4fa', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  textos: { flex: 1, minWidth: 0 },
  titulo: { fontSize: 15, fontWeight: '700' },
  fecha: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  lugar: { fontSize: 12, fontWeight: '700', marginTop: 7 },
  direccion: { fontSize: 11, marginTop: 2 },
  descripcion: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  pie: { minHeight: 50, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingHorizontal: 14, paddingVertical: 8 },
  selector: { flexDirection: 'row', padding: 2, borderRadius: 6, backgroundColor: '#edf2f4', gap: 2 },
  opcion: { minWidth: 42, minHeight: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingHorizontal: 7 },
  opcionActiva: { backgroundColor: '#0284c7' },
  textoOpcion: { fontSize: 11, fontWeight: '700' },
  botonAviso: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 3 },
  textoAviso: { fontSize: 12, fontWeight: '700' },
});