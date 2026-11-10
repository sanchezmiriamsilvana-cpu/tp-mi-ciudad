import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '../../../contexto/TemaContext';
import DateStrip from '../components/DateStrip';
import EventoCard from '../components/EventoCard';
import { useEventoDetalle } from '../hooks/useEventoDetalle';
import { useEventos } from '../hooks/useEventos';

export default function AgendaEventosScreen({ modo }: { modo?: 'tab' } = {}) {
  const { colores } = useTema();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const enPestana = modo === 'tab';
  const idDetalle = typeof params.eventId === 'string' ? params.eventId : undefined;
  const esDetalle = !enPestana && Boolean(idDetalle);

  const agenda = useEventos();
  const detalle = useEventoDetalle(idDetalle, { habilitado: esDetalle });

  const [anticipaciones, setAnticipaciones] = useState<Record<string, number>>({});

  const eventoDetalle = esDetalle
    ? detalle.evento ?? agenda.eventos.find((evento) => evento.id === idDetalle)
    : undefined;
  const eventosVisibles = eventoDetalle ? [eventoDetalle] : agenda.eventosDelDia;
  const proximosVisibles = agenda.proximosEventos.filter(
    (evento) => !eventosVisibles.some((visible) => visible.id === evento.id)
  );

  const cargando = esDetalle ? detalle.cargando && !eventoDetalle : agenda.cargando;
  const errorCarga = esDetalle
    ? eventoDetalle
      ? null
      : detalle.error
    : agenda.eventos.length === 0
      ? agenda.error
      : null;
  const errorActualizacion = !esDetalle && agenda.eventos.length > 0 ? agenda.error : null;
  const refrescando = esDetalle
    ? detalle.cargando && Boolean(eventoDetalle)
    : agenda.refrescando;
  const alReintentar = esDetalle ? detalle.recargar : agenda.recargar;
  const alRefrescar = esDetalle ? detalle.recargar : agenda.refrescar;

  const fechaTitulo = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(agenda.fechaSeleccionada);

  function renderEvento(evento: (typeof eventosVisibles)[number], clavePrefijo = '') {
    return (
      <EventoCard
        key={`${clavePrefijo}${evento.id}`}
        evento={evento}
        recordatorioActivo={Boolean(agenda.recordatorios[evento.id])}
        ocupado={agenda.ocupado === evento.id}
        anticipacionMinutos={anticipaciones[evento.id] ?? 60}
        onCambiarAnticipacion={(minutos) =>
          setAnticipaciones((actuales) => ({ ...actuales, [evento.id]: minutos }))
        }
        onAlternarRecordatorio={() =>
          void agenda.alternarRecordatorio(evento, anticipaciones[evento.id] ?? 60)
        }
        onAbrirDetalle={() =>
          router.push({ pathname: '/agenda-eventos', params: { eventId: evento.id } })
        }
      />
    );
  }

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

      {!esDetalle && (
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

      {agenda.aviso && (
        <View style={styles.mensajeError}>
          <Text accessibilityRole="alert" style={styles.textoError}>{agenda.aviso}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar mensaje" onPress={agenda.limpiarAviso}>
            <Ionicons name="close" size={19} color="#9f2e2e" />
          </TouchableOpacity>
        </View>
      )}

      {errorActualizacion && (
        <View style={styles.mensajeError}>
          <Text accessibilityRole="alert" style={styles.textoError}>{errorActualizacion}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reintentar carga" onPress={() => void agenda.refrescar()}>
            <Text style={styles.reintentarEnLinea}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {cargando ? (
        <View style={styles.estadoCentro}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={[styles.textoEstado, { color: colores.textoSecundario }]}>
            {esDetalle ? 'Cargando evento…' : 'Cargando agenda…'}
          </Text>
        </View>
      ) : errorCarga ? (
        <View style={styles.estadoCentro}>
          <Ionicons name="cloud-offline-outline" size={42} color={colores.textoSecundario} />
          <Text style={[styles.tituloEstado, { color: colores.textoPrincipal }]}>
            {esDetalle ? 'No se pudo cargar el evento' : 'No se pudo cargar la agenda'}
          </Text>
          <Text style={[styles.textoEstado, { color: colores.textoSecundario }]}>{errorCarga}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => void alReintentar()} style={styles.botonReintentar}>
            <Ionicons name="refresh" size={17} color="#fff" />
            <Text style={styles.textoReintentar}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={() => void alRefrescar()}
              colors={['#0284c7']}
              tintColor="#0284c7"
            />
          }
        >
          {!eventoDetalle && (
            <Text style={[styles.encuentros, { color: colores.textoPrincipal }]}>
              {eventosVisibles.length ? 'Eventos del día' : 'Sin eventos este día'}
            </Text>
          )}
          {eventosVisibles.map((evento) => renderEvento(evento))}
          {eventosVisibles.length === 0 && agenda.eventos.length === 0 && (
            <Text style={[styles.sinEventos, { color: colores.textoSecundario }]}>
              No hay eventos publicados por el momento.
            </Text>
          )}

          {!eventoDetalle && agenda.eventos.length > 0 && (
            <>
              <Text style={[styles.encuentros, { color: colores.textoPrincipal, marginTop: 18 }]}>Próximos eventos</Text>
              {proximosVisibles.length === 0 && (
                <Text style={[styles.sinEventos, { color: colores.textoSecundario }]}>No hay eventos próximos publicados.</Text>
              )}
              {proximosVisibles.map((evento) => renderEvento(evento, 'proximo-'))}
            </>
          )}

          {eventoDetalle && (
            <TouchableOpacity accessibilityRole="button" onPress={() => router.replace('/agenda-eventos')} style={styles.volverAgenda}>
              <Ionicons name="calendar-outline" size={17} color="#0284c7" />
              <Text style={styles.volverTexto}>Volver a la agenda</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
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
  reintentarEnLinea: { fontSize: 12, color: '#0284c7', fontWeight: '700' },
  estadoCentro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 80, gap: 10 },
  tituloEstado: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  textoEstado: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  botonReintentar: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 6, backgroundColor: '#0284c7' },
  textoReintentar: { color: '#fff', fontSize: 13, fontWeight: '700' },
  lista: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 112, flexGrow: 1 },
  encuentros: { fontSize: 14, fontWeight: '800', marginBottom: 11, textTransform: 'capitalize' },
  sinEventos: { fontSize: 12, marginBottom: 11 },
  volverAgenda: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 5 },
  volverTexto: { color: '#0284c7', fontSize: 13, fontWeight: '700' },
});
