import Airtable from "airtable";

// Airtable configuration
export const airtableConfig = {
  apiKey:
    process.env.AIRTABLE_API_KEY ||
    "patAYWAEknRTyXdKG.cbd23a372b75f8118e9c9d1920127d1a2753ce9206565df236c2af733b0dfc27",
  baseId: process.env.AIRTABLE_BASE_ID || "appQLP7XIvyUmebOQ",
};

// Table names in Airtable
export const TABLES = {
  SHOPS: "Shops",
  PRODUCTS: "Products",
  NFC_CARDS: "NFCCards",
  TRANSACTIONS: "Transactions",
};

// Field mappings between our schema and Airtable
export const FIELD_MAPS = {
  shops: {
    id: "id",
    name: "name",
    description: "description",
    icon: "icon",
    iconColor: "icon", // Using icon field for color
    status: "status",
    ownerId: "id", // Fall back to using primary ID
    username: "username",
    password: "password",
  },
  products: {
    id: "id",
    name: "name",
    description: "name", // Using name as description
    price: "price",
    shopId: "shopId",
    icon: "icon",
    available: "available",
  },
  nfcCards: {
    id: "id",
    cardId: "cardId",
    balance: "balance",
    lastUsed: "lastUsed",
    active: "active",
  },
  transactions: {
    id: "id",
    amount: "amount",
    shopId: "shopId",
    cardId: "cardId",
    timestamp: "timestamp",
    // Still include type in our mapping even if Airtable doesn't use it
    type: "type",
    status: "status",
    previousBalance: "previousBalance",
    newBalance: "newBalance",
    items: "items",
    shopName: "shopName",
    cart: "cart",
    orderNumber: "orderNumber",
  },
};

// Helper to convert from Airtable record to our schema
export function fromAirtableRecord(table: string, record: any) {
  const fields = record.fields;
  const fieldMap = (FIELD_MAPS as any)[table];
  // id จริง (ถ้ามี)
  const realId = fields[fieldMap.id]
    ? parseInt(fields[fieldMap.id])
    : undefined;
  const result: any = { id: realId, airtableRecordId: record.id };
  for (const key in fieldMap) {
    if (fields[fieldMap[key]] !== undefined) {
      result[key] = fields[fieldMap[key]];
    }
  }
  return result;
}

// Helper to convert from our schema to Airtable fields
export function toAirtableFields(table: string, data: any) {
  const fields: any = {};
  const fieldMap = (FIELD_MAPS as any)[table];

  for (const key in data) {
    if (fieldMap[key]) {
      // <--- เอา key !== "id" ออก
      fields[fieldMap[key]] = data[key];
    }
  }

  return fields;
}
