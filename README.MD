# 🏛️ Mi Ciudad — Guía Turística de Colón

Aplicación móvil desarrollada con **React Native**, **Expo (SDK 54)**, **Expo Router** y **TypeScript** para la materia *Desarrollo para Móviles* (Tecnicatura Universitaria en Desarrollo Web — UNER).

La aplicación acompaña a turistas y residentes en el descubrimiento de atractivos, playas, museos, termas, gastronomía y patrimonio de la ciudad de Colón (Entre Ríos), combinando geolocalización en tiempo real, mapas interactivos, audioguías, validación de visitas por QR, respuesta háptica y navegación offline.

---

## 👥 Integrantes y Responsabilidades

| Integrante | Módulo / Área | Responsabilidades y Código Desarrollado |
| :--- | :--- | :--- |
| **Victoria Mamberti** | **Mi Recorrido, Favoritos y Feedback Háptico** | • Gestión y guardado de favoritos en base de datos local SQLite (`favoritos.ts`, `db.ts`, `favoritos.tsx`).<br>• Módulo *Mi Recorrido* (`mirecorrido.tsx`) con escaneo de códigos QR para registrar visitas turísticas.<br>• Almacenamiento local de bitácora con fotografías tomadas por el usuario, notas personales y fecha de visita (`visitas.ts`).<br>• Integración de **respuesta háptica y vibración táctil** (`expo-haptics`) ante acciones clave (alternar favoritos, confirmación de visitas escaneadas y botones de acción).<br>• Detección de conectividad en tiempo real y banner visual de aviso para navegación sin conexión (`BannerRed`). |
| **Sandra Chisté** | **Identidad Visual, Mapa y Detalle (`[id].tsx`)** | • **Diseño de identidad visual de la app**: logotipo oficial, paleta de colores turística e iconografía representativa de la ciudad de Colón.<br>• Vista geográfica interactiva de la ciudad con marcadores y pines personalizados (`mapa.tsx`).<br>• Pantalla de detalle exhaustivo del atractivo turístico (`src/app/lugar/[id].tsx`).<br>• Normalización de URLs de imágenes, galería horizontal y fallback seguro ante URLs caídas.<br>• Brújula y orientación en vivo mediante magnetómetro (`BrujulaFlecha.tsx`) y cálculo de distancia GPS.<br>• Accesos directos para llamada telefónica, web oficial y enlace a mapas nativos (*Cómo llegar*). |
| **Martín Perez** | **Audioguías y Agenda de Eventos** | • Módulo completo de audioguías turísticas históricas y culturales (`useAudioguia.ts`, `useAudioguias.ts`).<br>• Reproductor de audio con controles de reproducción, pausa y avance (`audioguia-player.tsx`).<br>• Mini-reproductor flotante global (`AudioguiasAgendaOverlays.tsx`) para escuchar en segundo plano mientras se navega la app.<br>• Módulo y visualización de la agenda de eventos y actividades de Colón (`agenda-eventos.tsx`). |
| **Miriam Sanchez** | **Autenticación y Seguridad** | • Formularios y flujo de Inicio de Sesión (`login.tsx`) y Registro de Nuevos Turistas (`registro.tsx`).<br>• Manejo de sesión con JSON Web Tokens (JWT) y almacenamiento seguro (`sesion.ts`, `autenticacion.ts`).<br>• Configuración de la instancia de Axios e interceptores para adjuntar automáticamente el token en cabeceras HTTP (`api.ts`).<br>• Gestión de perfil de usuario (`perfil.tsx`). |

---

## 🚀 Funcionalidades Principales

* **Identidad Visual y Diseño Personalizado**: Logotipo e imagen institucional diseñados especialmente para la guía turística de Colón.
* **Exploración de Atractivos**: Catálogo completo filtrable por categorías (termas, playas, museos, gastronomía, naturaleza) y búsqueda en tiempo real por texto.
* **Mapa Interactivo**: Marcadores en mapa nativo y cálculo de distancia en kilómetros desde la posición actual del turista.
* **Orientación con Brújula**: Flecha indicadora en vivo en la ficha de detalle que utiliza el magnetómetro del dispositivo para orientar al usuario hacia el atractivo seleccionado.
* **Respuesta Háptica Sensorial**: Retroalimentación táctil (`expo-haptics`) al marcar favoritos, escanear o presionar botones interactivos.
* **Audioguías en Segundo Plano**: Narración sonora de monumentos históricos con persistencia del reproductor en toda la aplicación.
* **Pasaporte de Visitas (QR)**: Validación presencial mediante escaneo de códigos QR en los atractivos, permitiendo guardar notas y fotos de la experiencia.
* **Favoritos y Navegación Offline**: Posibilidad de marcar lugares preferidos y consultarlos sin conexión a internet gracias a la persistencia en **SQLite**.
* **Detección Automática de Conectividad**: Alerta flotante cuando el dispositivo pierde la red, garantizando el uso continuo con los datos cacheados localmente.
* **Tema Claro / Oscuro**: Interfaz adaptativa a las preferencias del sistema para facilitar la lectura tanto bajo el sol como de noche.

---

## 🛠️ Tecnologías Utilizadas

* **Framework**: React Native 0.86, React 19, Expo SDK 54, TypeScript.
* **Navegación**: Expo Router (rutas declarativas por sistema de carpetas).
* **APIs Nativas y Hardware**:
  * `expo-haptics` (Vibración y retroalimentación táctil del sistema)
  * `expo-location` (GPS y posicionamiento en tiempo real)
  * `expo-sensors` (Magnetómetro para el sensor de orientación)
  * `expo-camera` (Lector de códigos QR y captura de imágenes para visitas)
  * `expo-audio` (Reproducción de archivos sonoros en audioguías)
  * `expo-sqlite` (Base de datos relacional local para favoritos y bitácora)
  * `expo-network` (Monitoreo de estado de conectividad a internet)
  * `react-native-maps` (Visualización de mapa geográfico y pines)
* **Peticiones HTTP**: Axios con interceptores de autenticación JWT y timeout configurado.

---

## ⚙️ Instalación y Puesta en Marcha

### Prerrequisitos
* Node.js (versión 20 LTS o superior recomendada).
* Git.
* Celular con la app **Expo Go** instalada (o emulador Android/iOS configurado).

### Pasos:

1. **Clonar el proyecto:**
   ```bash
   git clone [suspicious link removed]
   cd tp-mi-ciudad
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar las variables de entorno:**
   Crear un archivo `.env` en la raíz del proyecto con la IP de la máquina donde corre el backend:
   ```env
   EXPO_PUBLIC_API_URL=http://<TU_IP_LOCAL>:3000
   ```
   *(Ejemplo: `EXPO_PUBLIC_API_URL=http://192.168.1.xx:3000`)*

4. **Iniciar el servidor de desarrollo:**
   ```bash
   npx expo start -c
   ```

5. **Ejecutar en el celular:**
   * Abrir la aplicación **Expo Go** en Android y escanear el código QR que figura en la terminal.
   * En iOS, escanear el QR desde la cámara nativa.

---
##  Video Explicativo Grupal 

Pueden observar el video explicativo del Grupo 15 en el siguiente enlace: https://drive.google.com/file/d/1Bgg4qsQcxgEtrswKKHFksZ6Hl2Vijvmd/view?usp=drive_link


---

## 📄 Licencia y Ámbito Académico

Proyecto integrador final desarrollado para la cátedra **Desarrollo para Móviles** — Tecnicatura Universitaria en Desarrollo Web (TUDW), Facultad de Ciencias de la Administración (FCAD), **Universidad Nacional de Entre Ríos (UNER)**.