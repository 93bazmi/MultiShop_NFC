import { useState } from "react";
import { Transaction, NfcCard } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Wifi, Plus } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface NFCActivityProps {
  transactions: Transaction[];
  nfcCards: NfcCard[];
  isLoading: boolean;
}

const NFCActivity = ({ transactions, nfcCards, isLoading }: NFCActivityProps) => {
  const [visibleActivities, setVisibleActivities] = useState(4);

  // Get card by ID
  const getCard = (cardId?: number) => {
    if (!cardId) return undefined;
    return nfcCards.find(card => card.id === cardId);
  };

  // Format time difference
  const getTimeDifference = (timestamp: Date) => {
    if (!timestamp) return "Unknown time";
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  // Recent NFC activities
  const nfcActivities = transactions
    .filter(t => t.cardId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, visibleActivities)
    .map(t => {
      const card = getCard(t.cardId);
      return {
        ...t,
        cardNumber: card?.cardId || "Unknown",
      };
    });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">NFC Card Activity</h3>
        <button 
          className="text-sm font-medium text-primary hover:text-blue-700"
          onClick={() => setVisibleActivities(prev => prev === 4 ? 8 : 4)}
        >
          {visibleActivities === 4 ? "View All" : "Show Less"}
        </button>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center mb-4 border-b border-gray-100 pb-4">
              <Skeleton className="h-10 w-10 rounded-full mr-4" />
              <div className="flex-1">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-4 w-32 mt-1" />
                <Skeleton className="h-4 w-16 mt-1" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {nfcActivities.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No NFC activity found
            </div>
          ) : (
            nfcActivities.map((activity, index) => (
              <div key={index} className={cn(
                "flex items-center mb-4",
                index < nfcActivities.length - 1 && "border-b border-gray-100 pb-4"
              )}>
                <div className={cn(
                  "rounded-full p-3 mr-4",
                  activity.type === "topup" ? "bg-green-100" : "bg-blue-100"
                )}>
                  {activity.type === "topup" ? (
                    <Plus className="text-green-600" />
                  ) : (
                    <Wifi className="text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-gray-800">Card #{activity.cardNumber}</p>
                    <p className="text-sm text-gray-500">{getTimeDifference(activity.timestamp)}</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    {activity.type === "purchase" ? "Used at Shop" : "Recharged"}
                  </p>
                  <p className={cn(
                    "text-sm font-medium",
                    activity.type === "topup" ? "text-green-600" : "text-primary"
                  )}>
                    {activity.type === "topup" ? "+" : "-"}{activity.amount} Coins
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NFCActivity;
