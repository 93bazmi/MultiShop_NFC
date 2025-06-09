import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  Check,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import useNFC from "@/hooks/use-nfc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Zod schema
const formSchema = z.object({
  cardId: z.string().min(1, { message: "NFC card number is required" }),
  balance: z.coerce
    .number()
    .min(0, { message: "Amount must not be less than 0" }),
});

type FormValues = z.infer<typeof formSchema>;

export function NFCCardRegister() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [useScannedCard, setUseScannedCard] = useState(true);

  // ตรวจสอบซ้ำ
  const [checkingCard, setCheckingCard] = useState(false);
  const [cardExists, setCardExists] = useState<null | boolean>(null);
  const [cardCheckError, setCardCheckError] = useState<string | null>(null);

  // NFC hook
  const {
    isReading,
    supportedNFC,
    lastTagId,
    startReading,
    stopReading,
    clearTag,
  } = useNFC();

  // form hook
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { cardId: "", balance: 0 },
  });

  // auto fill หมายเลขบัตรเมื่อ scan
  useEffect(() => {
    if (lastTagId && useScannedCard) {
      form.setValue("cardId", lastTagId);
    }
  }, [lastTagId, useScannedCard, form]);

  // --- เช็คหมายเลขบัตรซ้ำแบบ real-time และ handle 404/500/network ---
  useEffect(() => {
    const value = form.watch("cardId");
    setCardExists(null);
    setCardCheckError(null);

    if (!value || value.trim().length === 0) return;

    setCheckingCard(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/nfc-cards/by-card-id/${encodeURIComponent(value.trim())}`,
        );
        if (res.ok) {
          setCardExists(true); // มีแล้ว
        } else if (res.status === 404) {
          setCardExists(false); // ยังไม่มี
        } else {
          setCardCheckError("Cannot connect to server");
          setCardExists(null);
        }
      } catch (err) {
        setCardCheckError("Cannot connect to server");
        setCardExists(null);
      } finally {
        setCheckingCard(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.watch("cardId")]);
  // -------------------------------------------------------

  // ส่งข้อมูลบัตรไปยังเซิร์ฟเวอร์
  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      setSubmitSuccess(false);
      setSubmitError(null);

      await apiRequest("POST", "/api/nfc-cards", {
        cardId: values.cardId,
        balance: values.balance,
        active: true,
      });

      setSubmitSuccess(true);
      // ยังไม่ reset form ที่นี่ รอปิด popup ก่อน
    } catch (error: any) {
      setSubmitError(
        error.message || "An error occurred while registering the card",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ปิด popup แล้ว reset form และ clear NFC
  const handleDialogClose = () => {
    setSubmitSuccess(false);
    form.reset({ cardId: "", balance: 0 });
    setCardExists(null);
    setCardCheckError(null);
    clearTag(); // <<------ สำคัญ
  };
  // สถานะการสแกน NFC
  const getNFCStatusText = () => {
    if (!supportedNFC) return "Your device does not support NFC";
    if (isReading) return "Please tap your NFC card on the device...";
    if (lastTagId) return `Card: ${lastTagId}`;
    return "Press the button to start reading the NFC card";
  };

  return (
    <>
      {/* Success Popup */}
      <Dialog
        open={submitSuccess}
        onOpenChange={(open) => {
          if (!open) handleDialogClose();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="w-6 h-6" />
              Card registration successful!
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 text-center">
            <p className="text-lg mb-2">
              NFC card has been successfully registered
            </p>
            <p className="text-gray-500 text-sm">
              This card can be used for payments immediately
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleDialogClose} autoFocus>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Register NFC Card</CardTitle>
          <CardDescription>
            Add a new NFC card to the system with an initial balance
          </CardDescription>
        </CardHeader>

        <CardContent>
          {submitError && (
            <Alert className="mb-4 bg-red-50 text-red-700 border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>An error occurred</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {supportedNFC && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Scan NFC card
                  </p>
                  <p className="text-xs text-blue-600">{getNFCStatusText()}</p>
                </div>
                {isReading ? (
                  <Button variant="outline" size="sm" onClick={stopReading}>
                    Stop scanning
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={startReading}>
                    Start scanning
                  </Button>
                )}
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="cardId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NFC card number</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter NFC card number"
                          autoComplete="off"
                          className={
                            cardExists === true
                              ? "border-red-500 pr-10"
                              : cardExists === false
                                ? "border-green-500 pr-10"
                                : "pr-10"
                          }
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        {checkingCard && (
                          <Loader2 className="animate-spin w-4 h-4 text-blue-400" />
                        )}
                        {cardExists === true && !checkingCard && (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        {cardExists === false && !checkingCard && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    </div>
                    {cardExists === true && (
                      <div className="text-xs text-red-600 mt-1">
                        This number is already used
                      </div>
                    )}
                    {cardExists === false && (
                      <div className="text-xs text-green-600 mt-1">
                        This number is available
                      </div>
                    )}
                    {cardCheckError && (
                      <div className="text-xs text-red-400 mt-1">
                        {cardCheckError}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial balance (Baht)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" step="1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || cardExists === true || checkingCard}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Register card
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-gray-500">
          Note: Registered cards can be used for payment immediately
        </CardFooter>
      </Card>
    </>
  );
}

export default NFCCardRegister;
