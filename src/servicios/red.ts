import * as Network from 'expo-network';

export async function estaConectado(): Promise<boolean> {
  const estado = await Network.getNetworkStateAsync();
  return Boolean(estado.isConnected && estado.isInternetReachable);
}