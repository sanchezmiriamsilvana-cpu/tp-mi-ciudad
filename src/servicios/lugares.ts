import { api } from './api';
import { Lugar, Categoria } from '../tipos/lugares';
import { MOCK_LUGARES, MOCK_CATEGORIAS } from '../mocks/lugares';

export const obtenerCategorias = async () => {
  try {
    const res = await api.get('/categorias');
    console.log('📦 [API] Respuesta Categorías:', res.data);

    // Extrae según la estructura recibida de la API
    const datos = Array.isArray(res.data)
      ? res.data
      : res.data?.datos || res.data?.data || [];

    return { exito: true, datos: datos.length > 0 ? datos : MOCK_CATEGORIAS };
  } catch (error) {
    console.warn('⚠️ API no disponible. Usando MOCK_CATEGORIAS local.');
    return { exito: true, datos: MOCK_CATEGORIAS };
  }
};

export const obtenerLugares = async (busqueda = '', categoriaId = 'cat-todas') => {
  try {
    const params: Record<string, string> = {};
    if (busqueda.trim()) params.q = busqueda;
    if (categoriaId !== 'cat-todas') params.categoriaId = categoriaId;

    const res = await api.get('/lugares', { params });
    
    // 🔍 Log para depuración en la consola de Expo:
    console.log('📦 [API] Respuesta Lugares recibida:', res.data);

    // Extrae según la estructura (Array directo, datos, data, o items)
    let datos: Lugar[] = Array.isArray(res.data)
      ? res.data
      : res.data?.datos || res.data?.data || res.data?.items || [];

    // Si la API devolvió un array vacío (BD sin sembrar), usa MOCKs como respaldo:
    if (datos.length === 0) {
      console.warn('⚠️ La API respondió OK pero sin lugares. Usando MOCK_LUGARES.');
      datos = MOCK_LUGARES;
    }

    return { exito: true, datos };
  } catch (error) {
    console.warn('⚠️ API no disponible. Usando MOCK_LUGARES local.', error);

    let resultado = MOCK_LUGARES;
    if (categoriaId !== 'cat-todas') {
      resultado = resultado.filter((l) => l.categoriaId === categoriaId);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter((l) => l.nombre.toLowerCase().includes(q));
    }

    return { exito: true, datos: resultado };
  }
};

export const obtenerLugarPorId = async (id: string) => {
  try {
    const res = await api.get(`/lugares/${id}`);
    const datos: Lugar = res.data?.datos || res.data?.data || res.data;
    return { exito: true, datos };
  } catch (error) {
    console.warn(`⚠️ API no disponible para id ${id}. Buscando en MOCK_LUGARES.`);
    const lugarEncontrado = MOCK_LUGARES.find((l) => l.id === id) || MOCK_LUGARES;
    return { exito: true, datos: lugarEncontrado };
  }
};