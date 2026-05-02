import React, { useEffect, useState } from "react";
import { Transaction } from "@shared/schema";
import ReceiptPage from "@/components/pos/ReceiptPage";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";

type CartItem = {
  product: { name: string; price?: number };
  quantity: number;
};

export default function PaymentHistoryPage() {
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [searchOrderNo, setSearchOrderNo] = useState("");
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  const { shop } = useAuth(); // <<--- ดึง shop จาก context
  const shopId = shop?.id;
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetch(`${API_URL}/api/payment-history`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => setTransactions(data.transactions || []))
      .catch((err) => {
        setError("Session expired. Please login again.");
        console.error("Error:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter เฉพาะ All Food 1
  // ใส่ตรงนี้ในฟังก์ชัน

  // Filter เฉพาะร้านของ shopId ปัจจุบัน
  const filteredTransactions = transactions.filter(
    (txn) =>
      `${txn.shopId}` === `${shopId}` && // filter ด้วย shopId
      (!searchOrderNo ||
        txn.orderNumber?.toString().includes(searchOrderNo.trim())),
  );

  // Sort
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const aNo = a.orderNumber ?? 0;
    const bNo = b.orderNumber ?? 0;
    return sortOrder === "latest" ? bNo - aNo : aNo - bNo;
  });

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error)
    return <div className="text-red-500 text-center py-8">{error}</div>;
  if (transactions.length === 0)
    return <div className="text-center py-8">No payment history found</div>;

  return (
    <div className="relative">
      {selectedTxn && (
        <ReceiptPage
          paymentResult={{
            transaction: selectedTxn,
            cart: parseCart(selectedTxn.cart ?? undefined),
            shopName: selectedTxn.shopName ?? undefined,
            card: { cardId: selectedTxn.cardId },
            remainingBalance: selectedTxn.newBalance,
          }}
          onClose={() => setSelectedTxn(null)}
          onCompleteClose={() => setSelectedTxn(null)}
          shopName={selectedTxn.shopName ?? undefined}
        />
      )}

      <div className="max-w-lg mx-auto px-2 py-6">
        <h2 className="text-xl font-bold mb-4 text-center">Payment History</h2>
        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4 items-center">
          <Input
            placeholder="Search by Order Number"
            value={searchOrderNo}
            onChange={(e) => setSearchOrderNo(e.target.value)}
            className="w-full"
          />
          <select
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(e.target.value as "latest" | "oldest")
            }
            className="w-full border rounded p-2 text-sm"
          >
            <option value="latest">Show latest first</option>
            <option value="oldest">Show oldest first</option>
          </select>
        </div>
        <div className="space-y-4">
          {sortedTransactions.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No transaction matched the search criteria.
            </div>
          ) : (
            sortedTransactions.map((txn, i) => (
              <TransactionCard
                key={txn.id ?? i}
                txn={txn}
                onPrint={() => setSelectedTxn(txn)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionCard({
  txn,
  onPrint,
}: {
  txn: Transaction;
  onPrint: () => void;
}) {
  let cart: CartItem[] = [];
  try {
    if (typeof txn.cart === "string") {
      cart = JSON.parse(txn.cart);
    } else if (Array.isArray(txn.cart)) {
      cart = txn.cart as CartItem[];
    }
  } catch {
    cart = [];
  }

  return (
    <div className="rounded-xl shadow border px-4 py-3 bg-white">
      <div className="flex justify-between items-center">
        <span className="font-semibold">
          Order No: {txn.orderNumber ?? "-"}
        </span>
        <span className="text-xs text-gray-500">
          {formatDate(txn.timestamp)}
        </span>
      </div>
      <div className="text-xs text-gray-700 mb-1">
        Outlet: {txn.shopName || "Unknown shop"}
      </div>
      <div className="text-xs text-gray-700 mb-1">
        NFC No: {txn.cardId ?? "-"}
      </div>
      <div className="my-2">
        <div className="font-bold text-sm">Order Details:</div>
        {cart.length > 0 ? (
          <ul className="ml-2 list-disc text-xs">
            {cart.map((item, idx) => (
              <li key={idx}>
                {item.product.name}
                {item.product.price
                  ? ` x ${item.quantity} = ${
                      (item.product.price ?? 0) * item.quantity
                    } Coins`
                  : ` x${item.quantity}`}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-gray-400 ml-2">-</div>
        )}
      </div>
      <div className="flex justify-between mt-2">
        <span className="font-bold text-lg">Total: {txn.amount} Coins</span>
        <button
          onClick={onPrint}
          className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded print:hidden"
        >
          Print Receipt
        </button>
      </div>
    </div>
  );
}

function parseCart(cartField: string | CartItem[] | undefined): CartItem[] {
  if (!cartField) return [];
  try {
    if (typeof cartField === "string") {
      return JSON.parse(cartField);
    } else {
      return cartField as CartItem[];
    }
  } catch {
    return [];
  }
}

function formatDate(ts: string | Date | undefined): string {
  try {
    const d = ts instanceof Date ? ts : new Date(ts || "");
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return "-";
  }
}
