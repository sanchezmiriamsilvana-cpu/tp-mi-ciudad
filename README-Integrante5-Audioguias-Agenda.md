# Áreas 3 y 6 — Audioguías Multimedia y Agenda de Eventos

> Módulo desarrollado por el **Integrante 5** del TP *Mi Ciudad - Colón*
> (Expo SDK 54 / React Native).

Este documento resume la parte del trabajo correspondiente a las **Áreas 3 y
6**: catálogo de **audioguías** alimentado por la API, reproductor con
**control en segundo plano**, **pantalla de agenda de eventos por fecha** y
**avisos/recordatorios**.

---

## 1. Funcionalidades implementadas

### Catálogo dinámico desde la API

- En la API de Mi Ciudad **las audioguías no tienen endpoint propio**: cada
  lugar trae un objeto `audioguia` (`{ url, duracionSegundos, idioma }`) o
  `null`. El catálogo se arma con `GET /lugares?porPagina=500` y se queda
  sólo con los lugares que tienen `audioguia.url`.
- Si se configura otro backend, se pueden usar rutas alternativas
  (`/audioguias`, `/audiolibros`) o forzar una con
  `EXPO_PUBLIC_AUDIOGUIAS_PATH`. La URL base se define con
  `EXPO_PUBLIC_BASE_URL`.
- Se normalizan respuestas con o sin envoltorio (`{ datos: [...] }`,
  `{ data: [...] }`, arreglo directo) y alias de campos (`titulo`/`nombre`,
  `imagen`/`portada`, `audioUrl`/`urlAudio`/`audio`, etc.).
- Las rutas relativas y los hosts `localhost`/`127.0.0.1` se reescriben
  contra la URL base de la API.
- Estados de **carga**, **error con reintento**, **catálogo vacío** y
  **pull-to-refresh** en la pantalla.
- **Copia local del catálogo** en `expo-file-system`: si la API falla se
  muestra la última versión guardada. Esta copia solo conserva respuestas
  anteriores de la API; si no hay copia previa, se muestra el error de red
  con opción de reintentar.

### Reproductor de las audioguías

- Tarjetas con imagen remota (`imagenes[0]` del lugar), tipo de contenido,
  descripción y duración (`audioguia.duracionSegundos`) informados por la
  API. El narrador se muestra cuando la API lo informa.
- El reproductor utiliza exclusivamente la URL de audio devuelta por la API
  (`audioguia.url`, servida por `GET /archivos/<clave>` con soporte de
  `Range`) o una descarga hecha por el usuario.
- Reproductor completo: play/pausa, retroceso/avance de 10 s, barra de
  progreso *seekable*, control de velocidad (1x a 2x) y pantalla dedicada
  por audioguía.

### Control en segundo plano

- `expo-audio` con sesión de audio en segundo plano
  (`shouldPlayInBackground`) y `playsInSilentMode`.
- Controles en la pantalla de bloqueo / centro de notificaciones
  (`setActiveForLockScreen`) con título, artista e imagen.
- **Mini-reproductor flotante** global disponible en todas las pantallas.
- Configuración nativa de audio en segundo plano en `app.json`
  (`UIBackgroundModes: ["audio"]` y plugin `expo-audio`).

### Descarga offline (`expo-file-system`)

- Descarga de las pistas oficiales con **barra de progreso**, guardado en
  almacenamiento local y borrado.
- Prioridad de fuente de audio: **descarga local → URL oficial de la API**.

### Agenda de eventos por fecha

- Pestaña **Agenda** con selector de fechas (marca los días que tienen
  eventos), listado de eventos del día y sección de próximos eventos.
- Los eventos se obtienen con `GET /eventos?porPagina=100` (respaldo
  automático a `/eventos/agenda` y `/agenda-eventos`) y el detalle con
  `GET /eventos/:id` (si responde 404 se busca el evento en el listado).
- Como la API devuelve sólo `lugarId` en cada evento, se completan
  **nombre, dirección y coordenadas** con `GET /lugares?porPagina=500`
  (caché de 5 minutos) para no mostrar "Colón, Entre Ríos" repetido.
- Estados de **carga**, **error con reintento**, **agenda vacía** y
  **pull-to-refresh**. Si falla una actualización se conservan los eventos
  ya cargados y se muestra un aviso.
- Pantalla de detalle por evento, con estado (`programado`, `suspendido`,
  `cancelado`, `finalizado`) y precio.

### Avisos y recordatorios (`expo-notifications`)

- Solicitud de permisos, canal de notificaciones en Android y programación
  de avisos con anticipación configurable (1 h / 1 día).
- Cancelación de recordatorios y **navegación al evento al tocar la
  notificación** (deep link).

---

## 2. Archivos principales

```text
src/features/audioguias-agenda/
├── services/
│   ├── apiAudioguias.ts        # catálogo, normalización y URLs
│   ├── apiEventos.ts           # eventos y adaptación a la agenda
│   ├── cacheAudioguias.ts      # copia local del catálogo
│   ├── audioService.ts         # segundo plano y controles de bloqueo
│   ├── downloadService.ts      # descarga y fuente de audio
│   ├── notificationService.ts  # recordatorios
│   └── storage.ts              # persistencia local
├── hooks/
│   ├── useAudioguia.tsx        # contexto del reproductor
│   ├── useAudioguias.tsx       # catálogo y descargas
│   ├── useEventos.ts           # agenda y recordatorios
│   └── useEventoDetalle.ts     # detalle de un evento
├── screens/
│   ├── AudioguiasScreen.tsx    # catálogo
│   ├── AudioguiaPlayerScreen.tsx # reproductor
│   └── AgendaEventosScreen.tsx # agenda y detalle
├── components/                 # tarjetas, DateStrip, MiniPlayer
└── data/                       # modelos de presentación

src/app/_layout.tsx             # proveedores, overlays y rutas
src/app/audioguias-modulo.tsx   # entrada al catálogo
src/app/audioguias.tsx          # redirección de la ruta heredada
src/app/(tabs)/eventos.tsx      # pestaña Agenda
src/app/(tabs)/index.tsx        # botón de Audioguías en el encabezado
app.json                        # plugins expo-audio / expo-notifications
package.json                    # dependencias del módulo
```

---

## 2.1 Configuración de la API

```bash
# .env
# URL base de la API REST de Mi Ciudad. Expo solo expone las
# variables EXPO_PUBLIC_.
# Para probar en el celular, usá la IP de la PC en la misma red Wi-Fi:
EXPO_PUBLIC_BASE_URL=http://192.168.100.31:3000
# Opcional: forzar la ruta del catálogo (por defecto /lugares)
# EXPO_PUBLIC_AUDIOGUIAS_PATH=/lugares
```

La URL se valida al iniciar (`src/config/env.ts`): debe usar HTTP(S),
incluir host y no incluir credenciales, query ni fragmento. Reiniciá
`npx expo start` después de modificar `.env` para que Expo vuelva a leer
las variables. Todas las peticiones pasan por la instancia de Axios de
`src/servicios/api.ts`, que adjunta el token si existe y aplica un
timeout de 12 s.

### Endpoints usados (API de Mi Ciudad)

| Endpoint | Uso |
| --- | --- |
| `GET /lugares?porPagina=500` | Catálogo y audioguías |
| `GET /eventos?porPagina=100` | Agenda de eventos |
| `GET /eventos/:id` | Detalle de un evento |
| `GET /archivos/<clave>` | Audio e imágenes |

Respuestas de la API: `{ datos, meta }` para listas y
`{ datos, meta: null }` para detalles.

Campos del `Lugar` usados como audioguía: `id`, `nombre`,
`descripcionCorta`, `imagenes[0]`, `audioguia.url` y
`audioguia.duracionSegundos`. El `id` del lugar es el `id` de la
audioguía.

Campos del `Evento`: `id`, `titulo`, `descripcion`, `lugarId`,
`direccionLibre`, `coordenadas`, `inicio`/`fin` (ISO 8601 con offset
`-03:00`), `imagenUrl`, `precio` (0 = gratis, `null` = no especificado)
y `estado` (`programado`, `suspendido`, `cancelado`, `finalizado`).

---

## 3. Tecnologías / módulos Expo

| Módulo | Uso |
| --- | --- |
| `expo-audio` | Audio y segundo plano |
| `expo-file-system` | Descargas offline |
| `expo-notifications` | Recordatorios |
| `expo-router` | Rutas del módulo |
| `react-native-safe-area-context` | Área segura |

---

## 4. Cómo ejecutar

```bash
npm install
npx expo start          # Expo Go (login de Expo requerido)
```

> **Nota:** el **audio en segundo plano real** y las **notificaciones**
> requieren un *development build* (`npx expo run:android` /
> `eas build --profile development`), no Expo Go.

---

## 5. Estado

- `npx tsc --noEmit` → sin errores.
- `npx expo lint` → sin errores.
- `npx expo-doctor` → 18/18 checks OK.
- Verificado contra la API local de Mi Ciudad (`api-mi-ciudad`, SQLite con
  datos de demo):
  - `GET /lugares?porPagina=500` → 26 lugares, **8 con `audioguia`**.
  - `GET /eventos?porPagina=100` → 8 eventos con `inicio` en ISO `-03:00`.
  - `GET /archivos/audios/...` → `200 audio/mpeg`, `Accept-Ranges: bytes`
    y `206 Partial Content` al pedir un rango.

El catálogo de audioguías y la agenda de eventos se alimentan
exclusivamente desde la API. El catálogo puede mostrarse desde la copia
local de la última respuesta real si no hay conexión; si no hay caché se
muestra el error con opción de reintentar. No se usan datos mock.

> **Audios de demostración:** `assets/audioguias/*.wav` quedaron de la
> primera versión (audio empaquetado). El código ya no los referencia
> porque el audio viene de `audioguia.url`; se pueden borrar sin afectar
> la app.
>
> **Audio de las semillas de la API:** los MP3 de demo que genera
> `scripts/generate-media.mjs` son silencio digital. Para la demo local
> se reemplazaron por narraciones TTS en español y se volvió a sembrar la
> base, así que `audioguia.duracionSegundos` ahora sale del audio real
> (18 a 259 s). La app no cambió. Contra otra instancia de la API, las
> pistas se reproducen igual pero suenan en silencio. Si ya habías
> descargado una audioguía, borrala desde el reproductor para escuchar la
> versión nueva.
