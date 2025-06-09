import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { API } from "@/lib/airtable";
import { Transaction, Shop, NfcCard } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { RefreshCcw, Search, FileDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TransactionsPage = () => {
  const [shopFilter, setShopFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [transactionType, setTransactionType] = useState<string>("all");

  // Fetch transactions
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: [API.TRANSACTIONS],
  });

  // Fetch shops
  const { data: shops, isLoading: isLoadingShops } = useQuery({
    queryKey: [API.SHOPS],
  });

  // Fetch NFC cards
  const { data: nfcCards, isLoading: isLoadingNfcCards } = useQuery({
    queryKey: [API.NFC_CARDS],
  });

  // Get shop by ID
  const getShop = (shopId: number) => {
    return shops?.find((shop: Shop) => shop.id === shopId);
  };

  // Get card by ID
  const getCard = (cardId?: number) => {
    if (!cardId) return undefined;
    return nfcCards?.find((card: NfcCard) => card.id === cardId);
  };

  // Format date
  const formatDate = (date: Date) => {
    if (!date) return "N/A";
    return format(new Date(date), "MMM d, yyyy h:mm a");
  };

  // Filter transactions
  const filteredTransactions = transactions
    ? transactions.filter((transaction: Transaction) => {
        // Filter by shop
        if (shopFilter !== "all" && transaction.shopId.toString() !== shopFilter) {
          return false;
        }

        // Filter by transaction type
        if (transactionType !== "all" && transaction.type !== transactionType) {
          return false;
        }

        // Search by card ID or amount
        if (searchTerm) {
          const card = getCard(transaction.cardId);
          const cardId = card?.cardId || "";
          const amount = transaction.amount.toString();
          
          return (
            cardId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            amount.includes(searchTerm)
          );
        }

        return true;
      })
    : [];

  // Calculate total volume
  const totalVolume = filteredTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0
  );

  const isLoading = isLoadingTransactions || isLoadingShops || isLoadingNfcCards;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Transactions</CardTitle>
          <CardDescription>
            View and manage all transactions across your shops
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={shopFilter} onValueChange={setShopFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter by shop" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shops</SelectItem>
                  {shops?.map((shop: Shop) => (
                    <SelectItem key={shop.id} value={shop.id.toString()}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={transactionType} onValueChange={setTransactionType}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Transaction type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="topup">Top-up</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <FileDown className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-gray-500">Total Transactions</div>
                <div className="text-2xl font-bold mt-1">{filteredTransactions.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-gray-500">Transaction Volume</div>
                <div className="text-2xl font-bold mt-1">{totalVolume} Coins</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-gray-500">Average Transaction</div>
                <div className="text-2xl font-bold mt-1">
                  {filteredTransactions.length > 0
                    ? Math.round(totalVolume / filteredTransactions.length)
                    : 0}{" "}
                  Coins
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Transactions</TabsTrigger>
              <TabsTrigger value="recent">Recent Transactions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Shop</TableHead>
                        <TableHead>Card ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Previous</TableHead>
                        <TableHead>New Balance</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                            No transactions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTransactions.map((transaction: Transaction) => {
                          const shop = getShop(transaction.shopId);
                          const card = getCard(transaction.cardId);
                          
                          return (
                            <TableRow key={transaction.id}>
                              <TableCell>{transaction.id}</TableCell>
                              <TableCell>{shop?.name || "Unknown Shop"}</TableCell>
                              <TableCell>{card?.cardId ? `#${card.cardId}` : "N/A"}</TableCell>
                              <TableCell className="capitalize">{transaction.type}</TableCell>
                              <TableCell className={cn(
                                "font-medium",
                                transaction.type === "topup" ? "text-green-600" : "text-gray-900"
                              )}>
                                {transaction.type === "topup" ? "+" : "-"}
                                {transaction.amount} Coins
                              </TableCell>
                              <TableCell>
                                {transaction.previousBalance !== null && transaction.previousBalance !== undefined 
                                  ? `${transaction.previousBalance} Coins` 
                                  : "N/A"}
                              </TableCell>
                              <TableCell>
                                {transaction.newBalance !== null && transaction.newBalance !== undefined 
                                  ? `${transaction.newBalance} Coins` 
                                  : "N/A"}
                              </TableCell>
                              <TableCell>{formatDate(transaction.timestamp)}</TableCell>
                              <TableCell>
                                <span className={cn(
                                  "px-2 py-1 rounded-full text-xs",
                                  transaction.status === "completed" 
                                    ? "bg-green-100 text-green-800" 
                                    : transaction.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
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
            </TabsContent>
            
            <TabsContent value="recent">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Shop</TableHead>
                        <TableHead>Card ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Previous</TableHead>
                        <TableHead>New Balance</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.slice(0, 10).map((transaction: Transaction) => {
                        const shop = getShop(transaction.shopId);
                        const card = getCard(transaction.cardId);
                        
                        return (
                          <TableRow key={transaction.id}>
                            <TableCell>{transaction.id}</TableCell>
                            <TableCell>{shop?.name || "Unknown Shop"}</TableCell>
                            <TableCell>{card?.cardId ? `#${card.cardId}` : "N/A"}</TableCell>
                            <TableCell className="capitalize">{transaction.type}</TableCell>
                            <TableCell className={cn(
                              "font-medium",
                              transaction.type === "topup" ? "text-green-600" : "text-gray-900"
                            )}>
                              {transaction.type === "topup" ? "+" : "-"}
                              {transaction.amount} Coins
                            </TableCell>
                            <TableCell>
                              {transaction.previousBalance !== null && transaction.previousBalance !== undefined 
                                ? `${transaction.previousBalance} Coins` 
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              {transaction.newBalance !== null && transaction.newBalance !== undefined 
                                ? `${transaction.newBalance} Coins` 
                                : "N/A"}
                            </TableCell>
                            <TableCell>{formatDate(transaction.timestamp)}</TableCell>
                            <TableCell>
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs",
                                transaction.status === "completed" 
                                  ? "bg-green-100 text-green-800" 
                                  : transaction.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              )}>
                                {transaction.status && transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1) || "Pending"}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionsPage;
