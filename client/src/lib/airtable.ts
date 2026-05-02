export const config = {
  databaseProvider: import.meta.env.VITE_DATABASE_PROVIDER || "postgresql",
};

export const API = {
  USERS: '/api/users',
  SHOPS: '/api/shops',
  PRODUCTS: '/api/products',
  NFC_CARDS: '/api/nfc-cards',
  TRANSACTIONS: '/api/transactions',
  NFC_PAYMENT: '/api/nfc-payment',
  NFC_TOPUP: "/api/nfc-topup" // เพิ่ม endpoint สำหรับเติมเงิน
};

export function formatQuery(params: Record<string, any>) {
  const queryParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  
  return queryParams ? `?${queryParams}` : '';
}
