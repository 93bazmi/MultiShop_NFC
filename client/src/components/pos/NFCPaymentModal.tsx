import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Wifi, WifiOff, PlusCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import useNFC from "@/hooks/use-nfc";

interface NFCPaymentModalProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  shopId: number;
  shopName: string;
  onSuccess: (result: any) => void;
  cart: CartItem[];
}

interface CartItem {
  product: { name: string };
  quantity: number;
}

const NFCPaymentModal = ({
  open,
  onClose,
  amount,
  shopId,
  shopName,
  onSuccess,
  cart,
}: NFCPaymentModalProps) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Please tap your NFC card on the back of the device");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [cardId, setCardId] = useState("");
  const { toast } = useToast();
  const cardInputRef = useRef<HTMLInputElement>(null);

  // ป้องกันอ่านซ้ำ
  const [processedCardIds, setProcessedCardIds] = useState<Set<string>>(
    new Set(),
  );
  const [processingTransaction, setProcessingTransaction] = useState(false);
  const [hasCompletedPayment, setHasCompletedPayment] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  const {
    isReading,
    supportedNFC,
    startReading: startNFCReading,
    stopReading: stopNFCReading,
    error: nfcError,
  } = useNFC({
    onRead: (serialNumber) => {
      // ป้องกันการประมวลผลเมื่อชำระเงินเสร็จแล้ว
      if (isProcessing || processingTransaction || hasCompletedPayment) return;

      if (processedCardIds.has(serialNumber)) {
        toast({
          title: "This transaction is being processed, please wait",
          variant: "default",
        });
        return;
      }

      setCardId(serialNumber);
      processPayment(serialNumber);
    },
    allowNFCReading: open && !showSuccessScreen, // หยุดอ่านเฉพาะเมื่อปิด modal หรือแสดงหน้าสำเร็จ
  });

  useEffect(() => {
    if (open) {
      setProgress(0);
      setStatus("Please tap your NFC card on the back of the device");
      setIsProcessing(false);
      setShowManualEntry(false);
      setCardId("");
      setProcessedCardIds(new Set());
      setProcessingTransaction(false);
      setHasCompletedPayment(false); // รีเซ็ตสถานะการชำระเงิน
      setShowSuccessScreen(false); // รีเซ็ตสถานะหน้าสำเร็จ

      if (!supportedNFC) {
        setStatus("Your device does not support NFC");
        setShowManualEntry(true);
        return;
      }

      startNFCReading();
    } else {
      setProgress(0);
      setStatus("");
      setIsProcessing(false);
      setProcessingTransaction(false);
      setHasCompletedPayment(false);
      setShowSuccessScreen(false);
      stopNFCReading(); // หยุดอ่าน NFC ทันทีเมื่อปิด modal
    }
  }, [open, supportedNFC]);

  useEffect(() => {
    if (nfcError) {
      setStatus("An error occurred while reading the card");
      toast({
        title: "Error reading card",
        description: nfcError.message,
        variant: "destructive",
      });
      stopNFCReading();
      setShowManualEntry(true);
    }
  }, [nfcError, toast]);

  const itemsString = cart
    .map((item: CartItem) => `${item.product.name} x ${item.quantity}`)
    .join(", ");

  const processPayment = async (manualCardId?: string) => {
    if (isProcessing || processingTransaction) return;

    const cardIdToUse = manualCardId || cardId;

    if (processedCardIds.has(cardIdToUse)) {
      toast({
        title: "This transaction is being processed, please wait",
        variant: "default",
      });
      return;
    }

    setStatus(`Processing payment of ${amount} Coins...`);
    setProgress(10);
    setIsProcessing(true);
    setProcessingTransaction(true);

    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) {
          clearInterval(progressInterval);
          return p;
        }
        return p + 5;
      });
    }, 200);

    setProcessedCardIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(cardIdToUse);
      return newSet;
    });

    try {
      if (!shopId) {
        throw new Error("Shop data not found. Please select a shop before making a payment.");
      }

      const response = await apiRequest("POST", "/api/nfc-payment", {
        cardId: cardIdToUse,
        shopId: shopId,
        amount: amount,
        items: itemsString,
        shopName: shopName,
        cart,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Payment failed");
      }

      const result = await response.json();

      clearInterval(progressInterval);
      setProgress(100);
      setStatus("Payment successful!");
      setHasCompletedPayment(true); // ตั้งค่าว่าชำระเงินเสร็จแล้ว

      // รอ 500ms ก่อนหยุดอ่าน NFC และแสดงหน้าสำเร็จ
      setTimeout(() => {
        stopNFCReading();
        setShowSuccessScreen(true);

        setTimeout(() => {
          setProcessingTransaction(false);
          onSuccess(result);
        }, 1000);
      }, 1000);
    } catch (error: any) {
      clearInterval(progressInterval);
      setProgress(0);

      const errorMessage = error.message?.toLowerCase() || "";

      if (errorMessage.includes("ไม่พบหมายเลขบัตร")) {
        setStatus("Card ID not found. Please check and try again.");
      } else if (
        errorMessage.includes("insufficient") ||
        errorMessage.includes("balance")
      ) {
        setStatus("Insufficient balance. Please try again.");
      } else {
        setStatus("Payment failed. Please try again.");
      }

      setIsProcessing(false);
      setProcessingTransaction(false);

      setProcessedCardIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cardIdToUse);
        return newSet;
      });

      toast({
        title: "Payment failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleManualEntry = () => {
    stopNFCReading();
    setShowManualEntry(true);
    setStatus("Please enter the NFC card number");
    setProgress(0);
    setCardId("");
  };

  const handleProcessManualEntry = () => {
    if (!cardId.trim()) {
      toast({
        title: "Please enter the card number",
        variant: "destructive",
      });
      return;
    }
    processPayment(cardId);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isProcessing && !hasCompletedPayment) {
          if (isReading) stopNFCReading();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="sr-only">Pay with NFC Card</DialogTitle>
        </DialogHeader>
        <div className="text-center">
          <div className="mb-4 md:mb-6">
            <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3 md:mb-4">
              {!supportedNFC ? (
                <WifiOff className="text-red-500 text-xl md:text-2xl" />
              ) : isReading ? (
                <Wifi className="text-blue-500 text-xl md:text-2xl" />
              ) : (
                <PlusCircle className="text-primary text-xl md:text-2xl" />
              )}
            </div>
            <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">
              Pay with NFC Card
            </h3>

            <div className="border border-gray-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm md:text-base text-gray-600">
                  Amount to pay:
                </span>
                <span className="text-sm md:text-base font-bold text-gray-800">
                  {amount} Coins
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm md:text-base text-gray-600">
                  shop:
                </span>
                <span className="text-sm md:text-base text-gray-800">
                  {shopName}
                </span>
              </div>
            </div>

            {!supportedNFC && (
              <p className="text-xs text-gray-500 mt-1">
                Web NFC API is only supported on Chrome for Android
              </p>
            )}

            {!showManualEntry ? (
              <p className="text-sm md:text-base text-gray-600">{status}</p>
            ) : (
              <p className="text-sm md:text-base text-gray-600">
                Please enter the NFC card number
              </p>
            )}
          </div>

          {showManualEntry ? (
            <div className="mb-4 md:mb-6">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2 text-left">
                NFC Card Number
              </label>
              <Input
                ref={cardInputRef}
                type="text"
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                placeholder="Enter card number"
                className="mb-4 text-sm"
              />
            </div>
          ) : (
            <div className="relative mb-4 md:mb-6">
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex space-x-3 md:space-x-4">
            <Button
              variant="outline"
              className="flex-1 text-xs md:text-sm py-1 h-9 md:h-10"
              onClick={() => {
                // หยุดการอ่าน NFC ทันที
                stopNFCReading();

                // รีเซ็ตทุกค่าทันที
                setProgress(0);
                setStatus("");
                setIsProcessing(false);
                setProcessingTransaction(false);
                setHasCompletedPayment(false);
                setShowSuccessScreen(false);
                setCardId("");
                setProcessedCardIds(new Set());
                setShowManualEntry(false);

                // ปิด modal
                if (!hasCompletedPayment) {
                  onClose();
                }
              }}
              disabled={isProcessing || hasCompletedPayment}
            >
              Cancel
            </Button>

            {!showManualEntry ? (
              <Button
                className="flex-1 text-xs md:text-sm py-1 h-9 md:h-10"
                onClick={handleManualEntry}
                disabled={isProcessing}
              >
                Enter Manually
              </Button>
            ) : (
              <Button
                className="flex-1 text-xs md:text-sm py-1 h-9 md:h-10 bg-primary hover:bg-primary/90"
                onClick={handleProcessManualEntry}
                disabled={isProcessing}
              >
                Pay
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NFCPaymentModal;
