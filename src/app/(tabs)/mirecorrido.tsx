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
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
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
import { useTema } from '../../contexto/TemaContext';

export default function RecorridoPantalla() {
  const { colores } = useTema();

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
    // Intentamos sincronizar con la API si hay red
    await sincronizarVisitasPendientes();
    // Obtenemos la lista guardada en la BD SQLite local
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

    // Guardar siempre localmente primero (garantiza funcionamiento Offline)
    await guardarVisitaLocal(nuevaVisita);

    // Intentar registrar en el backend NestJS
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

  // 4. Guardar la foto y la nota (en SQLite local y en API)
  const handleGuardarNotaYFoto = async () => {
    if (!visitaSeleccionada) return;

    // Guardar primero en el teléfono (SQLite)
    await actualizarVisitaLocal(visitaSeleccionada.id, {
      nota: notaTexto,
      fotoUri: fotoUriLocal,
    });

    // Intentar enviar al servidor NestJS si hay señal
    await actualizarVisitaAPI(visitaSeleccionada.id, {
      nota: notaTexto,
      fotoUri: fotoUriLocal ?? undefined,
    });

    // Resetear estados del modal y recargar lista
    setVisitaSeleccionada(null);
    setNotaTexto('');
    setFotoUriLocal(null);
    await cargarVisitas();
  };

  // Abrir modal de edición
  const abrirModalEdicion = (item: Visita) => {
    setVisitaSeleccionada(item);
    setNotaTexto(item.nota || '');
    setFotoUriLocal(item.fotoUri || null);
  };

  // Renderizador de cada tarjeta de visita en la lista
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
          { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde },
        ]}
      >
        <View style={styles.tarjetaEncabezado}>
          <View style={styles.filoLugar}>
            <Ionicons name="location-sharp" size={20} color="#0284c7" />
            <Text style={[styles.tituloLugar, { color: colores.textoPrincipal }]}>
              Lugar ID: {item.lugarId}
            </Text>
          </View>
          <Text style={[styles.fechaText, { color: colores.textoSecundario }]}>{fecha}</Text>
        </View>

        <View style={styles.infoOrigenRow}>
          <Text style={[styles.etiquetaOrigen, { color: colores.textoSecundario }]}>
            Origen: <Text style={[styles.bold, { color: colores.textoPrincipal }]}>{item.origen.toUpperCase()}</Text>
          </Text>

          {/* Indicador de Sincronización */}
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

        {/* Muestra la foto adjunta si existe */}
        {item.fotoUri ? (
          <Image source={{ uri: item.fotoUri }} style={styles.imagenVisita} resizeMode="cover" />
        ) : null}

        {/* Muestra la nota o el botón para agregar una */}
        {item.nota ? (
          <TouchableOpacity onPress={() => abrirModalEdicion(item)}>
            <Text
              style={[
                styles.notaTexto,
                { color: colores.textoSecundario, backgroundColor: colores.fondo },
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
            <Ionicons name="create-outline" size={16} color="#0284c7" />
            <Text style={styles.botonNotaTexto}>Agregar nota / foto recuerdo</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: colores.fondo }]}>
        {/* Botón Principal: Escanear QR del Cartel */}
        <View
          style={[
            styles.seccionEscanear,
            { backgroundColor: colores.tarjetaFondo, borderBottomColor: colores.tarjetaBorde },
          ]}
        >
          <TouchableOpacity
            style={styles.botonQR}
            onPress={() => setModalQRVisible(true)}
          >
            <Ionicons name="qr-code" size={24} color="#FFF" />
            <Text style={styles.textoBotonQR}>Escanear QR de Atractivo</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Visitas / Recorrido */}
        {cargando ? (
          <ActivityIndicator size="large" color="#0284c7" style={styles.loader} />
        ) : visitas.length === 0 ? (
          <View style={styles.vacioContainer}>
            <Ionicons name="map-outline" size={64} color={colores.textoSecundario} />
            <Text style={[styles.vacioTitulo, { color: colores.textoPrincipal }]}>
              Aún no registraste visitas
            </Text>
            <Text style={[styles.vacioSub, { color: colores.textoSecundario }]}>
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
            <View
              style={[
                styles.modalContenido,
                { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde },
              ]}
            >
              <Text style={[styles.modalTitulo, { color: colores.textoPrincipal }]}>
                Recuerdo de la Visita
              </Text>

              {/* Previsualización de la Foto */}
              {fotoUriLocal ? (
                <Image source={{ uri: fotoUriLocal }} style={styles.previewFotoModal} resizeMode="cover" />
              ) : null}

              {/* Botón Tomar Foto */}
              <TouchableOpacity style={styles.btnCamara} onPress={handleTomarFoto}>
                <Ionicons name="camera" size={20} color="#FFF" />
                <Text style={styles.btnCamaraTexto}>
                  {fotoUriLocal ? 'Cambiar Foto' : 'Tomar Foto del Lugar'}
                </Text>
              </TouchableOpacity>

              <TextInput
                style={[
                  styles.inputNota,
                  { backgroundColor: colores.fondo, color: colores.textoPrincipal },
                ]}
                placeholder="¿Qué te pareció el lugar? (Escribí una nota corta)"
                placeholderTextColor={colores.textoSecundario}
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
                <TouchableOpacity style={styles.btnGuardar} onPress={handleGuardarNotaYFoto}>
                  <Text style={styles.btnTextoGuardar}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  seccionEscanear: { padding: 16, borderBottomWidth: 1 },
  botonQR: { backgroundColor: '#0284c7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 10 },
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
  botonNotaTexto: { color: '#0284c7', fontSize: 13, fontWeight: '500' },
  vacioContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  vacioTitulo: { fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  vacioSub: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContenido: { width: '100%', borderRadius: 16, padding: 20, borderWidth: 1 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  previewFotoModal: { width: '100%', height: 140, borderRadius: 8, marginBottom: 12 },
  btnCamara: { backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 8, marginBottom: 12 },
  btnCamaraTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  inputNota: { borderRadius: 8, padding: 12, fontSize: 15, height: 80, textAlignVertical: 'top', marginBottom: 16 },
  modalAcciones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  btnCancelar: { paddingVertical: 10, paddingHorizontal: 16 },
  btnTextoCancelar: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
  btnGuardar: { backgroundColor: '#0284c7', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  btnTextoGuardar: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});