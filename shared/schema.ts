import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
});

// Shop schema
export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon").notNull().default("store"),
  iconColor: text("icon_color").notNull().default("blue"),
  status: text("status").notNull().default("active"),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),
});

export const insertShopSchema = createInsertSchema(shops).pick({
  name: true,
  description: true,
  icon: true,
  iconColor: true,
  status: true,
  ownerId: true,
});

// Product schema
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  shopId: integer("shop_id")
    .notNull()
    .references(() => shops.id),
  icon: text("icon").notNull().default("box"),
  available: boolean("available").notNull().default(true),
});

export const insertProductSchema = createInsertSchema(products).pick({
  name: true,
  description: true,
  price: true,
  shopId: true,
  icon: true,
  available: true,
});

// NFC Card schema
export const nfcCards = pgTable("nfc_cards", {
  id: serial("id").primaryKey(),
  cardId: text("card_id").notNull().unique(),
  balance: integer("balance").notNull().default(0),
  lastUsed: timestamp("last_used"),
  active: boolean("active").notNull().default(true),
});

export const insertNfcCardSchema = createInsertSchema(nfcCards).pick({
  cardId: true,
  balance: true,
  active: true,
});

// Transaction schema
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  amount: integer("amount").notNull(),
  shopId: integer("shop_id")
    //.notNull()
    .references(() => shops.id),
  cardId: integer("card_id").references(() => nfcCards.id),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  type: text("type").notNull(), // 'purchase', 'topup', etc.
  status: text("status").notNull().default("completed"),
  previousBalance: integer("previous_balance"), // ยอดเงินในบัตรก่อนทำธุรกรรม
  newBalance: integer("new_balance"), // ยอดเงินในบัตรหลังทำธุรกรรม
  items: text("items"),
  shopName: text("shop_name"),
  cart: text("cart"),
  orderNumber: integer("order_number"),
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  amount: true,
  shopId: true,
  cardId: true,
  type: true,
  status: true,
  previousBalance: true,
  newBalance: true,
  items: true,
  shopName: true,
  cart: true,
  orderNumber: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertShop = z.infer<typeof insertShopSchema>;
export type Shop = typeof shops.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertNfcCard = z.infer<typeof insertNfcCardSchema>;
export type NfcCard = typeof nfcCards.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
