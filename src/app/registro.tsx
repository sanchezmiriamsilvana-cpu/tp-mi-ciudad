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

// 🎨 Importamos el hook del Tema Global
import { useTema } from '../contexto/TemaContext'; // Ajustá a '../contexto/TemaContext' según tu carpeta

// Servicios de autenticación
import { guardarToken, guardarUsuario } from '../servicios/autenticacion';

export default function PantallaRegistro() {
  const router = useRouter();

  // 🎨 Consumimos los colores del tema
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
      const tokenSesion = `token_usr_${Math.random().toString(36).substring(2, 10)}`;

      // Guardamos el token y los datos del usuario en SecureStore
      await guardarToken(tokenSesion);
      await guardarUsuario({ nombre, email, password });

      Alert.alert('¡Cuenta creada!', `Bienvenida/o, ${nombre}. Tu usuario fue guardado.`);

      // Redirigimos al inicio
      router.replace('/');
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la cuenta. Intentalo de nuevo.');
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
          style={styles.boton}
          onPress={handleRegistro}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.textoBoton}>Registrarme</Text>
          )}
        </TouchableOpacity>

        {/* Enlace a Login */}
        <View style={styles.footerLink}>
          <Text style={[styles.textoFooter, { color: colores.textoSecundario }]}>
            ¿Ya tenés una cuenta?{' '}
          </Text>
          <Link href="/login" style={[styles.link, { color: colores.textoPrincipal }]}>
            Iniciar Sesión
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 14,
    marginBottom: 24,
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
  inputError: {
    borderColor: '#ef4444',
  },
  textoError: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  boton: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  textoBoton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  textoFooter: {
    fontSize: 14,
  },
  link: {
    color: '#0284c7',
    fontWeight: 'bold',
    fontSize: 14,
  },
});