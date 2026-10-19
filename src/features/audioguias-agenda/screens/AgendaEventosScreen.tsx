import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '../../../contexto/TemaContext';
import DateStrip from '../components/DateStrip';
import EventoCard from '../components/EventoCard';
import { useEventos } from '../hooks/useEventos';

export default function AgendaEventosScreen({ modo }: { modo?: 'tab' } = {}) {
  const { colores } = useTema();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const enPestana = modo === 'tab';
  const agenda = useEventos();
  const [anticipaciones, setAnticipaciones] = useState<Record<string, number>>({});
  const eventoDetalle = !enPestana && typeof params.eventId === 'string'
    ? agenda.eventos.find((evento) => evento.id === params.eventId)
    : undefined;
  const eventosVisibles = eventoDetalle ? [eventoDetalle] : agenda.eventosDelDia;
  const fechaTitulo = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(agenda.fechaSeleccionada);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colores.fondo }]}
      edges={enPestana ? [] : ['top', 'bottom']}
    >
      {!enPestana && <Stack.Screen options={{ headerShown: false }} />}
      {!enPestana && (
        <View style={styles.encabezado}>
          {eventoDetalle ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a la agenda" onPress={() => router.replace('/agenda-eventos')} style={styles.botonVolver}>
              <Ionicons name="arrow-back" size={22} color={colores.textoPrincipal} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconoAgenda}><Ionicons name="calendar-outline" size={22} color="#0284c7" /></View>
          )}
          <View style={styles.titulos}>
            <Text style={[styles.titulo, { color: colores.textoPrincipal }]}>{eventoDetalle ? 'Detalle del evento' : 'Agenda de eventos'}</Text>
            <Text style={[styles.subtitulo, { color: colores.textoSecundario }]}>Colón, Entre Ríos</Text>
          </View>
        </View>
      )}

      {!eventoDetalle && (
        <View style={styles.selectorFecha}>
          <Text style={[styles.fechaSeleccionada, { color: colores.textoPrincipal }]}>{fechaTitulo}</Text>
          <DateStrip
            fechaSeleccionada={agenda.fechaSeleccionada}
            eventos={agenda.eventos}
            alSeleccionar={agenda.seleccionarFecha}
            dias={enPestana ? 30 : 14}
          />
        </View>
      )}

      {agenda.permisoNotificaciones === false && (
        <View style={styles.permisoDenegado}>
          <Text style={styles.textoPermiso}>Las notificaciones están desactivadas.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => void Linking.openSettings()}>
            <Text style={styles.abrirAjustes}>Abrir ajustes</Text>
          </TouchableOpacity>
        </View>
      )}

      {agenda.error && (
        <View style={styles.mensajeError}>
          <Text accessibilityRole="alert" style={styles.textoError}>{agenda.error}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar mensaje" onPress={agenda.limpiarError}>
            <Ionicons name="close" size={19} color="#9f2e2e" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.lista}>
        {!eventoDetalle && <Text style={[styles.encuentros, { color: colores.textoPrincipal }]}>{eventosVisibles.length ? 'Eventos del día' : 'Sin eventos este día'}</Text>}
        {eventosVisibles.map((evento) => (
          <EventoCard
            key={evento.id}
            evento={evento}
            recordatorioActivo={Boolean(agenda.recordatorios[evento.id])}
            ocupado={agenda.ocupado === evento.id}
            anticipacionMinutos={anticipaciones[evento.id] ?? 60}
            onCambiarAnticipacion={(minutos) => setAnticipaciones((actuales) => ({ ...actuales, [evento.id]: minutos }))}
            onAlternarRecordatorio={() => void agenda.alternarRecordatorio(evento, anticipaciones[evento.id] ?? 60)}
            onAbrirDetalle={() => router.push({ pathname: '/agenda-eventos', params: { eventId: evento.id } })}
          />
        ))}

        {!eventoDetalle && (
          <>
            <Text style={[styles.encuentros, { color: colores.textoPrincipal, marginTop: 18 }]}>Próximos eventos</Text>
            {agenda.proximosEventos.length === 0 && (
              <Text style={[styles.sinEventos, { color: colores.textoSecundario }]}>No hay eventos próximos publicados.</Text>
            )}
            {agenda.proximosEventos.map((evento) => (
              <EventoCard
                key={`proximo-${evento.id}`}
                evento={evento}
                recordatorioActivo={Boolean(agenda.recordatorios[evento.id])}
                ocupado={agenda.ocupado === evento.id}
                anticipacionMinutos={anticipaciones[evento.id] ?? 60}
                onCambiarAnticipacion={(minutos) => setAnticipaciones((actuales) => ({ ...actuales, [evento.id]: minutos }))}
                onAlternarRecordatorio={() => void agenda.alternarRecordatorio(evento, anticipaciones[evento.id] ?? 60)}
                onAbrirDetalle={() => router.push({ pathname: '/agenda-eventos', params: { eventId: evento.id } })}
              />
            ))}
          </>
        )}

        {eventoDetalle && (
          <TouchableOpacity accessibilityRole="button" onPress={() => router.replace('/agenda-eventos')} style={styles.volverAgenda}>
            <Ionicons name="calendar-outline" size={17} color="#0284c7" />
            <Text style={styles.volverTexto}>Volver a la agenda</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  encabezado: { flexDirection: 'row', alignItems: 'center', minHeight: 62, paddingHorizontal: 18, gap: 12 },
  botonVolver: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  iconoAgenda: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e7f4fa' },
  titulos: { flex: 1 },
  titulo: { fontSize: 22, fontWeight: '800' },
  subtitulo: { fontSize: 12, marginTop: 2 },
  selectorFecha: { paddingLeft: 18, paddingTop: 8, paddingBottom: 13 },
  fechaSeleccionada: { fontSize: 14, fontWeight: '700', textTransform: 'capitalize', marginBottom: 10 },
  permisoDenegado: { marginHorizontal: 18, marginBottom: 10, padding: 10, borderRadius: 6, backgroundColor: '#fff5e8', flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  textoPermiso: { flex: 1, fontSize: 12, color: '#835116' },
  abrirAjustes: { fontSize: 12, color: '#0284c7', fontWeight: '700' },
  mensajeError: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 18, paddingVertical: 8 },
  textoError: { flex: 1, fontSize: 12, color: '#9f2e2e' },
  lista: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 112, flexGrow: 1 },
  encuentros: { fontSize: 14, fontWeight: '800', marginBottom: 11, textTransform: 'capitalize' },
  sinEventos: { fontSize: 12, marginBottom: 11 },
  volverAgenda: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 5 },
  volverTexto: { color: '#0284c7', fontSize: 13, fontWeight: '700' },
});