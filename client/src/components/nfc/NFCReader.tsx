import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  WifiOff,
  Wifi,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import useNFC, { NFCReadStatus } from "@/hooks/use-nfc";
import { apiRequest } from "@/lib/queryClient";

interface NFCReaderProps {
  onTagRead?: (cardId: string, cardData?: any) => void;
  showCardBalance?: boolean;
}

export function NFCReader({
  onTagRead,
  showCardBalance = true,
}: NFCReaderProps) {
  const [verifyingCard, setVerifyingCard] = useState(false);
  const [cardBalance, setCardBalance] = useState<number | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);

  const {
    isReading,
    status,
    supportedNFC,
    lastTagId,
    error,
    startReading,
    stopReading,
  } = useNFC({
    onRead: async (serialNumber) => {
      console.log("Card read:", serialNumber);
      handleCardRead(serialNumber);
    },
    allowNFCReading: false, // ปิดการอ่าน NFC อัตโนมัติ
  });

  // ฟังก์ชันจัดการเมื่อได้รับการอ่านบัตร NFC
  const handleCardRead = async (cardId: string) => {
    try {
      setVerifyingCard(true);
      setCardError(null);

      // ตรวจสอบบัตรกับระบบ
      const response = await apiRequest("POST", "/api/nfc-test-read", {
        cardId,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Card data:", data);

        if (data && data.card) {
          setCardBalance(data.card.balance || 0);

          // เรียกใช้ callback หากมีการกำหนด
          if (onTagRead) {
            onTagRead(cardId, data.card);
          }
        } else {
          setCardError("Card data not found in the system");
        }
      } else {
        const errorData = await response.json();
        setCardError(errorData.message || "Unable to verify card");
        console.error("Card verification error:", errorData);
      }
    } catch (err) {
      console.error("Error verifying NFC card:", err);
      setCardError("An error occurred during card verification");
    } finally {
      setVerifyingCard(false);
    }
  };

  // แสดงข้อความตามสถานะ
  const getStatusText = () => {
    if (!supportedNFC) return "Your device does not support NFC";
    if (verifyingCard) return "Verifying card...";
    if (cardError) return cardError;
    if (lastTagId && cardBalance !== null)
      return `Card: ${lastTagId} (Balance: ${cardBalance} Coins)`;
    if (lastTagId) return `Card: ${lastTagId}`;
    if (isReading) return "Please tap your NFC card on the device...";
    return "Press the button to start reading the NFC card";
  };

  // แสดงไอคอนตามสถานะ
  const getStatusIcon = () => {
    if (!supportedNFC) return <WifiOff className="h-16 w-16 text-gray-400" />;
    if (verifyingCard)
      return <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />;
    if (cardError) return <AlertTriangle className="h-16 w-16 text-red-500" />;
    if (lastTagId && !cardError)
      return (
        <Badge className="h-16 w-16 flex items-center justify-center bg-green-500 text-white border-0">
          <CreditCard className="h-8 w-8" />
        </Badge>
      );
    if (isReading) return <Wifi className="h-16 w-16 text-blue-500" />;
    return <CreditCard className="h-16 w-16 text-gray-400" />;
  };

  // แสดงปุ่มตามสถานะ
  const getActionButton = () => {
    if (!supportedNFC) {
      return (
        <Button variant="secondary" disabled>
          Device does not support NFC
        </Button>
      );
    }

    if (isReading) {
      return (
        <Button variant="outline" onClick={stopReading}>
          Stop reading
        </Button>
      );
    }

    return <Button onClick={startReading}>Start reading NFC card</Button>;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>NFC Card Reader</CardTitle>
        <CardDescription>
          Used for reading NFC cards for payments or top-ups
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center py-6">
        <div className="mb-6">{getStatusIcon()}</div>

        <div className="text-center mb-4">
          <p className="text-base">{getStatusText()}</p>
          {error && (
            <p className="text-sm text-red-500 mt-2">{error.message}</p>
          )}
        </div>

        {showCardBalance && lastTagId && cardBalance !== null && !cardError && (
          <div className="bg-gray-100 rounded-lg p-3 w-full mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Card Number:</span>
              <span className="font-medium">{lastTagId}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-gray-600">Remaining Balance:</span>
              <span className="font-bold text-blue-600">{cardBalance} Coins</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-center">
        {getActionButton()}
      </CardFooter>
    </Card>
  );
}

export default NFCReader;
