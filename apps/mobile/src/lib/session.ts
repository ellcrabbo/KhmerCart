import * as SecureStore from "expo-secure-store";

const BUYER_SESSION_TOKEN_KEY = "khmercart.buyer.session-token";

export async function clearStoredSessionToken() {
  await SecureStore.deleteItemAsync(BUYER_SESSION_TOKEN_KEY);
}

export async function readStoredSessionToken() {
  return SecureStore.getItemAsync(BUYER_SESSION_TOKEN_KEY);
}

export async function writeStoredSessionToken(token: string) {
  await SecureStore.setItemAsync(BUYER_SESSION_TOKEN_KEY, token);
}
