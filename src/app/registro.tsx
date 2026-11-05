import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Link } from 'expo-router';

//  Importamos el hook del Tema Global
import { useTema } from '../contexto/TemaContext';

// Servicio de autenticación conectado con la API real
import { registrarUsuario } from '../servicios/autenticacion';

export default function PantallaRegistro() {
  const router = useRouter();

  //  Consumimos los colores del tema
  const { colores } = useTema();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [cargando, setCargando] = useState(false);
  const [errores, setErrores] = useState<{ [key: string]: string }>({});

  const validarFormulario = (): boolean => {
    const nuevosErrores: { [key: string]: string } = {};

    if (!nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio.';
    }

    if (!email.trim()) {
      nuevosErrores.email = 'El correo es obligatorio.';
    } else if (!email.includes('@') || !email.includes('.')) {
      nuevosErrores.email = 'Ingresá un correo electrónico válido.';
    }

    if (!password) {
      nuevosErrores.password = 'La contraseña es obligatoria.';
    } else if (password.length < 6) {
      nuevosErrores.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (password !== confirmPassword) {
      nuevosErrores.confirmPassword = 'Las contraseñas no coinciden.';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleRegistro = async () => {
    if (!validarFormulario()) return;

    setCargando(true);
    try {
      // Petición a la API (registra y guarda token en SecureStore)
      const resultado = await registrarUsuario(nombre, email, password);

      if (resultado.exito) {
        Alert.alert(
          '¡Cuenta creada!',
          `Bienvenida/o, ${resultado.datos?.usuario.nombre || nombre}.`
        );
        // Redirigimos al inicio o tabs
        router.replace('/');
      } else {
        Alert.alert('Error', resultado.mensaje || 'No se pudo crear la cuenta.');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error de conexión. Intentalo de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: colores.fondo },
        ]}
      >
        <Text style={[styles.titulo, { color: colores.textoPrincipal }]}>
          Crear Cuenta
        </Text>
        <Text style={[styles.subtitulo, { color: colores.textoSecundario }]}>
          Registrate para guardar tus lugares favoritos de Colón
        </Text>

        {/* Campo Nombre */}
        <Text style={[styles.label, { color: colores.textoPrincipal }]}>
          Nombre completo
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colores.tarjetaFondo,
              borderColor: colores.tarjetaBorde,
              color: colores.textoPrincipal,
            },
            errores.nombre ? styles.inputError : null,
          ]}
          placeholder="Ej: Victoria Gómez"
          placeholderTextColor={colores.textoSecundario}
          value={nombre}
          onChangeText={setNombre}
        />
        {errores.nombre && (
          <Text style={styles.textoError}>{errores.nombre}</Text>
        )}

        {/* Campo Email */}
        <Text style={[styles.label, { color: colores.textoPrincipal }]}>
          Correo electrónico
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colores.tarjetaFondo,
              borderColor: colores.tarjetaBorde,
              color: colores.textoPrincipal,
            },
            errores.email ? styles.inputError : null,
          ]}
          placeholder="tuemail@ejemplo.com"
          placeholderTextColor={colores.textoSecundario}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        {errores.email && (
          <Text style={styles.textoError}>{errores.email}</Text>
        )}

        {/* Campo Contraseña */}
        <Text style={[styles.label, { color: colores.textoPrincipal }]}>
          Contraseña
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colores.tarjetaFondo,
              borderColor: colores.tarjetaBorde,
              color: colores.textoPrincipal,
            },
            errores.password ? styles.inputError : null,
          ]}
          placeholder="******"
          placeholderTextColor={colores.textoSecundario}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {errores.password && (
          <Text style={styles.textoError}>{errores.password}</Text>
        )}

        {/* Campo Confirmar Contraseña */}
        <Text style={[styles.label, { color: colores.textoPrincipal }]}>
          Confirmar contraseña
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colores.tarjetaFondo,
              borderColor: colores.tarjetaBorde,
              color: colores.textoPrincipal,
            },
            errores.confirmPassword ? styles.inputError : null,
          ]}
          placeholder="******"
          placeholderTextColor={colores.textoSecundario}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        {errores.confirmPassword && (
          <Text style={styles.textoError}>{errores.confirmPassword}</Text>
        )}

        {/* Botón de Registro */}
        <TouchableOpacity
          style={[
            styles.boton,
            { backgroundColor: colores.primario },
            cargando && styles.botonDeshabilitado,
          ]}
          onPress={handleRegistro}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.textoBoton}>Registrarse</Text>
          )}
        </TouchableOpacity>

        {/* Link a Iniciar Sesión */}
        <View style={styles.contenedorFooter}>
          <Text style={{ color: colores.textoSecundario }}>
            ¿Ya tenés una cuenta?{' '}
          </Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text style={[styles.link, { color: colores.primario }]}>
                Iniciar Sesión
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 40,
    flexGrow: 1,
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 28,
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
  inputError: {
    borderColor: '#FF3B30',
  },
  textoError: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  boton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  botonDeshabilitado: {
    opacity: 0.7,
  },
  textoBoton: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contenedorFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  link: {
    fontWeight: 'bold',
  },
});