import { useState, useEffect } from "react";
import { Shop, Product } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  X,
  Search,
  Coffee,
  Cookie,
  IceCream,
  ChefHat,
  Sandwich,
  ChevronsLeft,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { API } from "@/lib/airtable";
import NFCPaymentModal from "./NFCPaymentModal";
import NFCPaymentSuccess from "./NFCPaymentSuccess";
import ReceiptPage from "./ReceiptPage"; // เพิ่ม import
import { cn } from "@/lib/utils";

interface POSSystemProps {
  open: boolean;
  onClose: () => void;
  activeShop?: Shop;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const POSSystem = ({ open, onClose, activeShop }: POSSystemProps) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"nfc" | "cash">("nfc");
  const [showNfcPayment, setShowNfcPayment] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [showReceiptPage, setShowReceiptPage] = useState(false); // เพิ่ม state

  // Fetch products for the active shop
  const { data: products, isLoading } = useQuery({
    queryKey: [API.PRODUCTS, activeShop?.id, activeShop?.icon],
    queryFn: async () => {
      if (!activeShop) return [];

      if (activeShop.icon === "food") {
        // ถ้าร้านอาหาร ให้ดึงเมนูร้านอาหาร “ทุกสาขา”
        const response = await fetch(`${API.PRODUCTS}?shopType=food`);
        if (!response.ok) throw new Error("Failed to fetch food products");
        return response.json();
      } else {
        // ถ้าเป็นร้านไวน์ ดึงเฉพาะเมนูของร้านนั้น
        const response = await fetch(`${API.PRODUCTS}?shopId=${activeShop.id}`);
        if (!response.ok) throw new Error("Failed to fetch shop products");
        return response.json();
      }
    },
    enabled: !!activeShop,
  });
  // Reset cart when shop changes
  useEffect(() => {
    setCart([]);
  }, [activeShop]);

  // Filter products by search term
  const filteredProducts = products
    ? products.filter(
        (product: Product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.description || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      )
    : [];

  // Sort products: by shopId, then id
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (a.shopId === b.shopId) return a.id - b.id;
    return a.shopId - b.shopId;
  });

  // Add product to cart
  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.product.id === product.id,
      );

      if (existingItem) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      } else {
        return [...prevCart, { product, quantity: 1 }];
      }
    });
  };

  // Remove item from cart
  const removeFromCart = (productId: number) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.product.id !== productId),
    );
  };

  // Update item quantity
  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity < 1) return;

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item,
      ),
    );
  };

  // Calculate total
  const calculateTotal = () => {
    return cart.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0,
    );
  };

  // Get product icon
  const getProductIcon = (product: Product) => {
    switch (product.icon) {
      case "coffee":
        return <Coffee className="text-gray-600 text-xl" />;
      case "cookie":
        return <Cookie className="text-gray-600 text-xl" />;
      case "ice-cream":
        return <IceCream className="text-gray-600 text-xl" />;
      case "sandwich":
        return <Sandwich className="text-gray-600 text-xl" />;
      default:
        return <ChefHat className="text-gray-600 text-xl" />;
    }
  };

  // Process payment
  const processPayment = () => {
    // Check if there's an active shop before proceeding
    if (!activeShop || !activeShop.id) {
      console.error("No active shop selected or invalid shop ID");
      alert("Please select a shop before making a payment");
      return;
    }

    // ป้องกันการชำระเงินเมื่อ cart ว่าง
    if (cart.length === 0) {
      alert("Please select products before making a payment");
      return;
    }

    // ป้องกันการชำระเงินเมื่อยอดเงินเป็น 0
    const totalAmount = calculateTotal();
    if (totalAmount <= 0) {
      alert("The amount must be greater than 0");
      return;
    }

    if (paymentMethod === "nfc") {
      console.log(
        "Processing payment for shop ID:",
        activeShop.id,
        "Amount:",
        totalAmount,
      );
      setShowNfcPayment(true);
    } else {
      // Cash payment processing
      // In a real application, this would handle cash payment
      alert("Cash payment not implemented in this demo");
    }
  };

  // Handle NFC payment success
  const handlePaymentSuccess = (result: any) => {
    // เพิ่มรายการสินค้าลงในผลลัพธ์การชำระเงิน
    const resultWithCart = {
      ...result,
      cart: cart,
      shopName: activeShop?.name, // <<-- เพิ่มตรงนี้
    };

    setPaymentResult(resultWithCart);
    setShowNfcPayment(false);
    setShowPaymentSuccess(true);

    // ล้าง cart ทันทีหลังชำระเงินสำเร็จ
    setCart([]);

    // เมื่อ success modal เปิดแล้ว ให้ delay 2 วิ แล้วไปหน้าใบเสร็จ
    setTimeout(() => {
      setShowPaymentSuccess(false);
      setShowReceiptPage(true);
    }, 2000);
  };

  // Handle NFC payment modal close
  const handleNfcPaymentClose = () => {
    setShowNfcPayment(false);
  };

  // เพิ่มฟังก์ชันสำหรับการแสดงใบเสร็จ
  const handleShowReceipt = () => {
    setShowReceiptPage(true);
    setShowPaymentSuccess(false); // ปิด popup แสดงผลการชำระเงิน
    onClose(); // ปิด dialog ของ POSSystem
  };

  // Clear cart function
  const clearCart = () => {
    setCart([]);
  };

  // Close all modals and reset
  const handleCloseAll = () => {
    setShowNfcPayment(false);
    setShowPaymentSuccess(false);
    setShowReceiptPage(false);
    onClose();
  };

  // เพิ่มฟังก์ชันสำหรับกลับจากหน้าใบเสร็จ
  const handleCloseReceipt = () => {
    setShowReceiptPage(false);
  };

  // ถ้ากำลังแสดงหน้าใบเสร็จ ให้แสดงเฉพาะหน้าใบเสร็จ
  if (showReceiptPage) {
    return (
      <ReceiptPage
        paymentResult={paymentResult}
        onClose={handleCloseReceipt}
        onCompleteClose={handleCloseAll}
      />
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span> {activeShop?.name || "Shop"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Left Side - Products */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="mb-4">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search for products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-8"
                  />
                  <Search className="h-4 w-4 text-gray-400 absolute right-3 top-2.5" />
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 gap-3 max-h-[40vh] md:max-h-[60vh] overflow-y-auto">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      <Skeleton className="h-16 w-full rounded-lg mb-2" />
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-[40vh] md:max-h-[60vh] overflow-y-auto">
                  {sortedProducts.length === 0 ? (
                    <div className="col-span-2 flex flex-col items-center justify-center h-40 md:h-60 text-gray-500">
                      <ChevronsLeft className="h-8 w-8 md:h-12 md:w-12 mb-2" />
                      <p>No products found</p>
                    </div>
                  ) : (
                    sortedProducts.map((product: Product) => (
                      <div
                        key={product.id}
                        className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50"
                        onClick={() => addToCart(product)}
                      >
                        <div className="mb-2 bg-gray-100 rounded-lg p-2 flex items-center justify-center h-12 md:h-16">
                          {getProductIcon(product)}
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

            {/* Right Side - Cart & Payment */}
            <div>
              {/* Cart */}
              <div className="border border-gray-200 rounded-lg p-4 mb-4">
                <h4 className="text-md font-medium text-gray-800 mb-3">
                  Order
                </h4>
                <div className="max-h-[25vh] md:max-h-[30vh] overflow-y-auto mb-3">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[15vh] md:h-[20vh] text-gray-500">
                      <p>Order is empty</p>
                      <p className="text-xs mt-1">
                        Select products to continue ordering
                      </p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex justify-between items-center border-b border-gray-100 py-2"
                      >
                        <div className="flex items-center max-w-[50%]">
                          <div className="bg-gray-100 h-8 w-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                            {getProductIcon(item.product)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.product.price} Coins
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center flex-shrink-0">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(
                                item.product.id,
                                parseInt(e.target.value),
                              )
                            }
                            min={1}
                            className="w-12 px-2 py-1 text-sm mr-2"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">
                      Product price:
                    </span>
                    <span className="text-sm font-medium text-gray-800">
                      {calculateTotal()} Coins
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Tax:</span>
                    <span className="text-sm font-medium text-gray-800">
                      0 Coins
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-md font-medium text-gray-800">
                      Total:
                    </span>
                    <span className="text-md font-bold text-primary">
                      {calculateTotal()} Coins
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-800 mb-3">
                  Payment Method
                </h4>
                <div className="mb-4 flex items-center">
                  <Coffee className="mr-2 h-4 w-4" />
                  <span>NFC Card</span>
                </div>
                <div className="text-center">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={processPayment}
                    disabled={cart.length === 0}
                  >
                    Pay Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* NFC Payment Modal */}
      {activeShop && showNfcPayment && (
        <NFCPaymentModal
          open={showNfcPayment}
          onClose={handleNfcPaymentClose}
          amount={calculateTotal()}
          shopId={activeShop.id}
          shopName={activeShop.name}
          onSuccess={handlePaymentSuccess}
          cart={cart}
        />
      )}

      {/* Payment Success Modal */}
      <NFCPaymentSuccess
        open={showPaymentSuccess && !showReceiptPage}
        onClose={handleCloseAll}
        paymentResult={paymentResult}
        onPrintReceipt={handleShowReceipt}
        onClearCart={clearCart} // เพิ่ม prop สำหรับล้าง cart
      />
    </>
  );
};

export default POSSystem;
