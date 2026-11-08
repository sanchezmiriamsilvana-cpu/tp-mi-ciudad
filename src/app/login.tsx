import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router, Link } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useTema } from '../contexto/TemaContext';

// Servicios de autenticación conectados a la API real
import {
  iniciarSesion,
  obtenerToken,
  guardarToken,
  borrarToken,
  autenticarConBiometria,
  guardarUsuario,
  obtenerUsuario,
  Usuario,
} from '../servicios/autenticacion';

const loginSchema = z.object({
  email: z.string().email('Ingresá un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPantalla() {
  const temaContext = useTema();
  const c = (temaContext as any)?.colores || {};
  const esOscuro = (temaContext as any)?.esOscuro || false;

  const colorFondo = c.fondo || (esOscuro ? '#121212' : '#FFFFFF');
  const colorTarjetaFondo = c.tarjetaFondo || c.tarjeta || (esOscuro ? '#1C1C1E' : '#F9FAFB');
  const colorTarjetaBorde = c.tarjetaBorde || c.borde || (esOscuro ? '#334155' : '#E2E8F0');
  const colorTextoPrincipal = c.textoPrincipal || c.texto || (esOscuro ? '#FFFFFF' : '#1C1C1E');
  const colorTextoSecundario = c.textoSecundario || c.subtexto || (esOscuro ? '#94A3B8' : '#64748B');
  const colorPrimario = c.primario || '#0284c7';

  const [cargando, setCargando] = useState<boolean>(true);
  const [enviando, setEnviando] = useState<boolean>(false);
  const [haySesion, setHaySesion] = useState<boolean>(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    verificarSesion();
  }, []);

  const verificarSesion = async () => {
    try {
      const token = await obtenerToken();
      let datosUsuario = await obtenerUsuario();

      if (!datosUsuario) {
        const userRaw = await SecureStore.getItemAsync('usuario_guardado');
        if (userRaw) datosUsuario = JSON.parse(userRaw);
      }

      if (token && datosUsuario) {
        setHaySesion(true);
        setUsuario(datosUsuario);
      } else {
        setHaySesion(false);
      }
    } catch (error) {
      console.error('Error verificando sesión:', error);
    } finally {
      setCargando(false);
    }
  };

  // 🔑 1. Enviar credenciales a la API real y guardar el token para biometría futura
  const onSubmit = async (data: LoginFormData) => {
    setEnviando(true);
    try {
      const emailLimpio = data.email.trim().toLowerCase();
      const resultado = await iniciarSesion(emailLimpio, data.password);

      if (resultado.exito && resultado.datos) {
        setHaySesion(true);
        setUsuario(resultado.datos.usuario);

        // 🟢 Guardamos el usuario activo
        await guardarUsuario(resultado.datos.usuario);
        await SecureStore.setItemAsync(
          'usuario_guardado',
          JSON.stringify(resultado.datos.usuario)
        );

        // 🟢 Resguardamos el token real de la API para habilitar la biometría posterior
        const tokenObtenido = await obtenerToken();
        const tokenReal = resultado.datos.token || tokenObtenido;
        if (tokenReal) {
          await SecureStore.setItemAsync('token_guardado', tokenReal);
        }

        // 🟢 Verificamos disponibilidad de biometría en el dispositivo
        const tieneHardware = await LocalAuthentication.hasHardwareAsync();
        const estaInscripto = await LocalAuthentication.isEnrolledAsync();

        if (tieneHardware && estaInscripto) {
          Alert.alert(
            '¡Bienvenido/a!',
            '¿Querés activar el ingreso rápido con biometría (huella/rostro) para las próximas sesiones?',
            [
              {
                text: 'No por ahora',
                style: 'cancel',
                onPress: async () => {
                  await SecureStore.setItemAsync('biometria_activada', 'false');
                  router.replace('/perfil');
                },
              },
              {
                text: 'Sí, activar',
                onPress: async () => {
                  await SecureStore.setItemAsync('biometria_activada', 'true');
                  router.replace('/perfil');
                },
              },
            ]
          );
        } else {
          router.replace('/perfil');
        }
      } else {
        Alert.alert('Error', resultado.mensaje || 'Credenciales incorrectas');
      }
    } catch (error) {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
    } finally {
      setEnviando(false);
    }
  };

  // 🔐 2. Ingresar con Biometría usando el token REAL y usuario guardados
  const handleProbarBiometria = async () => {
    try {
      const activada = await SecureStore.getItemAsync('biometria_activada');
      const userRaw = await SecureStore.getItemAsync('usuario_guardado');
      const tokenGuardado = await SecureStore.getItemAsync('token_guardado');

      // Validamos que la biometría esté activada y existan el token real y el usuario guardados
      if (activada !== 'true' || !userRaw || !tokenGuardado) {
        Alert.alert(
          'Atención',
          'Iniciá sesión con correo y contraseña al menos una vez y elegí activar la biometría.'
        );
        return;
      }

      const usuarioValido = JSON.parse(userRaw);

      // Solicitamos la autenticación biométrica al sistema operativo del celular
      const exito = await autenticarConBiometria();
      if (exito) {
        // 🟢 Restauramos el token REAL devuelto por el servidor en la sesión activa
        await guardarToken(tokenGuardado);
        await guardarUsuario(usuarioValido);

        setHaySesion(true);
        setUsuario(usuarioValido);
        Alert.alert('¡Bienvenido/a!', `Ingreso biométrico exitoso. Hola ${usuarioValido.nombre}`);
        router.replace('/perfil');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo autenticar con biometría.');
    }
  };

  const handleCerrarSesion = async () => {
    await borrarToken();
    setHaySesion(false);
    setUsuario(null);
    Alert.alert('Sesión cerrada', 'Has cerrado sesión correctamente');
  };

  if (cargando) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colorFondo }]}>
        <ActivityIndicator size="large" color={colorPrimario} />
      </View>
    );
  }

  // Vista cuando la sesión SÍ está activa
  if (haySesion) {
    return (
      <View style={[styles.container, { backgroundColor: colorFondo }]}>
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colorTarjetaFondo, borderColor: colorTarjetaBorde },
          ]}
        >
          <Text style={styles.avatar}>👤</Text>
          <Text style={[styles.titulo, { color: colorTextoPrincipal }]}>
            ¡Hola, {usuario?.nombre || 'Turista'}!
          </Text>
          <Text style={[styles.emailText, { color: colorTextoSecundario }]}>
            {usuario?.email || ''}
          </Text>
          <Text style={styles.statusBadge}>✓ Sesión Activa</Text>
        </View>

        <Pressable
          style={[styles.botonIngresar, { backgroundColor: colorPrimario }]}
          onPress={() => router.replace('/perfil')}
        >
          <Text style={styles.botonTexto}>Ir a Mi Perfil y Configuración</Text>
        </Pressable>

        <Pressable style={styles.botonCerrar} onPress={handleCerrarSesion}>
          <Text style={styles.botonTextoCerrar}>Cerrar Sesión</Text>
        </Pressable>
      </View>
    );
  }

  // Formulario de ingreso cuando NO hay sesión
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colorFondo }}
    >
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colorFondo }]}>
        <Text style={[styles.titulo, { color: colorTextoPrincipal }]}>
          Iniciar Sesión
        </Text>
        <Text style={[styles.subtitulo, { color: colorTextoSecundario }]}>
          Ingresá a tu cuenta para guardar tus favoritos de Colón
        </Text>

        {/* Campo Email */}
        <Text style={[styles.label, { color: colorTextoPrincipal }]}>
          Correo electrónico
        </Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colorTarjetaFondo,
                  borderColor: errors.email ? '#ef4444' : colorTarjetaBorde,
                  color: colorTextoPrincipal,
                },
              ]}
              placeholder="nombre@mail.com"
              placeholderTextColor={colorTextoSecundario}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
        />
        {errors.email && (
          <Text style={styles.errorText}>{errors.email.message}</Text>
        )}

        {/* Campo Contraseña */}
        <Text style={[styles.label, { color: colorTextoPrincipal }]}>
          Contraseña
        </Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colorTarjetaFondo,
                  borderColor: errors.password ? '#ef4444' : colorTarjetaBorde,
                  color: colorTextoPrincipal,
                },
              ]}
              placeholder="******"
              placeholderTextColor={colorTextoSecundario}
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.password && (
          <Text style={styles.errorText}>{errors.password.message}</Text>
        )}

        {/* Botón de Iniciar Sesión */}
        <TouchableOpacity
          style={[styles.botonIngresar, { backgroundColor: colorPrimario }]}
          onPress={handleSubmit(onSubmit)}
          disabled={enviando}
        >
          {enviando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.botonTexto}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>

        {/* Botón Biometría */}
        <TouchableOpacity style={styles.botonBiometria} onPress={handleProbarBiometria}>
          <Text style={[styles.textoBiometria, { color: colorPrimario }]}>
            🔐 Ingresar con Huella / Rostro
          </Text>
        </TouchableOpacity>

        {/* Link a Registro */}
        <View style={styles.contenedorFooter}>
          <Text style={{ color: colorTextoSecundario }}>
            ¿No tenés una cuenta?{' '}
          </Text>
          <Link href="/registro" asChild>
            <TouchableOpacity>
              <Text style={[styles.link, { color: colorPrimario }]}>
                Registrate acá
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 20,
    paddingTop: 40,
    flexGrow: 1,
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 15,
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  botonIngresar: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  botonTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botonBiometria: {
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  textoBiometria: {
    fontSize: 15,
    fontWeight: '600',
  },
  contenedorFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  link: {
    fontWeight: 'bold',
  },
  profileCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    fontSize: 48,
    marginBottom: 10,
  },
  emailText: {
    fontSize: 14,
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  botonCerrar: {
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  botonTextoCerrar: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
});
