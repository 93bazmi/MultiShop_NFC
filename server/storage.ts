import { desc, eq } from "drizzle-orm";
import {
  users,
  shops,
  products,
  nfcCards,
  transactions,
  type User,
  type InsertUser,
  type Shop,
  type InsertShop,
  type Product,
  type InsertProduct,
  type NfcCard,
  type InsertNfcCard,
  type Transaction,
  type InsertTransaction,
} from "@shared/schema";
import { db } from "./db";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getShop(id: number): Promise<Shop | undefined>;
  getShops(): Promise<Shop[]>;
  getShopsByOwner(ownerId: number): Promise<Shop[]>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShop(id: number, shop: Partial<Shop>): Promise<Shop>;

  getProduct(id: number): Promise<Product | undefined>;
  getProducts(): Promise<Product[]>;
  getProductsByShop(shopId: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product>;

  getNfcCard(id: number): Promise<NfcCard | undefined>;
  getNfcCardByCardId(cardId: string): Promise<NfcCard | undefined>;
  getNfcCards(): Promise<NfcCard[]>;
  createNfcCard(card: InsertNfcCard): Promise<NfcCard>;
  updateNfcCard(id: number, card: Partial<NfcCard>): Promise<NfcCard>;

  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactions(): Promise<Transaction[]>;
  getTransactionsByShop(shopId: number): Promise<Transaction[]>;
  getTransactionsByCard(cardId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
}

const cleanUpdate = <T extends Record<string, unknown>>(data: T) => {
  return Object.fromEntries(
    Object.entries(data).filter(([key, value]) => key !== "id" && value !== undefined),
  ) as Partial<T>;
};

class PostgresStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getShop(id: number): Promise<Shop | undefined> {
    const [shop] = await db.select().from(shops).where(eq(shops.id, id)).limit(1);
    return shop;
  }

  async getShops(): Promise<Shop[]> {
    return db.select().from(shops).orderBy(shops.id);
  }

  async getShopsByOwner(ownerId: number): Promise<Shop[]> {
    return db.select().from(shops).where(eq(shops.ownerId, ownerId)).orderBy(shops.id);
  }

  async createShop(shop: InsertShop): Promise<Shop> {
    const [created] = await db.insert(shops).values(shop).returning();
    return created;
  }

  async updateShop(id: number, shop: Partial<Shop>): Promise<Shop> {
    const updates = cleanUpdate(shop);
    if (Object.keys(updates).length === 0) {
      const existing = await this.getShop(id);
      if (!existing) throw new Error(`Shop with id ${id} not found`);
      return existing;
    }

    const [updated] = await db
      .update(shops)
      .set(updates)
      .where(eq(shops.id, id))
      .returning();

    if (!updated) throw new Error(`Shop with id ${id} not found`);
    return updated;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    return product;
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products).orderBy(products.id);
  }

  async getProductsByShop(shopId: number): Promise<Product[]> {
    return db
      .select()
      .from(products)
      .where(eq(products.shopId, shopId))
      .orderBy(products.id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product> {
    const updates = cleanUpdate(product);
    if (Object.keys(updates).length === 0) {
      const existing = await this.getProduct(id);
      if (!existing) throw new Error(`Product with id ${id} not found`);
      return existing;
    }

    const [updated] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();

    if (!updated) throw new Error(`Product with id ${id} not found`);
    return updated;
  }

  async getNfcCard(id: number): Promise<NfcCard | undefined> {
    const [card] = await db.select().from(nfcCards).where(eq(nfcCards.id, id)).limit(1);
    return card;
  }

  async getNfcCardByCardId(cardId: string): Promise<NfcCard | undefined> {
    const [card] = await db
      .select()
      .from(nfcCards)
      .where(eq(nfcCards.cardId, cardId))
      .limit(1);
    return card;
  }

  async getNfcCards(): Promise<NfcCard[]> {
    return db.select().from(nfcCards).orderBy(nfcCards.id);
  }

  async createNfcCard(card: InsertNfcCard): Promise<NfcCard> {
    const [created] = await db
      .insert(nfcCards)
      .values({
        cardId: card.cardId,
        balance: card.balance ?? 0,
        active: card.active ?? true,
      })
      .returning();

    return created;
  }

  async updateNfcCard(id: number, card: Partial<NfcCard>): Promise<NfcCard> {
    const updates = cleanUpdate(card);
    if (Object.keys(updates).length === 0) {
      const existing = await this.getNfcCard(id);
      if (!existing) throw new Error(`NFC card with id ${id} not found`);
      return existing;
    }

    const [updated] = await db
      .update(nfcCards)
      .set(updates)
      .where(eq(nfcCards.id, id))
      .returning();

    if (!updated) throw new Error(`NFC card with id ${id} not found`);
    return updated;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);
    return transaction;
  }

  async getTransactions(): Promise<Transaction[]> {
    return db.select().from(transactions).orderBy(desc(transactions.timestamp));
  }

  async getTransactionsByShop(shopId: number): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.shopId, shopId))
      .orderBy(desc(transactions.timestamp));
  }

  async getTransactionsByCard(cardId: number): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.cardId, cardId))
      .orderBy(desc(transactions.timestamp));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values(transaction).returning();
    return created;
  }
  async getShopByOwnerId(ownerId: number): Promise<Shop | undefined> {
  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.ownerId, ownerId))
    .limit(1);

  return shop;
}

  
}

export const storage = new PostgresStorage();
