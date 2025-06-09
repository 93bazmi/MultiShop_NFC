import { useQuery } from "@tanstack/react-query";
import { API } from "@/lib/airtable";
import StatCard from "./StatCard";
import RecentTransactions from "./RecentTransactions";
import NFCActivity from "./NFCActivity";
import ShopList from "./ShopList";
import CoinManagement from "./CoinManagement";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const { data: shops, isLoading: isLoadingShops } = useQuery({
    queryKey: [API.SHOPS],
  });

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: [API.TRANSACTIONS],
  });

  const { data: nfcCards, isLoading: isLoadingNfcCards } = useQuery({
    queryKey: [API.NFC_CARDS],
  });

  // Calculate dashboard metrics
  const calculateMetrics = () => {
    if (!transactions || !shops || !nfcCards) return null;

    // Total sales
    const totalSales = transactions.reduce((acc, t) => (
      t.type === 'purchase' ? acc + t.amount : acc
    ), 0);

    // Total shops
    const totalShops = shops.length;

    // Total transactions
    const totalTransactions = transactions.length;

    // Total coins in circulation
    const totalCoins = nfcCards.reduce((acc, card) => acc + card.balance, 0);

    return {
      totalSales,
      totalShops,
      totalTransactions,
      totalCoins
    };
  };

  const metrics = calculateMetrics();
  const isLoading = isLoadingShops || isLoadingTransactions || isLoadingNfcCards;

  return (
    <div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-4 w-32 mt-2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard 
            title="Total Sales"
            value={`$${(metrics?.totalSales || 0) / 100}`}
            change="+8.2% from last month"
            icon="chart-line"
            color="blue"
          />
          <StatCard 
            title="Total Shops"
            value={metrics?.totalShops.toString() || "0"}
            change={`${Math.floor((metrics?.totalShops || 0) * 0.2)} new this month`}
            icon="store"
            color="purple"
          />
          <StatCard 
            title="Total Transactions"
            value={metrics?.totalTransactions.toString() || "0"}
            change="+12.5% from last month"
            icon="exchange-alt"
            color="green"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <RecentTransactions 
            transactions={transactions || []} 
            isLoading={isLoadingTransactions} 
            shops={shops || []}
          />
        </div>
        <div>
          <NFCActivity 
            transactions={transactions || []} 
            nfcCards={nfcCards || []} 
            isLoading={isLoadingTransactions || isLoadingNfcCards}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ShopList shops={shops || []} isLoading={isLoadingShops} />
        <CoinManagement 
          nfcCards={nfcCards || []} 
          totalCoins={metrics?.totalCoins || 0} 
          isLoading={isLoadingNfcCards}
        />
      </div>
    </div>
  );
};

export default Dashboard;
