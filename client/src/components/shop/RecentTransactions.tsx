import { useState } from "react";
import { Transaction, Shop } from "@shared/schema";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Coffee, 
  ShoppingBag, 
  Book, 
  PizzaIcon 
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface RecentTransactionsProps {
  transactions: Transaction[];
  shops: Shop[];
  isLoading: boolean;
}

const RecentTransactions = ({ transactions, shops, isLoading }: RecentTransactionsProps) => {
  const [visibleTransactions, setVisibleTransactions] = useState(5);

  // Get shop by ID
  const getShop = (shopId: number) => {
    return shops.find(shop => shop.id === shopId);
  };

  // Get icon for shop
  const getShopIcon = (shop?: Shop) => {
    if (!shop) return <ShoppingBag className="text-gray-500" />;
    
    switch (shop.icon) {
      case "coffee":
        return <Coffee className="text-gray-500" />;
      case "book":
        return <Book className="text-gray-500" />;
      case "pizza":
        return <PizzaIcon className="text-gray-500" />;
      default:
        return <ShoppingBag className="text-gray-500" />;
    }
  };

  // Get formatted date
  const getFormattedDate = (timestamp: Date) => {
    if (!timestamp) return "Unknown date";
    return format(new Date(timestamp), "MMM d, yyyy");
  };

  const recentTransactions = transactions
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, visibleTransactions);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
        <button 
          className="text-sm font-medium text-primary hover:text-blue-700"
          onClick={() => setVisibleTransactions(prev => prev === 5 ? transactions.length : 5)}
        >
          {visibleTransactions === 5 ? "View All" : "Show Less"}
        </button>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="flex items-center">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-24 ml-3" />
              </div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                recentTransactions.map((transaction) => {
                  const shop = getShop(transaction.shopId);
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
                            {getShopIcon(shop)}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {shop?.name || "Unknown Shop"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {transaction.amount} Coins
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {getFormattedDate(transaction.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                          transaction.status === "completed" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-yellow-100 text-yellow-800"
                        )}>
                          {transaction.status && transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1) || "Pending"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default RecentTransactions;
