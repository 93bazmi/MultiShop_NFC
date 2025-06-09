import React, { useEffect, useState } from "react";
import { Transaction } from "@shared/schema";

type CartItem = {
  product: { name: string; price?: number };
  quantity: number;
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/Overview")
      .then((res) => res.json())
      .then((data) => {
        console.log("history:", data.transactions); // <<<< LOG ที่นี่
        setTransactions(data.transactions || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (transactions.length === 0) {
    return <div className="text-center py-8">ไม่พบประวัติการชำระเงิน</div>;
  }

  return (
    <div className="max-w-lg mx-auto px-2 py-6">
      <h2 className="text-xl font-bold mb-4 text-center">ประวัติธุรกรรม</h2>
      <div className="space-y-4">
        {transactions.map((txn, i) => (
          <TransactionCard key={txn.id ?? i} txn={txn} />
        ))}
      </div>
    </div>
  );
}

function TransactionCard({ txn }: { txn: Transaction }) {
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
          {txn.shopName || "ไม่ทราบร้านค้า"}
        </span>
        <span className="text-xs text-gray-500">
          {formatDate(txn.timestamp)}
        </span>
      </div>
      <div className="text-xs text-gray-700 mb-1">
        Order #{txn.orderNumber ?? "-"}
      </div>
      <div className="text-xs text-gray-700 mb-1">NFC: {txn.cardId ?? "-"}</div>
      <div className="my-2">
        <div className="font-semibold text-sm">รายละเอียดสินค้า:</div>
        {cart.length > 0 ? (
          <ul className="ml-2 list-disc text-xs">
            {cart.map((item, idx) => (
              <li key={idx}>
                {item.product.name}
                {item.product.price
                  ? ` (${item.product.price} x ${item.quantity} = ${
                      (item.product.price ?? 0) * item.quantity
                    })`
                  : ` x${item.quantity}`}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-gray-400 ml-2">-</div>
        )}
      </div>
      <div className="flex justify-between mt-2">
        <span className="font-bold text-lg">{txn.amount} Coins</span>
        <span
          className={`px-2 py-1 rounded text-xs ${
            txn.type === "topup"
              ? "bg-green-100 text-green-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {txn.type === "topup" ? "เติมเงิน" : "ชำระเงิน"}
        </span>
      </div>
    </div>
  );
}

// Utility: แสดงวันที่แบบ "Apr 7, 2568, 12:24:41 AM"
function formatDate(ts: string | Date | undefined): string {
  try {
    const d = ts instanceof Date ? ts : new Date(ts || "");
    // บวกปี พ.ศ.
    const buddhistYear =
      d.getFullYear() > 2200 ? d.getFullYear() : d.getFullYear() + 543;
    return d
      .toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
      .replace(/\d{4}/, buddhistYear.toString());
  } catch {
    return "-";
  }
}
