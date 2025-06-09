import type { Express, Request, Response } from "express";
import cookieParser from "cookie-parser";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertShopSchema,
  insertProductSchema,
  insertNfcCardSchema,
  insertTransactionSchema,
  NfcCard,
} from "@shared/schema";
import { ZodError } from "zod";
import { fromAirtableRecord, airtableConfig, TABLES } from "./airtable"; // Ensure TABLES is imported
import type { Transaction } from "@shared/schema";

// Helper หาเลข id ใหม่ (ใช้กับตาราง NFCCards)
async function getNextCardId(): Promise<number> {
  const records = await (storage as any)
    .base("NFCCards")
    .select({
      sort: [{ field: "id", direction: "desc" }],
      maxRecords: 1,
    })
    .all();

  const lastId = records.length > 0 ? parseInt(records[0].fields.id) : 0;
  return lastId + 1;
}

//นับเลขออเดอร์
async function getNextOrderNumber(): Promise<number> {
  const records = await (storage as any)
    .base("Transactions")
    .select({
      sort: [{ field: "orderNumber", direction: "desc" }],
      maxRecords: 1,
    })
    .all();

  const latest = records[0]?.fields?.orderNumber || 0;
  return latest + 1;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session store
  const sessions = new Map<
    string,
    { userId: number; username: string; loginTime: number; shopId: number }
  >();

  const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  // Authentication routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res
          .status(400)
          .json({ message: "กรุณากรอก username และ password" });
      }
      // Use Airtable instance from the storage module
      const base = (storage as any).base;
      const users = await base(TABLES.SHOPS) // corrected access
        .select({ filterByFormula: `{username} = '${username}'` })
        .firstPage();
      const user =
        users.length > 0 ? fromAirtableRecord("shops", users[0]) : null;
      if (!user || user.password !== password) {
        return res
          .status(401)
          .json({ message: "Username หรือ Password ไม่ถูกต้อง" });
      }
      console.log("Create session with userId:", user.id); // << เพิ่ม log
      const sessionId =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      sessions.set(sessionId, {
        userId: Number(user.id),
        username: user.username,
        loginTime: Date.now(),
        shopId: Number(user.id),
      });

      res.cookie("sessionId", sessionId, {
        httpOnly: true,
        sameSite: "lax",
        // secure: true, // in prod under HTTPS
      });
      return res.status(200).json({ sessionId, user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
    }
  });

  // Assuming you already have necessary imports and express app setup
  app.get("/api/shops/me", async (req: Request, res: Response) => {
    const sessionId = req.cookies.sessionId;

    if (!sessionId || !sessions.has(sessionId)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const session = sessions.get(sessionId);
    if (!session || !session.userId) {
      return res.status(401).json({ message: "Invalid session" });
    }

    try {
      // ถ้า userId = shopId จริง
      const shop = await storage.getShop(session.userId);
      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }
      res.json(shop);
    } catch (error) {
      console.error("Error fetching shop:", error);
      res.status(500).json({ message: "Failed to retrieve shop" });
    }
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    const sessionId = req.cookies?.sessionId;

    if (!sessionId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(401).json({ message: "Session expired" });
    }

    // Check session timeout
    if (Date.now() - session.loginTime > SESSION_TIMEOUT) {
      sessions.delete(sessionId);
      return res.status(401).json({ message: "Session expired" });
    }

    res.json({
      id: session.userId.toString(),
      name: session.username,
      username: session.username,
      roles: ["user"],
    });
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const sessionId = req.cookies?.sessionId;

    if (sessionId) {
      sessions.delete(sessionId);
    }

    res.clearCookie("sessionId");
    res.json({ message: "Logged out successfully" });
  });

  // Middleware to check authentication for protected routes
  const requireAuth = (req: Request, res: Response, next: Function) => {
    const sessionId = req.cookies?.sessionId;
    console.log("[requireAuth] sessionId from cookie:", sessionId);

    if (!sessionId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const session = sessions.get(sessionId);
    console.log("[requireAuth] found session in map:", session);

    if (!session || Date.now() - session.loginTime > SESSION_TIMEOUT) {
      if (session) sessions.delete(sessionId);
      return res.status(401).json({ message: "Session expired" });
    }

    req.user = session;
    next();
  };

  // ระบบป้องกันการทำธุรกรรมซ้ำในช่วงเวลาสั้นๆ
  // เก็บ map ของ transaction ล่าสุดและเวลาที่เกิดขึ้น
  const recentTransactions = new Map<
    string,
    { timestamp: number; amount: number }
  >();
  const DEBOUNCE_TIME = 5000; // 5 วินาที (มิลลิวินาที)

  // ฟังก์ชันตรวจสอบและบันทึกธุรกรรม
  const checkDuplicateTransaction = (
    cardId: string,
    shopId: number,
    amount: number,
  ): boolean => {
    const now = Date.now();
    const transactionKey = `${cardId}-${shopId}-${amount}`;

    // ตรวจสอบว่ามีธุรกรรมนี้เกิดขึ้นเมื่อเร็วๆ นี้หรือไม่
    const recentTransaction = recentTransactions.get(transactionKey);

    if (
      recentTransaction &&
      now - recentTransaction.timestamp < DEBOUNCE_TIME
    ) {
      console.log(
        `ป้องกันธุรกรรมซ้ำ: ${transactionKey} (เวลาผ่านไป: ${now - recentTransaction.timestamp}ms)`,
      );
      return true; // เป็นธุรกรรมซ้ำ
    }

    // บันทึกธุรกรรมนี้
    recentTransactions.set(transactionKey, { timestamp: now, amount });

    // ลบธุรกรรมเก่าเกิน 10 นาที
    const TEN_MINUTES = 10 * 60 * 1000;

    // แก้ไขปัญหา TypeScript error โดยใช้ Array.from แทนการใช้ iterator โดยตรง
    Array.from(recentTransactions.entries()).forEach(([key, transaction]) => {
      if (now - transaction.timestamp > TEN_MINUTES) {
        recentTransactions.delete(key);
      }
    });

    return false; // ไม่ใช่ธุรกรรมซ้ำ
  };

  // Setup error handling middleware for Zod validation
  const validateBody = (schema: any) => {
    return (req: Request, res: Response, next: Function) => {
      try {
        req.body = schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          console.error("Zod validation error:", error.errors); // << เพิ่ม log นี้
          res.status(400).json({
            message: "Validation error",
            errors: error.errors,
          });
        } else {
          next(error);
        }
      }
    };
  };

  // เพิ่ม endpoint c��ำหรับทดสอบการอ่านบัตร NFC
  app.post("/api/nfc-test-read", async (req, res) => {
    try {
      const { cardId } = req.body;

      console.log("Received NFC test read request:", { cardId });

      if (!cardId) {
        return res.status(400).json({
          message: "ไม่พบหมายเลขบัตร NFC",
          error: "card_id_missing",
        });
      }

      // ค้นหาบัตรจากฐานข้อมูล
      let card;
      try {
        card = await storage.getNfcCardByCardId(cardId);
      } catch (error) {
        console.error("Error getting card:", error);
      }

      // ถ้าไม่พบบัตรในระบบ
      if (!card) {
        return res.status(404).json({
          message: "ไม่พบหมายเลขบัตร NFC ในระบบ",
          error: "card_not_found",
          cardId: cardId,
          exists: false,
        });
      }

      // พบบัตรในระบบ ส่งข้อมูลกลับไป
      res.json({
        message: "พบบัตร NFC ในระบบ",
        card: card,
        exists: true,
      });
    } catch (error) {
      console.error("Error testing NFC card:", error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการอ่านบัตร NFC" });
    }
  });

  // เพิ่ม endpoint สำหรับเติมเงินบัตร NFC
  app.post("/api/nfc-topup", async (req, res) => {
    const orderNumber = await getNextOrderNumber(); // อิอิ

    try {
      const { cardId, amount } = req.body;

      console.log("Received NFC topup request:", { cardId, amount });

      if (!cardId || amount === undefined || amount <= 0) {
        return res.status(400).json({
          message: "Missing required fields: cardId or amount",
        });
      }

      // ป้องกันการเติมเงินซ้ำซ้อน
      // ใช้ shopId เป็น 0 สำหรับการเติมเงิน เพื่อแยกจากการชำระเงิน
      if (checkDuplicateTransaction(cardId, 0, amount)) {
        console.log(`ป้องกันการเติมเงินซ้ำ: ${cardId} - ${amount} coins`);
        // ส่งข้อมูลสำเร็จเทียมเพื่อไม่ให้ UI พยายามส่งคำขอซ้ำ
        return res.status(200).json({
          success: true,
          message: "การเติมเงินสำเร็จแล้ว",
          isDuplicate: true,
        });
      }

      // Find the card by card ID
      let card;
      try {
        card = await storage.getNfcCardByCardId(cardId);
      } catch (error) {
        console.error("Error getting card:", error);
      }

      if (!card) {
        console.log(`Card ID ${cardId} not found in database. Topup rejected.`);
        return res.status(404).json({
          message: "ไม่พบหมายเลขบัตร NFC ในระบบ",
          error: "card_not_found",
          details:
            "กรุณาตรวจสอบว่าหมายเลขบัตรถูกต้อง หรือใช้บัตรที่ลงทะเบียนในระบบแล้วเท่านั้น",
        });
      }

      // Update card balance
      let updatedCard;
      try {
        // Search for the card again by cardId to get the latest Airtable record ID
        const freshAirtableCard = await storage.getNfcCardByCardId(card.cardId);

        if (freshAirtableCard && (freshAirtableCard as any).airtableRecordId) {
          // Use the Airtable record ID directly for updates
          console.log(
            `Using Airtable Record ID ${(freshAirtableCard as any).airtableRecordId} for direct update`,
          );

          try {
            // Update the card using Airtable's API directly
            const airtableFields = {
              balance: card.balance + amount,
              lastUsed: new Date().toLocaleString("en-US", {
                timeZone: "Asia/Bangkok",
              }),
            };

            // Airtable expects fields to be passed directly, not wrapped in a fields object
            // Access the Airtable base from the storage implementation
            if ((storage as any).base) {
              const updatedRecord = await (storage as any)
                .base("NFCCards")
                .update(
                  (freshAirtableCard as any).airtableRecordId,
                  airtableFields,
                );
              console.log(
                "Successfully updated card in Airtable:",
                updatedRecord.fields.balance,
              );
            } else {
              throw new Error("Airtable base not available");
            }

            updatedCard = {
              ...card,
              balance: card.balance + amount,
              lastUsed: new Date(),
            };
          } catch (directUpdateError) {
            console.error(
              "Error with direct Airtable update:",
              directUpdateError,
            );
            throw directUpdateError;
          }
        } else {
          // Fall back to regular update
          updatedCard = await storage.updateNfcCard(card.id, {
            balance: card.balance + amount,
            lastUsed: new Date(),
          });
        }
      } catch (updateError) {
        console.error("Error updating card:", updateError);
        // Create fallback updated card
        updatedCard = {
          ...card,
          balance: card.balance + amount,
          lastUsed: new Date(),
        };
        console.log(
          `Using fallback updated card with balance ${updatedCard.balance}`,
        );
      }

      // Create transaction record
      let transaction;
      try {
        // Try to create transaction directly in Airtable
        if ((storage as any).base) {
          try {
            // Create fields object directly without 'fields' wrapper
            const transactionFields = {
              orderNumber, // 🆕 เพิ่มตรงนี้
              amount: amount,
              cardId: card.cardId, // Use actual NFC card ID instead of internal ID
              status: "completed",
              type: "topup", // Set transaction type to topup
              previousBalance: card.balance,
              newBalance: card.balance + amount,
              timestamp: new Date().toLocaleString("en-US", {
                timeZone: "Asia/Bangkok",
              }),
            };

            // Create the transaction directly
            const createdRecord = await (storage as any)
              .base("Transactions")
              .create(transactionFields);
            transaction = {
              id:
                parseInt(createdRecord.id) ||
                Math.floor(Math.random() * 1000) + 1000,
              orderNumber: createdRecord.fields?.orderNumber, // << ตรงนี้!
              amount,
              cardId: card.cardId, // Use actual NFC card ID instead of internal ID
              type: "topup", // For our interface
              status: "completed",
              previousBalance: card.balance,
              newBalance: card.balance + amount,
              timestamp: new Date(
                new Date().toLocaleString("en-US", {
                  timeZone: "Asia/Bangkok",
                }),
              ),
            };
            console.log("Successfully created transaction in Airtable");
          } catch (directTransactionError) {
            console.error(
              "Error creating transaction directly in Airtable:",
              directTransactionError,
            );
            throw directTransactionError;
          }
        } else {
          // Fall back to storage interface
          // Convert cardId (string) to an integer for the transaction
          const numericCardId = parseInt(card.id.toString());

          transaction = await storage.createTransaction({
            amount,
            cardId: numericCardId, // Use numeric ID for database schema compatibility
            type: "topup", // Set transaction type to topup
            shopId: 0, // Use 0 for topup transactions
            status: "completed",
            previousBalance: card.balance,
            newBalance: card.balance + amount,
          });
        }
      } catch (transactionError) {
        console.error("Error creating transaction:", transactionError);
        // Create fallback transaction
        transaction = {
          id: transaction?.id,
          orderNumber, //  อิอิ
          amount,
          cardId: card.cardId, // Use actual NFC card ID instead of internal ID
          type: "topup",
          status: "completed",
          previousBalance: card.balance,
          newBalance: card.balance + amount,
          timestamp: new Date(
            new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }),
          ),
        };
        console.log(`Using fallback transaction with ID ${transaction.id}`);
      }

      res.json({
        success: true,
        card: updatedCard,
        transaction,
        remainingBalance: updatedCard.balance,
      });
    } catch (error) {
      console.error("Error processing NFC topup:", error);
      res.status(500).json({ message: "Error processing NFC topup" });
    }
  });
  // User routes - removed (unused in current app functionality)

  // Shop routes
  app.get("/api/shops", async (req, res) => {
    try {
      const ownerId = req.query.ownerId
        ? parseInt(req.query.ownerId as string)
        : undefined;

      let shops;
      if (ownerId) {
        shops = await storage.getShopsByOwner(ownerId);
      } else {
        shops = await storage.getShops();
      }

      res.json(shops);
    } catch (error) {
      res.status(500).json({ message: "Error fetching shops" });
    }
  });

  // Shop creation and update endpoints removed - not needed for core functionality

  // Product routes - simplified
  app.get("/api/products", async (req, res) => {
    try {
      const shopId = req.query.shopId ? parseInt(req.query.shopId) : undefined;
      const shopType = req.query.shopType as string | undefined;

      let products;

      if (shopId) {
        products = await storage.getProductsByShop(shopId);
      } else {
        products = await storage.getProducts();
      }

      // Join กับ shop เพื่อ filter เฉพาะ food
      if (shopType) {
        const shops = await storage.getShops();
        const foodShopIds = shops
          .filter((s) => s.icon === shopType)
          .map((s) => s.id);
        products = products.filter((p: any) => foodShopIds.includes(p.shopId));
      }

      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Error fetching products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Error fetching product" });
    }
  });

  // Product creation and update endpoints removed - not needed for core functionality

  // NFC Card routes

  app.get("/api/nfc-cards", async (req, res) => {
    try {
      let cards;
      cards = await storage.getNfcCards();
      res.json(cards);
    } catch (error) {
      console.error("Error fetching NFC cards:", error);
      res.status(500).json({ message: "Error fetching NFC cards" });
    }
  });

  app.get("/api/nfc-cards/:id", async (req, res) => {
    try {
      const cardId = parseInt(req.params.id);
      const card = await storage.getNfcCard(cardId);

      if (!card) {
        return res.status(404).json({ message: "NFC card not found" });
      }
      res.json(card);
    } catch (error) {
      res.status(500).json({ message: "Error fetching NFC card" });
    }
  });

  app.get("/api/nfc-cards/by-card-id/:cardId", async (req, res) => {
    try {
      const searchCardId = req.params.cardId;
      const card = await storage.getNfcCardByCardId(searchCardId);

      if (!card) {
        return res.status(404).json({ message: "NFC card not found" });
      }

      res.json(card);
    } catch (error) {
      res.status(500).json({ message: "Error fetching NFC card" });
    }
  });

  app.post(
    "/api/nfc-cards",
    validateBody(insertNfcCardSchema),
    async (req, res) => {
      try {
        // 1. หา id ใหม่
        const newId = await getNextCardId();
        // 2. เพิ่ม id ไปใน req.body
        const dataWithId = { ...req.body, id: newId.toString() };
        // 3. สร้างบัตร
        const card = await storage.createNfcCard(dataWithId);
        res.json(card);
      } catch (error) {
        console.error("Error creating NFC card:", error);
        res.status(500).json({ message: "Error creating NFC card" });
      }
    },
  );

  app.patch("/api/nfc-cards/:id", async (req, res) => {
    try {
      const cardId = parseInt(req.params.id);
      const card = await storage.getNfcCard(cardId);

      if (!card) {
        return res.status(404).json({ message: "NFC card not found" });
      }

      const updatedCard = await storage.updateNfcCard(cardId, req.body);
      res.json(updatedCard);
    } catch (error) {
      console.error("Error updating NFC card:", error);
      res.status(500).json({ message: "Error updating NFC card" });
    }
  });

  // Transaction routes
  app.get("/api/transactions", async (req, res) => {
    try {
      const shopId = req.query.shopId
        ? parseInt(req.query.shopId as string)
        : undefined;
      const cardId = req.query.cardId
        ? parseInt(req.query.cardId as string)
        : undefined;

      let transactions;
      if (shopId) {
        transactions = await storage.getTransactionsByShop(shopId);
      } else if (cardId) {
        transactions = await storage.getTransactionsByCard(cardId);
      } else {
        transactions = await storage.getTransactions();
      }

      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching transactions" });
    }
  });

  app.get("/api/transactions/:id", async (req, res) => {
    try {
      const transaction = await storage.getTransaction(parseInt(req.params.id));
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Error fetching transaction" });
    }
  });

  app.post(
    "/api/transactions",
    validateBody(insertTransactionSchema),
    async (req, res) => {
      try {
        // For NFC payments, process the card transaction
        if (req.body.cardId && req.body.type === "purchase") {
          const card = await storage.getNfcCard(req.body.cardId);
          if (!card) {
            return res.status(404).json({ message: "NFC card not found" });
          }

          // Check if card has enough balance
          if (card.balance < req.body.amount) {
            return res
              .status(400)
              .json({ message: "Insufficient balance on NFC card" });
          }

          // Store previous and new balance for the transaction
          req.body.previousBalance = card.balance;
          req.body.newBalance = card.balance - req.body.amount;

          // Update card balance
          await storage.updateNfcCard(card.id, {
            balance: req.body.newBalance,
            lastUsed: new Date(),
          });
        } else if (req.body.cardId && req.body.type === "topup") {
          // For top-ups, add to the balance
          const card = await storage.getNfcCard(req.body.cardId);
          if (!card) {
            return res.status(404).json({ message: "NFC card not found" });
          }

          // Store previous and new balance for the transaction
          req.body.previousBalance = card.balance;
          req.body.newBalance = card.balance + req.body.amount;

          // Update card balance
          await storage.updateNfcCard(card.id, {
            balance: req.body.newBalance,
            lastUsed: new Date(),
          });
        }

        // Create the transaction record
        // Make sure to use card.cardId instead of card.id for transaction records
        if (req.body.cardId) {
          // If this is a card transaction, fetch the card to get the cardId (NFC ID)
          const card = await storage.getNfcCard(req.body.cardId);
          if (card) {
            // Use the actual NFC card ID instead of internal ID
            req.body.cardId = card.cardId;
          }
        }

        const transaction = await storage.createTransaction(req.body);
        res.json(transaction);
      } catch (error) {
        res.status(500).json({ message: "Error creating transaction" });
      }
    },
  );

  app.post("/api/nfc-payment", async (req, res) => {
    const { cardId, shopId, amount, cart } = req.body;
    const orderNumber = await getNextOrderNumber(); // อิอิ
    const requestId =
      req.headers["x-request-id"] ||
      Math.random().toString(36).substring(2, 10);
    console.log(`[${requestId}] เริ่มการชำระเงิน NFC`, req.body);

    try {
      const { cardId, shopId, amount } = req.body;

      console.log("Received NFC payment request:", { cardId, shopId, amount });

      if (!cardId || shopId === undefined || amount === undefined) {
        return res.status(400).json({
          message: "Missing required fields: cardId, shopId, or amount",
        });
      }

      // ป้องกันการประมวลผลธุรกรรมซ้ำ
      if (checkDuplicateTransaction(cardId, shopId, amount)) {
        console.log(
          `ป้องกันการประมวลผลธุรกรรมซ้ำ: ${cardId} - ${shopId} - ${amount}`,
        );
        // ส่งข้อมูลธุรกรรมสำเร็จกลับไป เพื่อไม่ให้ UI พยายามส่งคำขอซ้ำ
        return res.status(200).json({
          success: true,
          message: "การชำระเงินสำเร็จแล้ว",
          isDuplicate: true,
        });
      }

      // Convert shopId to number if it's a string
      const shopIdNum =
        typeof shopId === "string" ? parseInt(shopId, 10) : shopId;

      if (isNaN(shopIdNum)) {
        return res.status(400).json({ message: "Invalid shop ID format" });
      }

      console.log("Looking for shop with ID:", shopIdNum);

      // Check if shop exists
      let shop;
      // Shop fetch tracking

      try {
        shop = await storage.getShop(shopIdNum);
        console.log(`Found shop via storage: ${shop?.name || "Unknown"}`);
      } catch (error) {
        console.error(`Error getting shop with ID ${shopIdNum}:`, error);
      }

      // If shop still not found, try to fetch directly from Airtable
      if (!shop) {
        console.warn(
          `Shop with ID ${shopIdNum} not found in primary storage, trying direct Airtable access`,
        );

        try {
          // Try to fetch shop directly from Airtable
          if ((storage as any).base) {
            console.log(`Querying Airtable directly for Shop ID ${shopIdNum}`);
            // Get all shops from Airtable to find the one with matching ID
            const records = await (storage as any).base("Shops").select().all();

            for (const record of records) {
              // Check if this record has our ID - log each shop being checked
              console.log(
                `Checking Airtable shop: ID=${record.fields.id}, Name=${record.fields.name}`,
              );

              if (
                record.fields.id &&
                parseInt(record.fields.id) === shopIdNum
              ) {
                console.log(
                  `Found shop in Airtable with ID ${shopIdNum}: ${record.fields.name}`,
                );
                // Convert Airtable record to our shop format
                shop = {
                  id: parseInt(record.fields.id),
                  name: record.fields.name || `Shop ${shopIdNum}`,
                  description: record.fields.description || null,
                  ownerId: 1, // Default owner ID
                  icon: record.fields.icon || "shopping-bag",
                  iconColor: record.fields.icon || "gray", // Use icon field as color based on mapping
                  status: record.fields.status || "active",
                };
                break;
              }
            }
          }
        } catch (airtableError) {
          console.error(
            "Error fetching shop directly from Airtable:",
            airtableError,
          );
        }

        // If still not found, return error
        if (!shop) {
          console.error(
            `Shop with ID ${shopIdNum} not found in Airtable or system`,
          );
          return res.status(404).json({ message: "Shop not found" });
        }
      }

      console.log(`Found shop: ${shop.name}`);

      // Find the card or create it if it doesn't exist
      let card;
      try {
        card = await storage.getNfcCardByCardId(cardId);
      } catch (error) {
        console.error("Error getting card:", error);
      }

      if (!card) {
        // NFC Card not found, return error instead of creating new card
        console.log(
          `Card ID ${cardId} not found in database. Payment rejected.`,
        );
        return res.status(404).json({
          message: "ไม่พบหมายเลขบัตร NFC ในระบบ",
          error: "card_not_found",
          details:
            "กรุณาตรวจสอบว่าหมายเลขบัตรถูกต้อง หรือใช้บัตรที่ลงทะเบียนในระบบแล้วเท่านั้น",
        });
      }

      // Check if card has enough balance
      if (card.balance < amount) {
        return res
          .status(400)
          .json({ message: "Insufficient balance on NFC card" });
      }

      // Update card balance
      let updatedCard;
      try {
        // Search for the card again by cardId to get the latest Airtable record ID
        const freshAirtableCard = await storage.getNfcCardByCardId(card.cardId);

        if (freshAirtableCard && (freshAirtableCard as any).airtableRecordId) {
          // Use the Airtable record ID directly for updates
          console.log(
            `Using Airtable Record ID ${(freshAirtableCard as any).airtableRecordId} for direct update`,
          );

          try {
            // Update the card using Airtable's API directly
            const airtableFields = {
              balance: card.balance - amount,
              lastUsed: new Date().toLocaleString("en-US", {
                timeZone: "Asia/Bangkok",
              }),
            };

            // Airtable expects fields to be passed directly, not wrapped in a fields object
            // Access the Airtable base from the storage implementation
            if ((storage as any).base) {
              const updatedRecord = await (storage as any)
                .base("NFCCards")
                .update(
                  (freshAirtableCard as any).airtableRecordId,
                  airtableFields,
                );
              console.log(
                "Successfully updated card in Airtable:",
                updatedRecord.fields.balance,
              );
            } else {
              throw new Error("Airtable base not available");
            }

            updatedCard = {
              ...card,
              balance: card.balance - amount,
              lastUsed: new Date(),
            };
          } catch (directUpdateError) {
            console.error(
              "Error with direct Airtable update:",
              directUpdateError,
            );
            throw directUpdateError;
          }
        } else {
          // Fall back to regular update
          updatedCard = await storage.updateNfcCard(card.id, {
            balance: card.balance - amount,
            lastUsed: new Date(),
          });
        }
      } catch (updateError) {
        console.error("Error updating card:", updateError);
        // Create fallback updated card
        updatedCard = {
          ...card,
          balance: card.balance - amount,
          lastUsed: new Date(),
        };
        console.log(
          `Using fallback updated card with balance ${updatedCard.balance}`,
        );
      }

      // Create transaction record
      let transaction;
      try {
        // Try to create transaction directly in Airtable
        if ((storage as any).base) {
          try {
            // Create fields object directly without 'fields' wrapper
            const transactionFields = {
              orderNumber,
              amount,
              shopId: shopIdNum.toString(),
              cardId: card.cardId,
              status: "completed",
              previousBalance: card.balance,
              newBalance: card.balance - amount,
              timestamp: new Date().toLocaleString("en-US", {
                timeZone: "Asia/Bangkok",
              }),
              items: req.body.items ?? "", // <<<< เพิ่มบรรทัดนี้!
              shopName: req.body.shopName ?? shop.name,
              type: "purchase",
              cart: cart ? JSON.stringify(cart) : "",
            };

            // Create the transaction directly
            const createdRecord = await (storage as any)
              .base("Transactions")
              .create(transactionFields);
            transaction = {
              id:
                parseInt(createdRecord.id) ||
                Math.floor(Math.random() * 1000) + 1000,
              orderNumber: createdRecord.fields?.orderNumber, // << ตรงนี้!
              amount,
              shopId: shopIdNum,
              cardId: card.cardId, // Use actual NFC card ID instead of internal ID
              type: "purchase", // For our interface
              status: "completed",
              previousBalance: card.balance,
              newBalance: card.balance - amount,
              timestamp: new Date(
                new Date().toLocaleString("en-US", {
                  timeZone: "Asia/Bangkok",
                }),
              ),
            };
            console.log("Successfully created transaction in Airtable");
          } catch (directTransactionError) {
            console.error(
              "Error creating transaction directly in Airtable:",
              directTransactionError,
            );
            throw directTransactionError;
          }
        } else {
          // Fall back to storage interface
          // Convert cardId (string) to an integer for the transaction
          const numericCardId = parseInt(card.id.toString());

          transaction = await storage.createTransaction({
            amount,
            shopId: shopIdNum,
            cardId: numericCardId, // Use numeric ID for database schema compatibility
            type: "purchase", // Required field for TypeScript
            status: "completed",
            previousBalance: card.balance,
            newBalance: card.balance - amount,
          });
        }
      } catch (transactionError) {
        console.error("Error creating transaction:", transactionError);
        // Create fallback transaction
        transaction = {
          id: transaction?.id,
          orderNumber, //  อิอิ
          amount,
          shopId: shopIdNum,
          cardId: card.cardId, // Use actual NFC card ID instead of internal ID
          // Note: type is needed for our interface but not for Airtable
          type: "purchase",
          status: "completed",
          previousBalance: card.balance,
          newBalance: card.balance - amount,
          timestamp: new Date(
            new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }),
          ),
        };
        console.log(`Using fallback transaction with ID ${transaction.id}`);
      }

      res.json({
        success: true,
        card: updatedCard,
        transaction,
        remainingBalance: updatedCard.balance,
      });
    } catch (error) {
      console.error("Error processing NFC payment:", error);
      res.status(500).json({ message: "Error processing NFC payment" });
    }
  });

  //////////////////////////////////////
  app.get("/api/Overview", async (req, res) => {
    try {
      const { cardId, shopId } = req.query;

      let txns: Transaction[] = [];

      // ถ้า storage รับเป็น number ต้องแปลงก่อน
      if (typeof storage.getTransactionsByCard === "function" && cardId) {
        const cardIdNum = Number(cardId);
        txns = await storage.getTransactionsByCard(cardIdNum);
      } else if (
        typeof storage.getTransactionsByShop === "function" &&
        shopId
      ) {
        const shopIdNum = Number(shopId);
        txns = await storage.getTransactionsByShop(shopIdNum);
      } else if (typeof storage.getTransactions === "function") {
        txns = await storage.getTransactions();
      }

      // filter อีกที (optional)
      if (cardId) {
        txns = txns.filter((txn) => `${txn.cardId}` === `${cardId}`);
      }
      if (shopId) {
        txns = txns.filter((txn) => `${txn.shopId}` === `${shopId}`);
      }

      const toDate = (value: string | Date | undefined): Date => {
        if (!value) return new Date(0);
        if (value instanceof Date) return value;
        return new Date(value);
      };

      txns = txns
        .sort((a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0))
        .slice(-50); // ใช้ slice(-50) เพื่อดึง 50 อันหลังสุด (เก่าสุด→ใหม่สุด)

      res.json({ transactions: txns });
    } catch (e: any) {
      res
        .status(500)
        .json({ message: "Error fetching payment history", error: e.message });
    }
  });

  // แนะนำให้ใช้ requireAuth (middleware) ครอบ endpoint นี้ด้วย
  app.get("/api/payment-history", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (typeof userId !== "number") {
        return res.status(401).json({ message: "No userId" });
      }
      const shop = await storage.getShop(userId);

      const shopId = shop?.id;
      if (!shopId) {
        return res.status(401).json({ message: "Unauthorized, no shopId" });
      }

      let txns: Transaction[] = [];
      // ดึงเฉพาะรายการของร้านนี้
      if (typeof storage.getTransactionsByShop === "function") {
        txns = await storage.getTransactionsByShop(shopId);
      } else {
        txns = await storage.getTransactions();
        txns = txns.filter((txn) => `${txn.shopId}` === `${shopId}`);
      }

      // sort เอา orderNumber ล่าสุดสุดท้าย 50 รายการ
      txns = txns
        .sort((a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0))
        .slice(-50); // เก่าสุด→ใหม่สุด

      res.json({ transactions: txns });
    } catch (e: any) {
      res
        .status(500)
        .json({ message: "Error fetching payment history", error: e.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
