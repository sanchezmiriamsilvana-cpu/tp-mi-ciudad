import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTema } from '../../../contexto/TemaContext';
import { Audioguia, etiquetaTipo } from '../data/audioguias';
import { ProgresoDescarga } from '../services/downloadService';

interface PropsAudioguiaCard {
  guia: Audioguia;
  descargada: boolean;
  progreso?: ProgresoDescarga;
  ocupada: boolean;
  alDescargar: () => void;
  alEliminar: () => void;
  alReproducir: () => void;
}

function formatoDuracion(duracion: number | null): string {
  if (!duracion || duracion <= 0) return 'Duración pendiente';
  const horas = Math.floor(duracion / 3600);
  const minutos = Math.floor((duracion % 3600) / 60);
  const segundos = Math.floor(duracion % 60);

  if (horas > 0) return `${horas} h ${minutos} min`;
  return minutos > 0 ? `${minutos} min ${segundos} s` : `${segundos} s`;
}

export default function AudioguiaCard({
  guia,
  descargada,
  progreso,
  ocupada,
  alDescargar,
  alEliminar,
  alReproducir,
}: PropsAudioguiaCard) {
  const { colores } = useTema();
  const porcentaje = progreso?.porcentaje;
  const disponible = descargada || Boolean(guia.audioUrl);
  const textoEstado = descargada
    ? 'Descargada'
    : progreso
      ? 'Descargando'
      : guia.audioUrl
        ? 'Descargar'
        : 'Sin audio en la API';
  const colorEstado = descargada ? '#16835d' : '#c58b25';

  return (
    <View style={[styles.tarjeta, { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde }]}>
      <View style={styles.portada}>
        {guia.imagen ? (
          <Image source={{ uri: guia.imagen }} style={styles.portadaImagen} resizeMode="cover" />
        ) : (
          <Ionicons name="headset-outline" size={24} color="#0284c7" />
        )}
      </View>

      <View style={styles.detalle}>
        <View style={styles.filaTitulo}>
          <Text style={[styles.titulo, { color: colores.textoPrincipal }]} numberOfLines={2}>
            {guia.titulo}
          </Text>
          <View style={[styles.etiqueta, { backgroundColor: colores.tarjetaBorde }]}>
            <Text style={[styles.textoEtiqueta, { color: colores.textoSecundario }]}>
              {etiquetaTipo(guia.tipo)}
            </Text>
          </View>
        </View>

        {guia.autor ? (
          <Text style={[styles.autor, { color: colores.textoSecundario }]} numberOfLines={1}>
            Narrado por {guia.autor}
          </Text>
        ) : null}

        <Text style={[styles.descripcion, { color: colores.textoSecundario }]} numberOfLines={3}>
          {guia.descripcion}
        </Text>

        <View style={styles.filaEstado}>
          <Text style={[styles.duracion, { color: colores.textoSecundario }]}>{formatoDuracion(guia.duracion)}</Text>
          <View style={[styles.estadoPunto, { backgroundColor: colorEstado }]} />
          <Text style={[styles.estado, { color: colorEstado }]}>{textoEstado}</Text>
        </View>

        {progreso && (
          <View style={styles.progresoZona}>
            <View style={styles.fondoProgreso}>
              {porcentaje !== null && porcentaje !== undefined && (
                <View style={[styles.progreso, { width: `${porcentaje}%` }]} />
              )}
            </View>
            <Text style={[styles.textoProgreso, { color: colores.textoSecundario }]}>
              {porcentaje === null || porcentaje === undefined ? 'Recibiendo audio…' : `${Math.round(porcentaje)}%`}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.acciones}>
        {ocupada ? (
          <ActivityIndicator size="small" color="#0284c7" />
        ) : (
          <>
            {disponible && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Reproducir ${guia.titulo}`}
                onPress={alReproducir}
                style={styles.botonIcono}
              >
                <Ionicons name="play-circle" size={30} color="#0284c7" />
              </TouchableOpacity>
            )}
            {descargada ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Eliminar descarga de ${guia.titulo}`}
                onPress={alEliminar}
                style={styles.botonIcono}
              >
                <Ionicons name="trash-outline" size={19} color={colores.textoSecundario} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Descargar ${guia.titulo}`}
                disabled={!guia.audioUrl}
                onPress={alDescargar}
                style={[styles.botonDescarga, !guia.audioUrl && styles.botonInactivo]}
              >
                <Ionicons
                  name="download-outline"
                  size={19}
                  color={guia.audioUrl ? '#0284c7' : colores.textoSecundario}
                />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 9 },
  portada: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#e7f4fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    overflow: 'hidden',
  },
  portadaImagen: { width: '100%', height: '100%' },
  detalle: { flex: 1, minWidth: 0 },
  filaTitulo: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  titulo: { flex: 1, fontSize: 15, fontWeight: '700' },
  etiqueta: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, marginTop: 1 },
  textoEtiqueta: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  autor: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  descripcion: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  filaEstado: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  duracion: { fontSize: 11 },
  estadoPunto: { width: 6, height: 6, borderRadius: 3, marginLeft: 2 },
  estado: { fontSize: 11, fontWeight: '700' },
  progresoZona: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  fondoProgreso: { height: 4, flex: 1, backgroundColor: '#dce5e9', borderRadius: 2, overflow: 'hidden' },
  progreso: { height: '100%', backgroundColor: '#0284c7' },
  textoProgreso: { fontSize: 10, minWidth: 32, textAlign: 'right' },
  acciones: { alignItems: 'center', justifyContent: 'center', gap: 2, minWidth: 36, minHeight: 40, marginLeft: 5 },
  botonIcono: { minWidth: 36, minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  botonDescarga: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  botonInactivo: { opacity: 0.45 },
});
