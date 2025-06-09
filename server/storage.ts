import { 
  User, InsertUser, Shop, InsertShop, Product, InsertProduct,
  NfcCard, InsertNfcCard, Transaction, InsertTransaction
} from "@shared/schema";
import Airtable from "airtable";
import { airtableConfig, TABLES, fromAirtableRecord, toAirtableFields } from "./airtable";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Shop operations
  getShop(id: number): Promise<Shop | undefined>;
  getShops(): Promise<Shop[]>;
  getShopsByOwner(ownerId: number): Promise<Shop[]>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShop(id: number, shop: Partial<Shop>): Promise<Shop>;
  
  // Product operations
  getProduct(id: number): Promise<Product | undefined>;
  getProducts(): Promise<Product[]>;
  getProductsByShop(shopId: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product>;
  
  // NFC Card operations
  getNfcCard(id: number): Promise<NfcCard | undefined>;
  getNfcCardByCardId(cardId: string): Promise<NfcCard | undefined>;
  getNfcCards(): Promise<NfcCard[]>;
  createNfcCard(card: InsertNfcCard): Promise<NfcCard>;
  updateNfcCard(id: number, card: Partial<NfcCard>): Promise<NfcCard>;
  
  // Transaction operations
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactions(): Promise<Transaction[]>;
  getTransactionsByShop(shopId: number): Promise<Transaction[]>;
  getTransactionsByCard(cardId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
}

export class AirtableStorage implements IStorage {
  private base: Airtable.Base;

  constructor() {
    Airtable.configure({
      apiKey: airtableConfig.apiKey,
    });

    this.base = Airtable.base(airtableConfig.baseId);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const record = await this.base(TABLES.USERS).find(id.toString());
      return fromAirtableRecord('users', record) as User;
    } catch (error) {
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const records = await this.base(TABLES.USERS)
        .select({
          filterByFormula: `{username} = '${username}'`,
          maxRecords: 1,
        })
        .firstPage();

      if (records.length === 0) return undefined;

      return fromAirtableRecord('users', records[0]) as User;
    } catch (error) {
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    const fields = toAirtableFields('users', user);
    const record = await this.base(TABLES.USERS).create(fields);
    return fromAirtableRecord('users', record) as User;
  }

  // Shop operations
  async getShop(id: number): Promise<Shop | undefined> {
    try {
      console.log(`[AirtableStorage] Looking for shop with ID: ${id}`);
      
      // First try to find by ID directly
      try {
        const record = await this.base(TABLES.SHOPS).find(id.toString());
        console.log(`[AirtableStorage] Found shop with ID ${id} by direct lookup`);
        return fromAirtableRecord('shops', record) as Shop;
      } catch (directError) {
        console.log(`[AirtableStorage] Direct lookup failed, trying filter: ${directError}`);
        
        // If direct lookup fails, try filtering by ID field
        const records = await this.base(TABLES.SHOPS).select({
          filterByFormula: `{id} = '${id}'`
        }).all();
        
        if (records.length > 0) {
          console.log(`[AirtableStorage] Found shop with ID ${id} by filter`);
          return fromAirtableRecord('shops', records[0]) as Shop;
        }
        
        console.log(`[AirtableStorage] Shop with ID ${id} not found by filter either`);
        return undefined;
      }
    } catch (error) {
      console.error(`[AirtableStorage] Error looking up shop with ID ${id}:`, error);
      return undefined;
    }
  }

  async getShops(): Promise<Shop[]> {
    try {
      console.log('Fetching shops from Airtable directly...');
      const records = await this.base(TABLES.SHOPS).select().all();
      
      console.log(`Retrieved ${records.length} shops from Airtable`);
      // Debug: Log raw records from Airtable
      records.forEach(record => {
        console.log(`Airtable shop: ID=${record.fields.id}, Name=${record.fields.name}, RecordID=${record.id}`);
      });
      
      return records.map(record => {
        const shop = fromAirtableRecord('shops', record) as Shop;
        // Add the Airtable record ID as a custom property for updates
        (shop as any).airtableRecordId = record.id;
        
        console.log(`Mapped shop: ${shop.id} - ${shop.name}`);
        return shop;
      });
    } catch (error) {
      console.error('Error getting shops from Airtable:', error);
      return [];
    }
  }

  async getShopsByOwner(ownerId: number): Promise<Shop[]> {
    const records = await this.base(TABLES.SHOPS)
      .select({
        filterByFormula: `{ownerId} = ${ownerId}`,
      })
      .all();

    return records.map(record => fromAirtableRecord('shops', record) as Shop);
  }

  async createShop(shop: InsertShop): Promise<Shop> {
    const fields = toAirtableFields('shops', shop);
    const record = await this.base(TABLES.SHOPS).create(fields);
    return fromAirtableRecord('shops', record) as Shop;
  }

  async updateShop(id: number, shop: Partial<Shop>): Promise<Shop> {
    const fields = toAirtableFields('shops', shop);
    const record = await this.base(TABLES.SHOPS).update(id.toString(), fields);
    return fromAirtableRecord('shops', record) as Shop;
  }

  // Product operations
  async getProduct(id: number): Promise<Product | undefined> {
    try {
      const record = await this.base(TABLES.PRODUCTS).find(id.toString());
      return fromAirtableRecord('products', record) as Product;
    } catch (error) {
      return undefined;
    }
  }

  async getProducts(): Promise<Product[]> {
    const records = await this.base(TABLES.PRODUCTS).select().all();
    return records.map(record => fromAirtableRecord('products', record) as Product);
  }

  async getProductsByShop(shopId: number): Promise<Product[]> {
    const records = await this.base(TABLES.PRODUCTS)
      .select({
        filterByFormula: `{shopId} = ${shopId}`,
      })
      .all();

    return records.map(record => fromAirtableRecord('products', record) as Product);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const fields = toAirtableFields('products', product);
    const record = await this.base(TABLES.PRODUCTS).create(fields);
    return fromAirtableRecord('products', record) as Product;
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product> {
    const fields = toAirtableFields('products', product);
    const record = await this.base(TABLES.PRODUCTS).update(id.toString(), fields);
    return fromAirtableRecord('products', record) as Product;
  }

  // NFC Card operations
  async getNfcCard(id: number): Promise<NfcCard | undefined> {
    try {
      const record = await this.base(TABLES.NFC_CARDS).find(id.toString());
      return fromAirtableRecord('nfcCards', record) as NfcCard;
    } catch (error) {
      return undefined;
    }
  }

  async getNfcCardByCardId(cardId: string): Promise<NfcCard | undefined> {
    try {
      const records = await this.base(TABLES.NFC_CARDS)
        .select({
          filterByFormula: `{cardId} = '${cardId}'`,
          maxRecords: 1,
        })
        .firstPage();

      if (records.length === 0) return undefined;

      // Store Airtable record ID in the result for direct updates
      const result = fromAirtableRecord('nfcCards', records[0]) as NfcCard;
      // Add the Airtable record ID as a custom property for updates
      (result as any).airtableRecordId = records[0].id;
      
      console.log(`Found NFC card with cardId ${cardId}, Airtable Record ID: ${(result as any).airtableRecordId}`);
      
      return result;
    } catch (error) {
      console.error(`Error fetching card by cardId ${cardId}:`, error);
      return undefined;
    }
  }

  async getNfcCards(): Promise<NfcCard[]> {
    const records = await this.base(TABLES.NFC_CARDS).select().all();
    return records.map(record => fromAirtableRecord('nfcCards', record) as NfcCard);
  }

  async createNfcCard(card: InsertNfcCard): Promise<NfcCard> {
    console.log("Creating new NFC card in Airtable:", card);
    
    // Set default values for required fields
    const cardData = {
      ...card,
      // Set defaults for required fields if not provided
      active: card.active !== undefined ? card.active : true,
      balance: card.balance !== undefined ? card.balance : 0
    };
    
    const fields = toAirtableFields('nfcCards', cardData);
    console.log("Airtable fields for card creation:", fields);
    
    try {
      const record = await this.base(TABLES.NFC_CARDS).create(fields);
      return fromAirtableRecord('nfcCards', record) as NfcCard;
    } catch (error) {
      console.error("Airtable error creating card:", error);
      throw error;
    }
  }

  async updateNfcCard(id: number, card: Partial<NfcCard>): Promise<NfcCard> {
    console.log("Updating NFC card in Airtable:", id, card);
    const fields = toAirtableFields('nfcCards', card);
    console.log("Airtable fields for card update:", fields);
    
    try {
      // Check if this card has an Airtable Record ID
      const existingCard = await this.getNfcCard(id);
      if (!existingCard) {
        throw new Error(`Card with id ${id} not found`);
      }
      
      // First try to find the card by cardId for direct Airtable ID
      const recordsByCardId = await this.base(TABLES.NFC_CARDS)
        .select({
          filterByFormula: `{cardId} = '${existingCard.cardId}'`
        })
        .firstPage();
        
      if (recordsByCardId.length > 0) {
        // Use the Airtable record ID directly
        const airtableRecordId = recordsByCardId[0].id;
        console.log(`Found card in Airtable with Record ID: ${airtableRecordId}`);
        
        // Update using Airtable record ID
        const updatedRecord = await this.base(TABLES.NFC_CARDS).update(airtableRecordId, fields);
        return fromAirtableRecord('nfcCards', updatedRecord) as NfcCard;
      } else {
        // Record not found in Airtable, create a new one
        console.log("Card not found in Airtable, creating new record");
        const fullCardData = { ...existingCard, ...card };
        const createFields = toAirtableFields('nfcCards', fullCardData);
        const newRecord = await this.base(TABLES.NFC_CARDS).create(createFields);
        return fromAirtableRecord('nfcCards', newRecord) as NfcCard;
      }
    } catch (error) {
      console.error("Airtable error updating card:", error);
      throw error;
    }
  }

  // Transaction operations
  async getTransaction(id: number): Promise<Transaction | undefined> {
    try {
      const record = await this.base(TABLES.TRANSACTIONS).find(id.toString());
      return fromAirtableRecord('transactions', record) as Transaction;
    } catch (error) {
      return undefined;
    }
  }

  async getTransactions(): Promise<Transaction[]> {
    const records = await this.base(TABLES.TRANSACTIONS).select().all();
    return records.map(record => fromAirtableRecord('transactions', record) as Transaction);
  }

  async getTransactionsByShop(shopId: number): Promise<Transaction[]> {
    const records = await this.base(TABLES.TRANSACTIONS)
      .select({
        filterByFormula: `{shopId} = ${shopId}`,
      })
      .all();

    return records.map(record => fromAirtableRecord('transactions', record) as Transaction);
  }

  async getTransactionsByCard(cardId: number): Promise<Transaction[]> {
    const records = await this.base(TABLES.TRANSACTIONS)
      .select({
        filterByFormula: `{cardId} = ${cardId}`,
      })
      .all();

    return records.map(record => fromAirtableRecord('transactions', record) as Transaction);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    // Convert shopId and cardId to strings for Airtable compatibility
    const transactionData = {
      ...transaction,
      shopId: transaction.shopId ? transaction.shopId.toString() : null,
      cardId: transaction.cardId ? transaction.cardId.toString() : null,
    };
    
    console.log("Sending transaction to Airtable:", transactionData);
    const fields = toAirtableFields('transactions', transactionData);
    console.log("Airtable fields:", fields);
    
    try {
      const record = await this.base(TABLES.TRANSACTIONS).create(fields);
      return fromAirtableRecord('transactions', record) as Transaction;
    } catch (error) {
      console.error("Airtable error creating transaction:", error);
      throw error;
    }
  }
}

// For testing purposes, we can also provide an in-memory implementation
class MemStorage implements IStorage {
  private users: Map<number, User>;
  private shops: Map<number, Shop>;
  private products: Map<number, Product>;
  private nfcCards: Map<number, NfcCard>;
  private transactions: Map<number, Transaction>;
  
  private userIdCounter: number;
  private shopIdCounter: number;
  private productIdCounter: number;
  private nfcCardIdCounter: number;
  private transactionIdCounter: number;

  constructor() {
    this.users = new Map();
    this.shops = new Map();
    this.products = new Map();
    this.nfcCards = new Map();
    this.transactions = new Map();
    
    this.userIdCounter = 1;
    this.shopIdCounter = 5; // Start after our predefined shops
    this.productIdCounter = 1;
    this.nfcCardIdCounter = 1;
    this.transactionIdCounter = 1;
    
    // Initialize with default shops
    const defaultShops = [
      {
        id: 1,
        name: "Coffee Shop",
        description: "Fresh coffee and pastries",
        ownerId: 1,
        icon: "coffee",
        iconColor: "brown",
        status: "active"
      },
      {
        id: 2,
        name: "Thai Restaurant",
        description: "Authentic Thai food",
        ownerId: 1,
        icon: "utensils",
        iconColor: "green",
        status: "active"
      },
      {
        id: 3,
        name: "Tech Gadgets",
        description: "Innovative tech for everyday use",
        ownerId: 1,
        icon: "shopping-bag",
        iconColor: "blue",
        status: "active"
      },
      {
        id: 4,
        name: "Clothing Store",
        description: "Fashion and apparel",
        ownerId: 1,
        icon: "tshirt",
        iconColor: "purple",
        status: "active"
      }
    ];
    
    // Add all default shops to the map
    for (const shop of defaultShops) {
      this.shops.set(shop.id, shop);
    }
    
    // Add some demo products for each shop
    this.products.set(1, {
      id: 1,
      name: "Coffee",
      description: "Fresh brewed coffee",
      price: 45,
      shopId: 1,
      icon: "coffee",
      available: true
    });
    
    this.products.set(2, {
      id: 2,
      name: "Croissant",
      description: "Butter croissant",
      price: 35,
      shopId: 1,
      icon: "bread-slice",
      available: true
    });
    
    this.products.set(3, {
      id: 3,
      name: "Pad Thai",
      description: "Classic Thai noodle dish",
      price: 89,
      shopId: 2,
      icon: "utensils",
      available: true
    });
    
    this.products.set(4, {
      id: 4,
      name: "Tom Yum Soup",
      description: "Spicy Thai soup",
      price: 79,
      shopId: 2,
      icon: "bowl-food",
      available: true
    });
    
    this.products.set(5, {
      id: 5,
      name: "Smartphone",
      description: "Latest model",
      price: 15000,
      shopId: 3,
      icon: "smartphone",
      available: true
    });
    
    this.products.set(6, {
      id: 6,
      name: "Headphones",
      description: "Noise cancelling",
      price: 2500,
      shopId: 3,
      icon: "headphones",
      available: true
    });
    
    this.products.set(7, {
      id: 7,
      name: "T-shirt",
      description: "Cotton t-shirt",
      price: 399,
      shopId: 4,
      icon: "shirt",
      available: true
    });
    
    this.products.set(8, {
      id: 8,
      name: "Jeans",
      description: "Slim fit jeans",
      price: 899,
      shopId: 4,
      icon: "scissors",
      available: true
    });
    
    // Set product counter to after our demo products
    this.productIdCounter = 9;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  // Shop operations
  async getShop(id: number): Promise<Shop | undefined> {
    // Add logging for debugging
    console.log(`[MemStorage] Looking for shop with ID: ${id}, type: ${typeof id}`);
    console.log(`[MemStorage] Available shops:`, Array.from(this.shops.entries()));
    
    // Create dummy shops if not exists
    const dummyShops = [
      {
        id: 1,
        name: "Coffee Shop",
        description: "Fresh coffee and pastries",
        ownerId: 1,
        icon: "coffee",
        iconColor: "brown",
        status: "active"
      },
      {
        id: 2,
        name: "Thai Restaurant",
        description: "Authentic Thai food",
        ownerId: 1,
        icon: "utensils",
        iconColor: "green",
        status: "active"
      },
      {
        id: 3,
        name: "Tech Gadgets",
        description: "Innovative tech for everyday use",
        ownerId: 1,
        icon: "shopping-bag",
        iconColor: "blue",
        status: "active"
      },
      {
        id: 4,
        name: "Clothing Store",
        description: "Fashion and apparel",
        ownerId: 1,
        icon: "tshirt",
        iconColor: "purple",
        status: "active"
      }
    ];
    
    // Check if the requested shop is one of our dummy shops
    const dummyShop = dummyShops.find(shop => shop.id === id);
    if (dummyShop && !this.shops.has(id)) {
      console.log(`[MemStorage] Creating dummy shop with ID ${id}`);
      this.shops.set(id, dummyShop);
      return dummyShop;
    }
    
    return this.shops.get(id);
  }

  async getShops(): Promise<Shop[]> {
    return Array.from(this.shops.values());
  }

  async getShopsByOwner(ownerId: number): Promise<Shop[]> {
    return Array.from(this.shops.values()).filter(
      (shop) => shop.ownerId === ownerId,
    );
  }

  async createShop(shop: InsertShop): Promise<Shop> {
    const id = this.shopIdCounter++;
    const newShop: Shop = { ...shop, id };
    this.shops.set(id, newShop);
    return newShop;
  }

  async updateShop(id: number, shop: Partial<Shop>): Promise<Shop> {
    const existingShop = this.shops.get(id);
    if (!existingShop) {
      throw new Error(`Shop with id ${id} not found`);
    }

    const updatedShop = { ...existingShop, ...shop };
    this.shops.set(id, updatedShop);
    return updatedShop;
  }

  // Product operations
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProductsByShop(shopId: number): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.shopId === shopId,
    );
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.productIdCounter++;
    const newProduct: Product = { ...product, id };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product> {
    const existingProduct = this.products.get(id);
    if (!existingProduct) {
      throw new Error(`Product with id ${id} not found`);
    }

    const updatedProduct = { ...existingProduct, ...product };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  // NFC Card operations
  async getNfcCard(id: number): Promise<NfcCard | undefined> {
    return this.nfcCards.get(id);
  }

  async getNfcCardByCardId(cardId: string): Promise<NfcCard | undefined> {
    return Array.from(this.nfcCards.values()).find(
      (card) => card.cardId === cardId,
    );
  }

  async getNfcCards(): Promise<NfcCard[]> {
    return Array.from(this.nfcCards.values());
  }

  // async createNfcCard(card: InsertNfcCard): Promise<NfcCard> {
  //   const id = this.nfcCardIdCounter++;
  //   const newCard: NfcCard = { ...card, id, lastUsed: null };
  //   this.nfcCards.set(id, newCard);
  //   return newCard;
  // }

  async updateNfcCard(id: number, card: Partial<NfcCard>): Promise<NfcCard> {
    const existingCard = this.nfcCards.get(id);
    if (!existingCard) {
      throw new Error(`NFC Card with id ${id} not found`);
    }

    const updatedCard = { ...existingCard, ...card };
    this.nfcCards.set(id, updatedCard);
    return updatedCard;
  }

  // Transaction operations
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }

  async getTransactionsByShop(shopId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (transaction) => transaction.shopId === shopId,
    );
  }

  async getTransactionsByCard(cardId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (transaction) => transaction.cardId === cardId,
    );
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionIdCounter++;
    const newTransaction: Transaction = { 
      ...transaction, 
      id, 
      timestamp: new Date() 
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }
}

// Use Airtable in production, MemStorage for development/testing
// Initialize with AirtableStorage, but if that fails, fall back to MemStorage
let storage: IStorage;

try {
  storage = new AirtableStorage();
} catch (error) {
  console.warn("Failed to initialize AirtableStorage, falling back to MemStorage");
  storage = new MemStorage();
}

export { storage };
