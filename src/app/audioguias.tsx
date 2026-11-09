import { Redirect } from 'expo-router';

/**
 * Ruta heredada. El catálogo de audioguías ahora vive en `/audioguias-modulo`
 * y se alimenta desde la API; se mantiene esta ruta como redirección para no
 * romper enlaces o accesos directos antiguos.
 */
export default function PantallaAudioguias() {
  return <Redirect href="/audioguias-modulo" />;
}
