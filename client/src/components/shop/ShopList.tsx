import { useState } from "react";
import { Shop } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Wine, ShoppingBag, ChefHat, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import POSSystem from "@/components/pos/POSSystem";

interface ShopListProps {
  shops: Shop[];
  isLoading: boolean;
}

const ShopList = ({ shops, isLoading }: ShopListProps) => {
  const [showPOS, setShowPOS] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  // Get icon for shop
  const getShopIcon = (shop: Shop) => {
    switch (shop.icon) {
      case "wine":
        return <Wine className="text-primary" />;
      case "food":
        return <ChefHat className="text-primary" />;
      default:
        return <ShoppingBag className="text-primary" />;
    }
  };

  // Get background color class for icon
  const getIconBgColor = (shop: Shop) => {
    switch (shop.iconColor) {
      case "white":
        return "bg-white-100";
      case "purple":
        return "bg-purple-100";
      case "green":
        return "bg-green-100";
      case "yellow":
        return "bg-yellow-100";
      default:
        return "bg-blue-100";
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
            All Shop
          </h3>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-xl p-5 bg-gray-50"
              >
                <div className="flex items-center mb-3">
                  <Skeleton className="h-12 w-12 rounded-full mr-3" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {shops.length === 0 ? (
              <div className="col-span-full text-center py-10 text-gray-500">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <ShoppingBag className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-lg">Shop Not Found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Sorry, no shops are available at the moment
                </p>
              </div>
            ) : (
              shops.map((shop) => (
                <div
                  key={shop.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer relative overflow-hidden group"
                  onClick={() => {
                    window.location.href = `/shop/${shop.id}`;
                  }}
                >
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-all duration-300"></div>

                  <div className="flex items-center mb-3 md:mb-4">
                    <div
                      className={cn(
                        "h-12 w-12 md:h-14 md:w-14 rounded-full flex items-center justify-center mr-3 md:mr-4",
                        "bg-gradient-to-br",
                        shop.iconColor === "blue"
                          ? "from-blue-500 to-blue-600"
                          : shop.iconColor === "purple"
                            ? "from-purple-500 to-purple-600"
                            : shop.iconColor === "green"
                              ? "from-green-500 to-green-600"
                              : "from-yellow-500 to-yellow-600",
                      )}
                    >
                      {getShopIcon(shop)}
                    </div>
                    <h4 className="text-base md:text-lg font-bold text-gray-800">
                      {shop.name}
                    </h4>
                  </div>

                  <div className="space-y-2 md:space-y-3 mb-3 md:mb-4">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-gray-500">Description:</span>
                      <span className="font-medium text-gray-800 text-right max-w-[150px] md:max-w-full truncate">
                        {shop.description || "No description"}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-gray-500">Status:</span>
                      <div
                        className={cn(
                          "px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs font-semibold",
                          shop.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800",
                        )}
                      >
                        {shop.status === "active" ? "Open" : "Closed"}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      className="w-full mt-2 gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-300 text-xs md:text-sm border"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/shop/${shop.id}`;
                      }}
                    >
                      <ShoppingBag className="h-3 w-3 md:h-4 md:w-4" />
                      Go to shop
                    </Button>

                    {/* <Button 
                      className="w-full mt-2 gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all duration-300 text-xs md:text-sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedShop(shop);
                        setShowPOS(true);
                      }}
                    >
                      <CreditCard className="h-3 w-3 md:h-4 md:w-4" />
                      ชำระเงิน
                    </Button> */}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* POS System Modal */}
      {selectedShop && (
        <POSSystem
          open={showPOS}
          onClose={() => setShowPOS(false)}
          activeShop={selectedShop}
        />
      )}
    </>
  );
};

export default ShopList;
