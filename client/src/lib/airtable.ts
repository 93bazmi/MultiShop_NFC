const BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

export const config = {
  databaseProvider:
    import.meta.env.DATABASE_URL || "postgresql",
};

export const API = {
  USERS: `${BASE_URL}/api/users`,
  SHOPS: `${BASE_URL}/api/shops`,
  PRODUCTS: `${BASE_URL}/api/products`,
  NFC_CARDS: `${BASE_URL}/api/nfc-cards`,
  TRANSACTIONS: `${BASE_URL}/api/transactions`,
  NFC_PAYMENT: `${BASE_URL}/api/nfc-payment`,
  NFC_TOPUP: `${BASE_URL}/api/nfc-topup`,
};

export function formatQuery(params: Record<string, any>) {
  const queryParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  
  return queryParams ? `?${queryParams}` : '';
}
