import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

const TEMAS = {
  claro: {
    fondo: '#f8fafc',
    tarjetaFondo: '#ffffff',
    tarjetaBorde: '#e2e8f0',
    textoPrincipal: '#0f172a',
    textoSecundario: '#64748b',
  },
  oscuro: {
    fondo: '#0f172a',
    tarjetaFondo: '#1e293b',
    tarjetaBorde: '#334155',
    textoPrincipal: '#f8fafc',
    textoSecundario: '#94a3b8',
  },
};

export type ModoTema = 'claro' | 'oscuro' | 'sistema';

type TemaContextoType = {
  colores: typeof TEMAS.claro;
  esOscuro: boolean;
  modo: ModoTema;
  setModo: (modo: ModoTema) => void;
};

const TemaContext = createContext<TemaContextoType>({
  colores: TEMAS.claro,
  esOscuro: false,
  modo: 'sistema',
  setModo: () => {},
});

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const [modo, setModo] = useState<ModoTema>('sistema');

  // Si está en 'sistema', lee la preferencia del celular. Si no, usa la elección manual.
  const esOscuro =
    modo === 'sistema' ? colorScheme === 'dark' : modo === 'oscuro';

  const colores = esOscuro ? TEMAS.oscuro : TEMAS.claro;

  return (
    <TemaContext.Provider value={{ colores, esOscuro, modo, setModo }}>
      {children}
    </TemaContext.Provider>
  );
}

export function useTema() {
  return useContext(TemaContext);
}