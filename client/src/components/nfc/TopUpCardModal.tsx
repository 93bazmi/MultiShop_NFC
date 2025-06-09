import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Wifi, PlusCircle, WifiOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import useNFC from "@/hooks/use-nfc";

interface TopupCardModalProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  onSuccess: (result: any) => void;
}

const TopupCardModal = ({
  open,
  onClose,
  amount,
  onSuccess,
}: TopupCardModalProps) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(
    "Please tap your NFC card on the back of the device",
  );
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

  const {
    isReading,
    supportedNFC,
    startReading: startNFCReading,
    stopReading: stopNFCReading,
    error: nfcError,
  } = useNFC({
    onRead: (serialNumber) => {
      if (isProcessing || processingTransaction) return;

      if (processedCardIds.has(serialNumber)) {
        toast({
          title: "This transaction is being processed. Please wait.",
          variant: "default",
        });
        return;
      }

      setCardId(serialNumber);
      processTopup(serialNumber);
    },
  });

  useEffect(() => {
    if (open) {
      setProgress(0);
      setStatus("Please tap your NFC card on the back of the device");
      setIsProcessing(false);
      setShowManualEntry(false);
      setCardId("");
      setProcessedCardIds(new Set());

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
      stopNFCReading();
    }
  }, [open, supportedNFC]);

  useEffect(() => {
    if (nfcError) {
      setStatus("An error occurred while reading the card");
      toast({
        title: "An error occurred while reading the card",
        description: nfcError.message,
        variant: "destructive",
      });
      stopNFCReading();
      setShowManualEntry(true);
    }
  }, [nfcError, toast]);

  const processTopup = async (manualCardId?: string) => {
    if (isProcessing || processingTransaction) return;

    const cardIdToUse = manualCardId || cardId;

    if (processedCardIds.has(cardIdToUse)) {
      toast({
        title: "This transaction is being processed. Please wait.",
        variant: "default",
      });
      return;
    }

    setStatus(`Processing a top-up of ${amount} Coins...`);
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
      const response = await apiRequest("POST", "/api/nfc-topup", {
        cardId: cardIdToUse,
        amount: amount,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "เTop-up failed");
      }

      const result = await response.json();

      clearInterval(progressInterval);
      setProgress(100);
      setStatus("Top-up successful!");

      setTimeout(() => {
        setProcessingTransaction(false);
        onSuccess(result);
      }, 1000);
    } catch (error: any) {
      clearInterval(progressInterval);
      setProgress(0);
      setStatus("Top-up failed. Please try again.");
      setIsProcessing(false);
      setProcessingTransaction(false);

      setProcessedCardIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cardIdToUse);
        return newSet;
      });

      toast({
        title: "Top-up failed",
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
        title: "Please enter card number",
        variant: "destructive",
      });
      return;
    }
    processTopup(cardId);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isProcessing) {
          if (isReading) stopNFCReading();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="sr-only">Top up NFC Card</DialogTitle>
        </DialogHeader>
        <div className="text-center">
          <div className="mb-4 md:mb-6">
            <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 md:mb-4">
              {!supportedNFC ? (
                <WifiOff className="text-red-500 text-xl md:text-2xl" />
              ) : isReading ? (
                <Wifi className="text-blue-500 text-xl md:text-2xl" />
              ) : (
                <PlusCircle className="text-green-600 text-xl md:text-2xl" />
              )}
            </div>
            <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">
              Top up NFC Card
            </h3>
          </div>

          <div className="border border-gray-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm md:text-base text-gray-600">
                Amount to top up:
              </span>
              <span className="text-sm md:text-base font-bold text-gray-800">
                {amount} Coins
              </span>
            </div>
          </div>

          <div className="mb-4 md:mb-6">
            {!supportedNFC ? (
              <p className="text-sm md:text-base text-red-500">
                This device does not support NFC or the Web NFC API
              </p>
            ) : !showManualEntry ? (
              <p className="text-sm md:text-base text-gray-600">{status}</p>
            ) : (
              <p className="text-sm md:text-base text-gray-600">
                Please enter the NFC card number
              </p>
            )}

            {!supportedNFC && (
              <p className="text-xs text-gray-500 mt-1">
                The Web NFC API is only supported on Chrome for Android.
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
                if (isReading) stopNFCReading();
                onClose();
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>

            {!showManualEntry ? (
              <Button
                className="flex-1 text-xs md:text-sm py-1 h-9 md:h-10"
                onClick={handleManualEntry}
                disabled={isProcessing}
              >
                Manually
              </Button>
            ) : (
              <Button
                className="flex-1 text-xs md:text-sm py-1 h-9 md:h-10 bg-green-600 hover:bg-green-700"
                onClick={handleProcessManualEntry}
                disabled={isProcessing}
              >
                Top up
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TopupCardModal;
