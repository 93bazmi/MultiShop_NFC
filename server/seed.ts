import { db } from "./db";
import { users, shops, products, nfcCards, transactions } from "@shared/schema";

async function seed() {
  console.log("Seeding PostgreSQL database...");

  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log("Seed skipped: database already contains users.");
    return;
  }

  const [adminUser] = await db
    .insert(users)
    .values({
      username: "admin",
      password: "admin123",
      name: "System Admin",
      role: "admin",
    })
    .returning();

  const createdShops = await db
    .insert(shops)
    .values([
      {
        name: "Coffee Shop",
        description: "Fresh coffee and pastries",
        ownerId: adminUser.id,
        icon: "coffee",
        iconColor: "brown",
        status: "active",
      },
      {
        name: "Thai Restaurant",
        description: "Authentic Thai food",
        ownerId: adminUser.id,
        icon: "utensils",
        iconColor: "green",
        status: "active",
      },
      {
        name: "Tech Gadgets",
        description: "Innovative tech for everyday use",
        ownerId: adminUser.id,
        icon: "shopping-bag",
        iconColor: "blue",
        status: "active",
      },
      {
        name: "Clothing Store",
        description: "Fashion and apparel",
        ownerId: adminUser.id,
        icon: "shirt",
        iconColor: "purple",
        status: "active",
      },
    ])
    .returning();

  const shopByName = new Map(createdShops.map((shop) => [shop.name, shop]));

  await db.insert(products).values([
    {
      name: "Coffee",
      description: "Fresh brewed coffee",
      price: 45,
      shopId: shopByName.get("Coffee Shop")!.id,
      icon: "coffee",
      available: true,
    },
    {
      name: "Croissant",
      description: "Butter croissant",
      price: 35,
      shopId: shopByName.get("Coffee Shop")!.id,
      icon: "sandwich",
      available: true,
    },
    {
      name: "Pad Thai",
      description: "Classic Thai noodle dish",
      price: 89,
      shopId: shopByName.get("Thai Restaurant")!.id,
      icon: "utensils",
      available: true,
    },
    {
      name: "Tom Yum Soup",
      description: "Spicy Thai soup",
      price: 79,
      shopId: shopByName.get("Thai Restaurant")!.id,
      icon: "soup",
      available: true,
    },
    {
      name: "Smartphone",
      description: "Latest model",
      price: 15000,
      shopId: shopByName.get("Tech Gadgets")!.id,
      icon: "smartphone",
      available: true,
    },
    {
      name: "Headphones",
      description: "Noise cancelling",
      price: 2500,
      shopId: shopByName.get("Tech Gadgets")!.id,
      icon: "headphones",
      available: true,
    },
    {
      name: "T-shirt",
      description: "Cotton t-shirt",
      price: 399,
      shopId: shopByName.get("Clothing Store")!.id,
      icon: "shirt",
      available: true,
    },
    {
      name: "Jeans",
      description: "Slim fit jeans",
      price: 899,
      shopId: shopByName.get("Clothing Store")!.id,
      icon: "scissors",
      available: true,
    },
  ]);

  const [cardA, cardB] = await db
    .insert(nfcCards)
    .values([
      {
        cardId: "NFC100001",
        balance: 500,
        active: true,
      },
      {
        cardId: "NFC100002",
        balance: 250,
        active: true,
      },
    ])
    .returning();

  await db.insert(transactions).values([
    {
      amount: 200,
      cardId: cardA.id,
      type: "topup",
      status: "completed",
      previousBalance: 300,
      newBalance: 500,
      orderNumber: 1,
    },
    {
      amount: 89,
      shopId: shopByName.get("Thai Restaurant")!.id,
      cardId: cardB.id,
      type: "purchase",
      status: "completed",
      previousBalance: 339,
      newBalance: 250,
      shopName: "Thai Restaurant",
      items: "Pad Thai",
      cart: JSON.stringify([{ name: "Pad Thai", qty: 1, price: 89 }]),
      orderNumber: 2,
    },
  ]);

  console.log("Seed complete.");
  console.log("Login with username: admin");
  console.log("Login with password: admin123");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
