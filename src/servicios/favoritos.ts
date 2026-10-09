// Servicio para la gestión de atractivos favoritos
let favoritosIds: string[] = ['lug-01']; // Inicia con Molino Forclaz como favorito de prueba

export const obtenerFavoritosIds = async (): Promise<string[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...favoritosIds]);
    }, 100);
  });
};

export const alternarFavorito = async (id: string): Promise<string[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (favoritosIds.includes(id)) {
        favoritosIds = favoritosIds.filter((favId) => favId !== id);
      } else {
        favoritosIds.push(id);
      }
      resolve([...favoritosIds]);
    }, 100);
  });
};