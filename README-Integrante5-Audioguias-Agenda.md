# Áreas 3 y 6 — Audioguías Multimedia y Agenda de Eventos

> Módulo desarrollado por el **Integrante 5** del TP *Mi Ciudad - Colón* (Expo SDK 54 / React Native).

Este documento resume la parte del trabajo correspondiente a las **Áreas 3 y 6**:
reproductor de las **8 audioguías oficiales** con **control en segundo plano**, **pantalla de agenda de eventos por fecha** y **avisos/recordatorios**.

---

## 1. Funcionalidades implementadas

### 🔊 Reproductor de las 8 audioguías oficiales
- Datos completos de las 8 audioguías (Molino Forclaz, Puerto Viejo, Complejo Termal Colón, Playa Norte, Bodega Vulliez Sermet, Parque Quirós, Basílica Santos Justo y Pastor y Costanera de Colón) con descripción y duración.
- **8 narraciones de audio en español** generadas y empaquetadas en `assets/audioguias/`, reproducibles **sin conexión**.
- Reproductor completo: play/pausa, retroceso/avance de 10 s, barra de progreso *seekable*, control de velocidad (1× a 2×) y pantalla dedicada por audioguía.

### ⏯️ Control en segundo plano
- `expo-audio` con sesión de audio en segundo plano (`shouldPlayInBackground`) y `playsInSilentMode`.
- Controles en la pantalla de bloqueo / centro de notificaciones (`setActiveForLockScreen`) con título, artista e imagen.
- **Mini-reproductor flotante** global disponible en todas las pantallas.
- Configuración nativa de audio en segundo plano vía plugin `expo-audio` en `app.json`.

### ⬇️ Descarga offline (`expo-file-system`)
- Descarga de las pistas oficiales con **barra de progreso**, guardado en almacenamiento local y borrado.
- Prioridad de fuente de audio: **descarga local → audio empaquetado → URL oficial**.

### 📅 Agenda de eventos por fecha
- Pestaña **Agenda** con selector de fechas (marca los días que tienen eventos), listado de eventos del día y sección de próximos eventos.
- Pantalla de detalle por evento.

### 🔔 Avisos y recordatorios (`expo-notifications`)
- Solicitud de permisos, canal de notificaciones en Android y programación de avisos con anticipación configurable (1 h / 1 día).
- Cancelación de recordatorios y **navegación al evento al tocar la notificación** (deep link).

---

## 2. Archivos principales

```text
src/features/audioguias-agenda/
├── services/
│   ├── audioService.ts          # sesión de audio en segundo plano + controles de bloqueo
│   ├── downloadService.ts       # descarga local y resolución de la fuente de audio
│   ├── notificationService.ts   # programación/cancelación de recordatorios
│   └── storage.ts               # persistencia (posiciones, descargas, recordatorios)
├── hooks/
│   ├── useAudioguia.tsx         # contexto global del reproductor
│   ├── useAudioguias.ts         # catálogo, descargas y fuente de reproducción
│   └── useEventos.ts            # eventos por fecha y recordatorios
├── screens/
│   ├── AudioguiasScreen.tsx     # listado de audioguías
│   ├── AudioguiaPlayerScreen.tsx# reproductor
│   └── AgendaEventosScreen.tsx  # agenda y detalle de eventos
├── components/                  # AudioguiaCard, EventoCard, DateStrip, MiniPlayer, overlays
└── data/                        # audioguias.ts y eventos.ts

src/app/_layout.tsx              # montaje de AudioguiasProvider + overlays y rutas
src/app/(tabs)/eventos.tsx       # pestaña Agenda
src/app/(tabs)/index.tsx         # botón de acceso a Audioguías en el encabezado
app.json                         # plugins expo-audio / expo-notifications
package.json                     # dependencias expo-audio, expo-notifications, expo-file-system
assets/audioguias/*.wav          # 8 audios (demostración)
```

---

## 3. Tecnologías / módulos Expo

| Módulo | Uso |
|---|---|
| `expo-audio` | Reproducción de audio, sesión en segundo plano y controles de bloqueo |
| `expo-file-system` | Descarga y almacenamiento local de las pistas |
| `expo-notifications` | Avisos y recordatorios de eventos |
| `expo-router` | Rutas de las pantallas del módulo |
| `react-native-safe-area-context` | Layout seguro en las pantallas |

---

## 4. Cómo ejecutar

```bash
npm install
npx expo start          # Expo Go (login de Expo requerido para proyectos no verificados)
```

> **Nota:** el **audio en segundo plano real** y las **notificaciones** requieren un *development build*
> (`npx expo run:android` / `eas build --profile development`), no Expo Go.

---

## 5. Estado

- `npx tsc --noEmit` → sin errores.
- `npx expo-doctor` → 18/18 checks OK.
- `npx expo export --platform android` → bundle generado correctamente.

Los audios incluidos y los eventos son de **demostración**; al cargar las URLs oficiales de audio
la app habilita además la descarga offline sin cambios de código.
