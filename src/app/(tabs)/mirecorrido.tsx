import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EscanerQRModal from '../componentes/EscanerQRModal';
import {
  obtenerVisitasLocales,
  guardarVisitaLocal,
  registrarVisitaAPI,
  sincronizarVisitasPendientes,
  actualizarVisitaAPI,
  actualizarVisitaLocal,
} from '../../servicios/visitas';
import { tomarFotoVisita } from '../../servicios/camara';
import { Visita } from '../../tipos/visitas';

// 🎨 Hook del Tema Global
import { useTema } from '../../contexto/TemaContext';

export default function RecorridoPantalla() {
  const temaContext = useTema();
  // 🟢 Casteo seguro para evitar subrayados rojos en VS Code si faltan tipos en la interfaz
  const c = (temaContext as any)?.colores || {};
  const esOscuro = (temaContext as any)?.esOscuro || false;

  // 🛡️ Variables de color con fallbacks automáticos sin errores de TypeScript
  const colorFondo = c.fondo || (esOscuro ? '#121212' : '#F2F2F7');
  const colorTarjetaFondo = c.tarjetaFondo || c.tarjeta || (esOscuro ? '#1C1C1E' : '#FFFFFF');
  const colorTarjetaBorde = c.tarjetaBorde || c.borde || (esOscuro ? '#334155' : '#E5E5EA');
  const colorTextoPrincipal = c.textoPrincipal || c.texto || (esOscuro ? '#FFFFFF' : '#1C1C1E');
  const colorTextoSecundario = c.textoSecundario || c.subtexto || (esOscuro ? '#94A3B8' : '#6C757D');
  const colorPrimario = c.primario || '#007AFF';

  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [modalQRVisible, setModalQRVisible] = useState<boolean>(false);

  // Estados para modal de editar nota/foto
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<Visita | null>(null);
  const [notaTexto, setNotaTexto] = useState<string>('');
  const [fotoUriLocal, setFotoUriLocal] = useState<string | null>(null);

  // 1. Cargar las visitas locales al entrar
  const cargarVisitas = useCallback(async () => {
    setCargando(true);
    await sincronizarVisitasPendientes();
    const lista = await obtenerVisitasLocales();
    setVisitas(lista);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargarVisitas();
  }, [cargarVisitas]);

  // 2. Procesar el código QR escaneado ('COLON:<id_lugar>')
  const handleCodigoEscaneado = async (codigo: string) => {
    setModalQRVisible(false);

    const lugarId = codigo.replace('COLON:', '');
    const nuevaVisita: Visita = {
      id: `vis-${Date.now()}`,
      lugarId: lugarId,
      fechaHora: new Date().toISOString(),
      origen: 'qr',
      sincronizada: false,
    };

    await guardarVisitaLocal(nuevaVisita);

    const respuestaAPI = await registrarVisitaAPI({
      lugarId: nuevaVisita.lugarId,
      origen: 'qr',
    });

    if (respuestaAPI) {
      Alert.alert('¡Visita registrada!', 'Tu presencia fue registrada con éxito.');
    } else {
      Alert.alert(
        'Guardado en el teléfono',
        'Tu visita se guardó localmente y se subirá al servidor cuando recuperes la conexión.'
      );
    }

    cargarVisitas();
  };

  // 3. Tomar foto desde la cámara del teléfono
  const handleTomarFoto = async () => {
    const uri = await tomarFotoVisita();
    if (uri) {
      setFotoUriLocal(uri);
    }
  };

  // 4. Guardar la foto y la nota
  const handleGuardarNotaYFoto = async () => {
    if (!visitaSeleccionada) return;

    await actualizarVisitaLocal(visitaSeleccionada.id, {
      nota: notaTexto,
      fotoUri: fotoUriLocal,
    });

    await actualizarVisitaAPI(visitaSeleccionada.id, {
      nota: notaTexto,
      fotoUri: fotoUriLocal ?? undefined,
    });

    setVisitaSeleccionada(null);
    setNotaTexto('');
    setFotoUriLocal(null);
    await cargarVisitas();
  };

  const abrirModalEdicion = (item: Visita) => {
    setVisitaSeleccionada(item);
    setNotaTexto(item.nota || '');
    setFotoUriLocal(item.fotoUri || null);
  };

  const renderItemVisita = ({ item }: { item: Visita }) => {
    const fecha = new Date(item.fechaHora).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View
        style={[
          styles.tarjeta,
          {
            backgroundColor: colorTarjetaFondo,
            borderColor: colorTarjetaBorde,
          },
        ]}
      >
        <View style={styles.tarjetaEncabezado}>
          <View style={styles.filoLugar}>
            <Ionicons name="location-sharp" size={20} color={colorPrimario} />
            <Text style={[styles.tituloLugar, { color: colorTextoPrincipal }]}>
              Lugar ID: {item.lugarId}
            </Text>
          </View>
          <Text style={[styles.fechaText, { color: colorTextoSecundario }]}>
            {fecha}
          </Text>
        </View>

        <View style={styles.infoOrigenRow}>
          <Text style={[styles.etiquetaOrigen, { color: colorTextoSecundario }]}>
            Origen: <Text style={styles.bold}>{item.origen.toUpperCase()}</Text>
          </Text>

          {item.sincronizada ? (
            <View style={styles.badgeSinc}>
              <Ionicons name="checkmark-circle" size={14} color="#28A745" />
              <Text style={styles.textoSincOk}>Sincronizado</Text>
            </View>
          ) : (
            <View style={styles.badgePend}>
              <Ionicons name="cloud-offline" size={14} color="#FF9500" />
              <Text style={styles.textoSincPend}>En teléfono</Text>
            </View>
          )}
        </View>

        {item.fotoUri ? (
          <Image source={{ uri: item.fotoUri }} style={styles.imagenVisita} />
        ) : null}

        {item.nota ? (
          <TouchableOpacity onPress={() => abrirModalEdicion(item)}>
            <Text
              style={[
                styles.notaTexto,
                {
                  color: colorTextoPrincipal,
                  backgroundColor: colorFondo,
                },
              ]}
            >
              "{item.nota}"
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.botonNota}
            onPress={() => abrirModalEdicion(item)}
          >
            <Ionicons name="create-outline" size={16} color={colorPrimario} />
            <Text style={[styles.botonNotaTexto, { color: colorPrimario }]}>
              Agregar nota / foto recuerdo
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colorFondo }]}>
      {/* Botón Principal: Escanear QR del Cartel */}
      <View
        style={[
          styles.seccionEscanear,
          {
            backgroundColor: colorTarjetaFondo,
            borderBottomColor: colorTarjetaBorde,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.botonQR, { backgroundColor: colorPrimario }]}
          onPress={() => setModalQRVisible(true)}
        >
          <Ionicons name="qr-code" size={24} color="#FFF" />
          <Text style={styles.textoBotonQR}>Escanear QR de Atractivo</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Visitas / Recorrido */}
      {cargando ? (
        <ActivityIndicator size="large" color={colorPrimario} style={styles.loader} />
      ) : visitas.length === 0 ? (
        <View style={styles.vacioContainer}>
          <Ionicons name="map-outline" size={64} color={colorTextoSecundario} />
          <Text style={[styles.vacioTitulo, { color: colorTextoPrincipal }]}>
            Aún no registraste visitas
          </Text>
          <Text style={[styles.vacioSub, { color: colorTextoSecundario }]}>
            Escaneá el código QR en los carteles de los atractivos para registrar tu paso por Colón.
          </Text>
        </View>
      ) : (
        <FlatList
          data={visitas}
          keyExtractor={(item) => item.id}
          renderItem={renderItemVisita}
          contentContainerStyle={styles.listaPadding}
          onRefresh={cargarVisitas}
          refreshing={cargando}
        />
      )}

      {/* Modal para Escaneo QR */}
      <EscanerQRModal
        visible={modalQRVisible}
        onCerrar={() => setModalQRVisible(false)}
        onCodigoEscaneado={handleCodigoEscaneado}
      />

      {/* Modal para Agregar/Editar Nota y Foto */}
      <Modal visible={!!visitaSeleccionada} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContenido, { backgroundColor: colorTarjetaFondo }]}>
            <Text style={[styles.modalTitulo, { color: colorTextoPrincipal }]}>
              Recuerdo de la Visita
            </Text>

            {fotoUriLocal ? (
              <Image source={{ uri: fotoUriLocal }} style={styles.previewFotoModal} />
            ) : null}

            <TouchableOpacity style={styles.btnCamara} onPress={handleTomarFoto}>
              <Ionicons name="camera" size={20} color="#FFF" />
              <Text style={styles.btnCamaraTexto}>
                {fotoUriLocal ? 'Cambiar Foto' : 'Tomar Foto del Lugar'}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={[
                styles.inputNota,
                {
                  backgroundColor: colorFondo,
                  color: colorTextoPrincipal,
                },
              ]}
              placeholder="¿Qué te pareció el lugar? (Escribí una nota corta)"
              placeholderTextColor={colorTextoSecundario}
              multiline
              numberOfLines={3}
              value={notaTexto}
              onChangeText={setNotaTexto}
            />

            <View style={styles.modalAcciones}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => {
                  setVisitaSeleccionada(null);
                  setFotoUriLocal(null);
                }}
              >
                <Text style={styles.btnTextoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnGuardar, { backgroundColor: colorPrimario }]}
                onPress={handleGuardarNotaYFoto}
              >
                <Text style={styles.btnTextoGuardar}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  seccionEscanear: { padding: 16, borderBottomWidth: 1 },
  botonQR: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 10 },
  textoBotonQR: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  loader: { marginTop: 40 },
  listaPadding: { padding: 16 },
  tarjeta: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  tarjetaEncabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  filoLugar: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tituloLugar: { fontSize: 16, fontWeight: 'bold' },
  fechaText: { fontSize: 12 },
  infoOrigenRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  etiquetaOrigen: { fontSize: 13 },
  bold: { fontWeight: 'bold' },
  badgeSinc: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  textoSincOk: { fontSize: 12, color: '#28A745', fontWeight: '600' },
  badgePend: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  textoSincPend: { fontSize: 12, color: '#FF9500', fontWeight: '600' },
  imagenVisita: { width: '100%', height: 160, borderRadius: 8, marginTop: 8 },
  notaTexto: { marginTop: 8, fontSize: 14, fontStyle: 'italic', padding: 10, borderRadius: 8 },
  botonNota: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  botonNotaTexto: { fontSize: 13, fontWeight: '500' },
  vacioContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  vacioTitulo: { fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  vacioSub: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContenido: { width: '100%', borderRadius: 16, padding: 20 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  previewFotoModal: { width: '100%', height: 140, borderRadius: 8, marginBottom: 12 },
  btnCamara: { backgroundColor: '#34C759', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 8, marginBottom: 12 },
  btnCamaraTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  inputNota: { borderRadius: 8, padding: 12, fontSize: 15, height: 80, textAlignVertical: 'top', marginBottom: 16 },
  modalAcciones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  btnCancelar: { paddingVertical: 10, paddingHorizontal: 16 },
  btnTextoCancelar: { color: '#FF3B30', fontSize: 15, fontWeight: '600' },
  btnGuardar: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  btnTextoGuardar: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});