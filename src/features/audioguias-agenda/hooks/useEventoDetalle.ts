import { useCallback, useEffect, useRef, useState } from 'react';

import { mensajeDeErrorApi } from '../../../servicios/errores';
import type { EventoAgenda } from '../data/eventos';
import { cargarEventoAgenda } from '../services/apiEventos';

interface OpcionesUseEventoDetalle {
  habilitado?: boolean;
}

/** Carga el detalle de un evento desde la API, con reintento manual. */
export function useEventoDetalle(
  id: string | undefined,
  { habilitado = true }: OpcionesUseEventoDetalle = {}
) {
  const [evento, setEvento] = useState<EventoAgenda | null>(null);
  const [cargando, setCargando] = useState(Boolean(habilitado && id));
  const [error, setError] = useState<string | null>(null);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    if (!id) {
      setEvento(null);
      setError(null);
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const datos = await cargarEventoAgenda(id);
      if (montado.current) setEvento(datos);
    } catch (e) {
      if (!montado.current) return;
      setEvento(null);
      setError(mensajeDeErrorApi(e, 'el evento'));
    } finally {
      if (montado.current) setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    if (!habilitado || !id) {
      setCargando(false);
      return;
    }
    void cargar();
  }, [habilitado, id, cargar]);

  return { evento, cargando, error, recargar: cargar };
}
