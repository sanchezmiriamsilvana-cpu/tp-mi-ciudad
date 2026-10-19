import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
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
import { router } from 'expo-router';
import { useTema } from '../contexto/TemaContext';

// Servicios de autenticación
import {
  guardarToken,
  obtenerToken,
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
  const { colores, esOscuro } = useTema();

  const [cargando, setCargando] = useState<boolean>(true);
  const [haySesion, setHaySesion] = useState<boolean>(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Al abrir la pantalla, verificamos si ya hay un token en SecureStore
  useEffect(() => {
    verificarSesion();
  }, []);

  const verificarSesion = async () => {
    try {
      const token = await obtenerToken();
      const datosUsuario = await obtenerUsuario();

      if (token) {
        setHaySesion(true);
        setUsuario(datosUsuario || { nombre: 'Turista', email: 'turista@colon.gob.ar' });
      } else {
        setHaySesion(false);
      }
    } catch (error) {
      console.error('Error verificando sesión:', error);
    } finally {
      setCargando(false);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    const usuarioGuardado = await obtenerUsuario();

    // Verificamos si coincide el email Y la contraseña
    const esUsuarioRegistrado =
      usuarioGuardado &&
      data.email.toLowerCase() === usuarioGuardado.email.toLowerCase() &&
      (!usuarioGuardado.password || data.password === usuarioGuardado.password);

    const esCuentaDemo =
      data.email === 'turista@colon.gob.ar' && data.password === '123456';

    if (esUsuarioRegistrado || esCuentaDemo) {
      const nombreSesion = esUsuarioRegistrado
        ? usuarioGuardado.nombre
        : 'Turista en Colón';
      const emailSesion = esUsuarioRegistrado
        ? usuarioGuardado.email
        : 'turista@colon.gob.ar';

      await guardarToken(`mock_jwt_token_${Date.now()}`);
      await guardarUsuario({ nombre: nombreSesion, email: emailSesion });

      setHaySesion(true);
      setUsuario({ nombre: nombreSesion, email: emailSesion });

      Alert.alert('¡Bienvenido/a!', `Sesión iniciada como ${nombreSesion}`);
      router.replace('/perfil');
    } else {
      Alert.alert(
        'Error',
        'Credenciales incorrectas. Usá turista@colon.gob.ar / 123456'
      );
    }
  };

  const handleProbarBiometria = async () => {
    const exito = await autenticarConBiometria();
    if (exito) {
      await guardarToken('mock_jwt_token_12345');
      const datosUsuario = await obtenerUsuario();
      setHaySesion(true);
      setUsuario(datosUsuario || { nombre: 'Turista', email: 'turista@colon.gob.ar' });
      router.replace('/perfil');
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
      <View style={[styles.centerContainer, { backgroundColor: colores.fondo }]}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  // 👤 Vista cuando la sesión SÍ está activa
  if (haySesion) {
    return (
      <View style={[styles.container, { backgroundColor: colores.fondo }]}>
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colores.tarjetaFondo, borderColor: colores.tarjetaBorde },
          ]}
        >
          <Text style={styles.avatar}>👤</Text>
          <Text style={[styles.titulo, { color: colores.textoPrincipal }]}>
            ¡Hola, {usuario?.nombre || 'Turista'}!
          </Text>
          <Text style={[styles.emailText, { color: colores.textoSecundario }]}>
            {usuario?.email || 'turista@colon.gob.ar'}
          </Text>
          <Text style={styles.statusBadge}>✓ Sesión Activa</Text>
        </View>

        {/* Botón para ir a tu perfil */}
        <Pressable style={styles.botonIngresar} onPress={() => router.replace('/perfil')}>
          <Text style={styles.botonTexto}>Ir a Mi Perfil y Configuración</Text>
        </Pressable>

        <Pressable style={styles.botonCerrar} onPress={handleCerrarSesion}>
          <Text style={styles.botonTextoCerrar}>Cerrar Sesión</Text>
        </Pressable>
      </View>
    );
  }

  // 🔑 Formulario de ingreso cuando NO hay sesión
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colores.fondo }}
    >
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colores.fondo }]}>
        <Text style={[styles.titulo, { color: colores.textoPrincipal }]}>
          Iniciar Sesión
        </Text>
        <Text style={[styles.subtitulo, { color: colores.textoSecundario }]}>
          Ingresá a tu cuenta para guardar tus favoritos de Colón
        </Text>

        {/* Campo Email */}
        <Text style={[styles.label, { color: colores.textoPrincipal }]}>
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
                  backgroundColor: colores.tarjetaFondo,
                  borderColor: erroresEmail ? '#ef4444' : colores.tarjetaBorde,
                  color: colores.textoPrincipal,
                },
              ]}
              placeholder="turista@colon.gob.ar"
              placeholderTextColor={colores.textoSecundario}
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
        <Text style={[styles.label, { color: colores.textoPrincipal }]}>
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
                  backgroundColor: colores.tarjetaFondo,
                  borderColor: erroresPass ? '#ef4444' : colores.tarjetaBorde,
                  color: colores.textoPrincipal,
                },
              ]}
              placeholder="••••••"
              placeholderTextColor={colores.textoSecundario}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              secureTextEntry
            />
          )}
        />
        {errors.password && (
          <Text style={styles.errorText}>{errors.password.message}</Text>
        )}

        {/* Botón Iniciar Sesión */}
        <Pressable
          style={styles.botonIngresar}
          onPress={handleSubmit(onSubmit)}
        >
          <Text style={styles.botonTexto}>Ingresar</Text>
        </Pressable>

        {/* Botón Biometría */}
        <Pressable
          style={[
            styles.botonBiometria,
            {
              backgroundColor: colores.tarjetaFondo,
              borderColor: colores.tarjetaBorde,
            },
          ]}
          onPress={handleProbarBiometria}
        >
          <Text
            style={[
              styles.botonTextoBiometria,
              { color: esOscuro ? '#38bdf8' : '#0284c7' },
            ]}
          >
            Ingresar con Huella / Rostro 👆
          </Text>
        </Pressable>

        {/* 🚀 Enlace a Crear Cuenta / Registro */}
        <View style={styles.footerRegistro}>
          <Text style={[styles.textoFooter, { color: colores.textoSecundario }]}>
            ¿No tenés una cuenta?{' '}
          </Text>
          <Pressable onPress={() => router.push('/registro')}>
            <Text
              style={[
                styles.linkRegistro,
                { color: esOscuro ? '#38bdf8' : '#0284c7' },
              ]}
            >
              Crear Cuenta
            </Text>
          </Pressable>
        </View>

        {/* 🚶 Continuar como invitado */}
        <Pressable
          style={{ marginTop: 20, alignItems: 'center', paddingVertical: 10 }}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={{ color: colores.textoSecundario, fontSize: 14, fontWeight: '500' }}>
            ← Continuar explorando como invitado
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Variables auxiliares de validación para los estilos dinámicos de los inputs
const erroresEmail = false;
const erroresPass = false;

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  avatar: {
    fontSize: 48,
    marginBottom: 8,
  },
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 14,
    marginBottom: 20,
  },
  emailText: {
    fontSize: 14,
    marginBottom: 8,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  botonIngresar: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botonBiometria: {
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  botonTextoBiometria: {
    fontSize: 15,
    fontWeight: '600',
  },
  botonCerrar: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  botonTextoCerrar: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: 'bold',
  },
  footerRegistro: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  textoFooter: {
    fontSize: 14,
  },
  linkRegistro: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});