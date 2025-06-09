// Airtable configuration
export const config = {
  apiKey: import.meta.env.VITE_AIRTABLE_API_KEY || "patAYWAEknRTyXdKG.cbd23a372b75f8118e9c9d1920127d1a2753ce9206565df236c2af733b0dfc27",
  baseId: import.meta.env.VITE_AIRTABLE_BASE_ID || "appQLP7XIvyUmebOQ",
};

// API endpoint prefixes
export const API = {
  USERS: '/api/users',
  SHOPS: '/api/shops',
  PRODUCTS: '/api/products',
  NFC_CARDS: '/api/nfc-cards',
  TRANSACTIONS: '/api/transactions',
  NFC_PAYMENT: '/api/nfc-payment',
  NFC_TOPUP: "/api/nfc-topup" // เพิ่ม endpoint สำหรับเติมเงิน
};

// Function to format API query parameters
export function formatQuery(params: Record<string, any>) {
  const queryParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  
  return queryParams ? `?${queryParams}` : '';
}
