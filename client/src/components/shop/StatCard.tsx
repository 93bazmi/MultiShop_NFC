import { 
  LineChart, 
  ChartColumnStacked, 
  ShoppingBag, 
  ArrowUpRight 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: string;
  color: "blue" | "purple" | "green" | "yellow" | "red";
}

const StatCard = ({ title, value, change, icon, color }: StatCardProps) => {
  const getIcon = () => {
    switch (icon) {
      case "chart-line":
        return <LineChart className={`text-${color}-600 text-xl`} />;
      case "store":
        return <ShoppingBag className={`text-${color}-600 text-xl`} />;
      case "exchange-alt":
        return <ArrowUpRight className={`text-${color}-600 text-xl`} />;
      default:
        return <LineChart className={`text-${color}-600 text-xl`} />;
    }
  };

  const bgColorMap = {
    blue: "bg-blue-100",
    purple: "bg-purple-100",
    green: "bg-green-100",
    yellow: "bg-yellow-100",
    red: "bg-red-100",
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="text-sm text-green-500 mt-1">
            <span className="inline-block mr-1">
              <ArrowUpRight className="h-3 w-3" />
            </span>
            <span>{change}</span>
          </p>
        </div>
        <div className={cn("p-3 rounded-full", bgColorMap[color])}>
          {getIcon()}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
