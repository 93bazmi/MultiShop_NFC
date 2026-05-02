import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { API } from "@/lib/airtable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wine,
  ShoppingBag,
  ChefHat,
  CreditCard,
  ArrowLeft,
  Coffee,
  Cookie,
  IceCream,
  Sandwich,
} from "lucide-react";
import { cn } from "@/lib/utils";
import POSSystem from "@/components/pos/POSSystem";
import { Shop, Product } from "@shared/schema";
import useNFC from "@/hooks/use-nfc";
import { useAuth } from "@/components/auth/AuthProvider";
import PaymentHistoryPage from "@/pages/PaymentHistoryPage";

const ShopDetailPage = () => {
  // useRoute("/shop/me") ไม่ต้องอ่าน id แล้ว
  // const [, params] = useRoute("/shop/me");

  const { shop, isLoading: shopLoading } = useAuth();

  const [showPOS, setShowPOS] = useState(false);
  const [posKey, setPosKey] = useState(0);
  const { data: shops = [] } = useQuery({ queryKey: [API.SHOPS] }); // เพิ่มบรรทัดนี้
  const shopIdStr = shop?.id ? String(shop.id) : undefined;

  useNFC({ allowNFCReading: false });

  // ดึง product ทั้งหมด
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: [API.PRODUCTS],
  });
  const sortedProducts = Array.isArray(products)
    ? [...products].sort((a: Product, b: Product) => {
        // เรียงตาม shopId ก่อน แล้วตาม id สินค้า
        if (a.shopId === b.shopId) {
          return a.id - b.id;
        }
        return a.shopId - b.shopId;
      })
    : [];
  // Filter เฉพาะของ allfood หรือ shop ปกติ
  let displayedProducts: Product[] = [];
  const shopData = shop as Shop;
  if (shop?.icon === "food" && shop?.username?.startsWith("allfood")) {
    // All Food → เมนู food ทุกร้าน
    displayedProducts = (products as Product[]).filter(
      (p) => p.icon === "food",
    );
  } else {
    // ร้านอื่น โชว์แค่ของร้านนั้น
    displayedProducts = (products as Product[]).filter(
      (p) => String(p.shopId) === String(shopData.id),
    );
  }
  // ใส่ .sort() ตรงนี้
  displayedProducts = [...displayedProducts].sort((a, b) => {
    // เรียงตาม shopId ก่อน แล้วตาม id
    if (a.shopId === b.shopId) return a.id - b.id;
    return a.shopId - b.shopId;
  });
  // Get icon for shop
  const getShopIcon = (shop: Shop) => {
    switch (shop?.icon) {
      case "wine":
        return <Wine className="text-white" size={24} />;
      case "food":
        return <ChefHat className="text-white" size={24} />;
      default:
        return <ShoppingBag className="text-white" size={24} />;
    }
  };

  // Get background color class for icon
  const getIconBgColor = (shop: Shop) => {
    switch (shop?.iconColor) {
      case "blue":
        return "from-blue-500 to-blue-600";
      case "purple":
        return "from-purple-500 to-purple-600";
      case "green":
        return "from-green-500 to-green-600";
      case "yellow":
        return "from-yellow-500 to-yellow-600";
      default:
        return "from-blue-500 to-blue-600";
    }
  };

  // Get product icon
  const getProductIcon = (product: Product) => {
    switch (product.icon) {
      case "coffee":
        return <Coffee className="text-gray-600 text-lg" />;
      case "cookie":
        return <Cookie className="text-gray-600 text-lg" />;
      case "ice-cream":
        return <IceCream className="text-gray-600 text-lg" />;
      case "sandwich":
        return <Sandwich className="text-gray-600 text-lg" />;
      default:
        return <ChefHat className="text-gray-600 text-lg" />;
    }
  };

  if (shopLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="animate-pulse">
              <div className="h-40 bg-gray-200 rounded-lg mb-4"></div>
              <Skeleton className="h-6 w-1/3 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Shop not found</CardTitle>
            <CardDescription>
              No shop data found for what you're looking for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/shops")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to shop list
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          {/* <Button variant="outline" onClick={() => window.location.href = "/shops"}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับไปยังรายการร้านค้า
          </Button> */}
        </div>

        <Card className="overflow-hidden border-none shadow-md">
          {/* Shop Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center">
              <div
                className={cn(
                  "h-16 w-16 md:h-20 md:w-20 rounded-full flex items-center justify-center mr-4 mb-4 md:mb-0",
                  "bg-gradient-to-br",
                  getIconBgColor(shopData),
                )}
              >
                {getShopIcon(shopData)}
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
                  {shopData.name}
                </h1>
                <p className="text-blue-100">
                  {shopData.description || "ไม่มีรายละเอียด"}
                </p>
                <div
                  className={cn(
                    "inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2",
                    shopData.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800",
                  )}
                >
                  {shopData.status === "active" ? "Open" : "Closed"}
                </div>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-800">
              สินค้าของร้าน
            </h2>

            <div>
              {productsLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i}>
                      <Skeleton className="h-16 w-full rounded-lg mb-2" />
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {displayedProducts.length === 0 ? (
                    <div className="col-span-2 flex flex-col items-center text-gray-400 py-12">
                      <ChefHat className="h-12 w-12 mb-2" />
                      <p>ไม่พบเมนูอาหาร</p>
                    </div>
                  ) : (
                    displayedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="border border-gray-200 rounded-lg p-3"
                      >
                        <div className="mb-2 bg-gray-100 rounded-lg p-2 flex items-center justify-center h-12">
                          <ChefHat className="text-gray-600 text-xl" />
                        </div>
                        <div className="text-sm font-medium text-gray-800 mb-1 truncate">
                          {product.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {product.price} Coins
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                className="px-6 py-6 text-base bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all duration-300"
                onClick={() => {
                  // เคลียร์และรีเซ็ต POS
                  setPosKey((prev) => prev + 1);
                  setShowPOS(true);
                }}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Select products and checkout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* POS System Modal */}
      <POSSystem
        key={posKey} // ใช้ key เพื่อ force reset component
        open={showPOS}
        onClose={() => setShowPOS(false)}
        activeShop={shopData}
      />
    </>
  );
};

export default ShopDetailPage;
