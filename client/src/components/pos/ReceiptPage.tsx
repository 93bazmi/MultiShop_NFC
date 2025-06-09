import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download, Share2, ArrowLeft } from "lucide-react";

interface ReceiptPageProps {
  paymentResult: any;
  onClose: () => void;
  onCompleteClose: () => void;
  shopLogoUrl?: string; // <--- เพิ่มเข้าไป
  shopName?: string; // <--- ถ้ายังไม่ได้ส่งมาก็เพิ่มไปด้วย
}

const ReceiptPage: React.FC<ReceiptPageProps> = ({
  paymentResult,
  onClose,
  onCompleteClose,
  shopName, // <-- และตรงนี้
}) => {
  const [logoLoaded, setLogoLoaded] = useState(false); // รูปโหลดเสร็จหรือยัง
  const [hasAutoPrinted, setHasAutoPrinted] = useState(false); // กัน print ซ้ำ
  function maskCardId(cardId: string | undefined) {
    if (!cardId) return "Unknown";
    // แยกด้วย ":" เพื่อดึง 2 คู่สุดท้าย
    const parts = cardId.split(":");
    if (parts.length >= 2) {
      // รวม 2 ตัวท้าย
      const last2 = parts.slice(-2).join(":");
      // จำนวนอักษรที่ต้องปิด (mask) ทั้งหมด
      const masked = "*".repeat(cardId.length - last2.length - 1);
      return masked + last2;
    }
    // ถ้าไม่ใช่รูปแบบเดิม ให้เอา 5 ตัวท้าย
    return "*".repeat(Math.max(cardId.length - 5, 0)) + cardId.slice(-5);
  }
  function truncate(str: string, maxLen: number) {
    if (!str) return "";
    return str.length > maxLen ? str.substring(0, maxLen) : str;
  }
  useEffect(() => {
    if (logoLoaded && !hasAutoPrinted) {
      setHasAutoPrinted(true); // กันปริ้นซ้ำ
      setTimeout(() => {
        // จะหน่วงเพิ่มอีกนิด (เช่น 200ms) ให้รูป render ทัน
        window.print();
      }, 500);
    }
  }, [logoLoaded, hasAutoPrinted]);

  // Check if payment result exists to avoid errors
  if (!paymentResult) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="w-full max-w-xs mx-auto bg-white p-1 rounded-lg shadow-lg">
          <p className="text-red-500 text-center text-sm">
            No payment information found
          </p>
          <Button onClick={onCompleteClose} className="mt-1 w-full text-xs">
            Back
          </Button>
        </div>
      </div>
    );
  }

  const printReceipt = () => {
    window.print();
  };

  const downloadReceipt = () => {
    // Implementation would depend on your needs
    alert("Download Receipt");
  };

  const shareReceipt = () => {
    // Implementation would depend on your needs
    alert("Share Receipt");
  };

  // Format date and time in Thai locale
  const formatDate = (dateString: string | Date | undefined) => {
    try {
      const date = new Date(dateString || new Date());
      return new Intl.DateTimeFormat("en-EN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);
    } catch (e) {
      return "No date information";
    }
  };

  // Add print styles directly in the component
  React.useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @media print {
        @page {
          size: 55mm auto;
          margin: 0;
        }
        body {
          width: 55mm;
          margin: 0;
          padding: 0;
        }
        .receipt-content {
          width: 55mm;
          padding: 1mm;
          font-size: 10pt;
        }
        .receipt-title {
          font-size: 14pt;
        }
        .store-name {
          font-size: 16pt;
        }
        .text-small {
          font-size: 12pt;
        }
        .text-xs {
          font-size: 10pt;
        }
        .divider-solid {
          border-top-style: solid;
        }
        .divider-dashed {
          border-top-style: dashed;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="flex flex-col items-center min-h-screen">
        {/* Header with back button - hidden when printing */}
        <div className="bg-gray-50 p-0.5 w-full print:hidden">
          <div className="max-w-xs mx-auto flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={onClose}
              size="sm"
              className="flex items-center text-xs"
            >
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back
            </Button>
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadReceipt}
                className="h-7 w-7 p-0"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={shareReceipt}
                className="h-7 w-7 p-0"
              >
                <Share2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="flex-grow flex items-start justify-center p-0.5 w-full">
          <div className="w-full max-w-xxs mx-auto bg-white p-1 rounded-lg border border-gray-200 print:border-0 print:shadow-none receipt-content">
            <div className="">
              <div className="w-full flex justify-center mb-2 mt-4">
                <img
                  src="/Sake-Week-Thailand-Logo-[3-May].png"
                  alt="Shop Logo"
                  className="h-16 w-16 object-contain rounded-full shadow-sm"
                  style={{ maxWidth: 120, maxHeight: 120 }}
                  onLoad={() => setLogoLoaded(true)} // <--- เพิ่มตรงนี้
                />
              </div>
              <h1 className="text-xl font-bold text-gray-800 store-name text-center">
                Order No:{" "}
                {paymentResult.transaction?.orderNumber ?? "No informatio"}
              </h1>
            </div>

            {/* Receipt Title */}
            <div className="text-center">
              <h2 className="text-sm font-semibold receipt-title w-full flex justify-center mb-2 mt-1">
                Receipt
              </h2>
              <p className="text-gray-500 text-xs text-small">
                {formatDate(paymentResult.transaction?.timestamp)}
              </p>
            </div>
            {/* Divider - Dashed */}

            <div className="bg-gray-50 p-0.5 rounded-m mb-1 text-xs text-center">
              <p className="text-gray-600 ">
                {" "}
                ..............................................................................................
              </p>
            </div>
            {/* Card Info */}
            <div className="bg-gray-50 p-0.5 rounded-m  text-xs">
              <p className="text-gray-600 ">
                Outlet : {shopName || paymentResult.shopName || "Store"}
              </p>
              <div className="flex justify-between">
                <span className="text-gray-600">NFC No:</span>
                <span className="font-medium">
                  {maskCardId(paymentResult.card?.cardId)}
                </span>
              </div>
            </div>
            {/* Divider - Dashed */}
            <div className="bg-gray-50 p-0.5 rounded-m mb-1 text-xs text-center">
              <p className="text-gray-600 ">
                {" "}
                ..............................................................................................
              </p>
            </div>
            {/* Items Purchased */}
            <div className="">
              <h3 className="text-xs text-center">Order Details</h3>
              {paymentResult.cart && paymentResult.cart.length > 0 ? (
                <div className="space-y-0.5">
                  {paymentResult.cart.map(
                    (
                      item: {
                        product: { name: string; price: number };
                        quantity: number;
                      },
                      index: number,
                    ) => (
                      <div
                        key={index}
                        className="flex justify-between py-0.5 border-b border-gray-100 text-xs"
                      >
                        <div className="flex-1">
                          <span className="text-gray-800">
                            {truncate(item.product.name, 15)}{" "}
                          </span>
                          <span className="text-gray-500 text-xs ml-1">
                            x{item.quantity}
                          </span>
                        </div>
                        <span className="text-gray-800">
                          {item.product.price * item.quantity} Coins
                        </span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="py-0.5 text-gray-500 text-center italic text-xs">
                  No product information{" "}
                </div>
              )}
              <div className="flex justify-between py-0.5 border-b border-gray-100 text-xs">
                <span className="text-xl font-semibold">Total:</span>
                <span className="font-bold text-gray-800 text-xl">
                  {paymentResult.transaction?.amount || 0} Coins
                </span>
              </div>
            </div>
            {/* Divider - Dashed */}
            <div className="bg-gray-50 p-0.5 rounded-m mb-1 text-xs text-center">
              <p className="text-gray-600 ">
                {" "}
                ..............................................................................................
              </p>
            </div>
            {/* Transaction Details */}
            <div className="mb-1">
              <h3 className="text-xs  mb-0.5 text-center mt-2">
                Payment Details
              </h3>
              <div className="flex justify-between py-0.5 border-b border-gray-100 text-xs">
                <span className="text-gray-600">Balance:</span>
                <span className="text-gray-800">
                  {paymentResult.transaction?.previousBalance !== undefined
                    ? `${paymentResult.transaction.previousBalance} Coins`
                    : "No information"}
                </span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-gray-100 text-xs">
                <span className="text-gray-600">Paid:</span>
                <span className="text-gray-800">
                  {paymentResult.transaction?.amount || 0} Coins
                </span>
              </div>
              <div className="flex justify-between py-0.5 text-xs ">
                <span className="font-bold text-gray-600">Remaining:</span>
                <span className="font-bold text-emerald-600">
                  {paymentResult.remainingBalance || 0} Coins
                </span>
              </div>
            </div>
            {/* Divider - Dashed */}
            <div className="bg-gray-50 p-0.5 rounded-m mb-1 text-xs text-center">
              <p className="text-gray-600 ">
                {" "}
                ..............................................................................................
              </p>
            </div>
            {/* Thank You Message */}
            <div className="text-center mb-1 mt-4">
              <p className="text-gray-700 text-xs">
                Thank you for your purchase
              </p>
            </div>

            {/* Print & Close buttons */}
            <div className="mt-8 print:hidden flex flex-col space-y-2  pb-2">
              <Button
                className="w-full text-sm h-10 rounded-lg bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => window.print()}
              >
                Print Receipt
              </Button>
              <Button
                className="w-full text-sm h-10 rounded-lg bg-red-400 hover:bg-red-500 text-white "
                onClick={onCompleteClose}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPage;
