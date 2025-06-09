import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wifi, Loader2, CheckCircle2, XCircle, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import useNFC from "@/hooks/use-nfc";
import { apiRequest } from "@/lib/queryClient";
import { API } from "@/lib/airtable";

interface CardData {
  id?: number;
  cardId: string;
  balance?: number;
  lastUsed?: string | null;
  active?: boolean;
  notRegistered?: boolean;
}

const NFCTestPage = () => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Ready to scan NFC card");
  const [cardInfo, setCardInfo] = useState<CardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasTouchedCard, setHasTouchedCard] = useState(false);
  const [isProcessingRead, setIsProcessingRead] = useState(false);
  const lastToastCardIdRef = useRef<string | null>(null);
  const { toast } = useToast();
  const isProcessingReadRef = useRef(false);

  const {
    isReading,
    supportedNFC,
    startReading: startNFCReading,
    stopReading: stopNFCReading,
    error: nfcError,
  } = useNFC({
    onRead: (serialNumber) => {
      if (isProcessingReadRef.current) return;
      isProcessingReadRef.current = true;
      setHasTouchedCard(true);
      testReadNFCCard(serialNumber).finally(() => {
        isProcessingReadRef.current = false;
      });
    },
  });

  useEffect(() => {
    if (isReading && isProcessingRead) {
      const interval = setInterval(() => {
        setProgress((prev) =>
          prev >= 90 ? (clearInterval(interval), prev) : prev + 10,
        );
      }, 300);
      return () => clearInterval(interval);
    } else if (isReading && hasTouchedCard && !isProcessingRead) {
      setProgress(0);
    } else if (cardInfo) {
      setProgress(100);
    } else if (error) {
      setProgress(0);
    } else {
      setProgress(0);
    }
  }, [isReading, cardInfo, error, hasTouchedCard, isProcessingRead]);

  useEffect(() => {
    if (!supportedNFC) {
      setStatus("Your device does not support NFC");
      return;
    }
    if (isReading && !hasTouchedCard) {
      setStatus("Waiting for NFC card...");
    } else if (isReading && hasTouchedCard && !isProcessingRead) {
      setStatus("Reading card...");
    } else if (isProcessingRead) {
      setStatus("Processing...");
    } else if (cardInfo) {
      setStatus("Card read successfully");
    } else if (error) {
      setStatus("Read failed. Please try again.");
    } else {
      setStatus("Ready to scan NFC card");
    }
  }, [
    isReading,
    hasTouchedCard,
    isProcessingRead,
    cardInfo,
    error,
    supportedNFC,
  ]);

  useEffect(() => {
    if (nfcError) {
      setError(nfcError.message);
    }
  }, [nfcError]);

  const startReading = () => {
    setProgress(0);
    setCardInfo(null);
    setError(null);
    setHasTouchedCard(false);
    setIsProcessingRead(false);
    lastToastCardIdRef.current = null;

    if (!supportedNFC) {
      setError("Your device does not support NFC");
      toast({
        title: "NFC Not Supported",
        description: "This device or browser does not support NFC.",
        variant: "destructive",
      });
      return;
    }

    startNFCReading();
  };

  const testReadNFCCard = async (cardId: string) => {
    try {
      setIsProcessingRead(true);
      setProgress(30);

      const response = await apiRequest("POST", "/api/nfc-test-read", {
        cardId,
      });

      if (!response.ok) {
        const errorData = await response.json();

        setIsProcessingRead(false);

        if (response.status === 404) {
          setProgress(100);
          setStatus("Card read but not registered");
          setCardInfo({
            cardId,
            balance: 0,
            lastUsed: null,
            notRegistered: true,
          });
          alert("This card is not registered.");
          stopNFCReading();
          return;
        }
        throw new Error(errorData.message || "Cannot read card.");
      }

      const result = await response.json();

      setProgress(90);
      setCardInfo(result.card);
      setProgress(100);
      setStatus("Card read successfully");
      setIsProcessingRead(false);

      if (lastToastCardIdRef.current !== cardId) {
        toast({
          title: "Card read successful",
          description: `Card number: ${result.card.cardId}`,
          variant: "default",
        });
        lastToastCardIdRef.current = cardId;
      }

      stopNFCReading();
    } catch (error) {
      console.error("Error testing card:", error);
      setProgress(0);
      setStatus("Error reading card");
      setIsProcessingRead(false);
      stopNFCReading();
      setError(
        error instanceof Error ? error.message : "Cannot connect to server.",
      );

      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Cannot connect to server.",
        variant: "destructive",
      });

      stopNFCReading();
    }
  };

  const registerNewCard = async () => {
    if (!cardInfo?.cardId) return;

    try {
      setStatus("Registering new card...");
      setError(null);

      const response = await apiRequest("POST", API.NFC_CARDS, {
        cardId: cardInfo.cardId,
        balance: 0,
        active: true,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Could not register card.");
      }

      const newCardData = await response.json();
      setCardInfo(newCardData);
      setError(null);
      setStatus("Card registered");

      toast({
        title: "Card registered",
        description: `Card number: ${newCardData.cardId}`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error registering card:", error);
      setStatus("Card registration failed");
      setError(
        error instanceof Error ? error.message : "Could not register card.",
      );

      toast({
        title: "Card registration failed",
        description:
          error instanceof Error ? error.message : "Could not register card.",
        variant: "destructive",
      });
    }
  };

  const resetTest = () => {
    if (isReading) stopNFCReading();
    setProgress(0);
    setStatus("Ready to scan NFC card");
    setCardInfo(null);
    setError(null);
    setHasTouchedCard(false);
    setIsProcessingRead(false);
    lastToastCardIdRef.current = null;
  };

  return (
    <div>
      <div className="container max-w-md mx-auto ">
        {/* <h1 className="text-2xl font-bold text-center mb-6">
          NFC Card Reader Test
        </h1> */}

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              {supportedNFC ? (
                <Wifi className="h-5 w-5" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <span>NFC Card Reader Test</span>
            </CardTitle>
            <CardDescription>
              {supportedNFC
                ? "Test NFC card reading and check card info."
                : "This device does not support NFC. Web NFC works on Chrome for Android only."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-center p-4 border rounded-lg bg-gray-50">
              {isReading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 text-yellow-500 animate-spin mb-4" />
                  <p className="text-sm font-medium text-gray-700">{status}</p>
                </div>
              ) : cardInfo ? (
                <div className="flex flex-col items-center">
                  {error ? (
                    <XCircle className="h-10 w-10 text-red-500 mb-4" />
                  ) : (
                    <CheckCircle2 className="h-10 w-10 text-green-500 mb-4" />
                  )}
                  <p className="text-sm font-medium text-gray-700">{status}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  {supportedNFC ? (
                    <Wifi className="h-10 w-10 text-gray-400 mb-4" />
                  ) : (
                    <WifiOff className="h-10 w-10 text-red-500 mb-4" />
                  )}
                  <p className="text-sm font-medium text-gray-700">{status}</p>
                </div>
              )}
            </div>

            {cardInfo && (
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">NFC Card Info</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Card number:</span>
                    <span className="font-medium">{cardInfo.cardId}</span>
                  </div>
                  {!cardInfo.notRegistered ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Balance:</span>
                        <span className="font-medium">
                          {cardInfo.balance} Coins
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last used:</span>
                        <span className="font-medium">
                          {cardInfo.lastUsed
                            ? new Date(cardInfo.lastUsed).toLocaleString(
                                "en-US",
                              )
                            : "Never used"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span
                          className={`font-medium ${
                            cardInfo.active ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {cardInfo.active ? "Active" : "Suspended"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center mt-2">
                      <p className="text-red-500 mb-4">
                        This card is not registered.
                      </p>
                      <Button
                        onClick={registerNewCard}
                        disabled={isReading}
                        className="w-full"
                      >
                        Register card
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p>
                <strong>Note:</strong> Web NFC is experimental and works only on
                Chrome for Android.
              </p>
              <p className="mt-1">
                When you click "Start NFC Scan", the browser will ask permission
                for NFC and wait for a card.
              </p>
            </div>
          </CardContent>

          <CardFooter>
            {isReading ? (
              <Button
                onClick={stopNFCReading}
                className="w-full"
                variant="outline"
              >
                Stop scan
              </Button>
            ) : cardInfo ? (
              <Button onClick={resetTest} className="w-full" variant="outline">
                Scan again
              </Button>
            ) : (
              <Button
                onClick={startReading}
                disabled={isReading || !supportedNFC}
                className="w-full"
              >
                Start NFC scan
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default NFCTestPage;
