import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TopupCardModal from "@/components/nfc/TopUpCardModal";

const TopupPage = () => {
  const [amount, setAmount] = useState<string>("0");
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  };
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const { toast } = useToast();

  const parsedAmount = Number(amount) || 0;

  const handleTopupSuccess = (result: any) => {
    setIsTopupModalOpen(false);

    toast({
      title: "Top-up Successful",
      description: (
        <div className="space-y-2">
          <p>Successfully topped up {amount} Coins to the card.</p>
          <p className="text-sm text-gray-600">
            Remaining balance: {result.remainingBalance || 0} Coins
          </p>
        </div>
      ),
      variant: "default",
    });
  };

  const predefinedAmounts = [100, 200, 500, 1000];

  return (
    <div>
      <div className="container max-w-md mx-auto">
        {/* <h1 className="text-2xl font-bold text-center mb-6">NFC Card Top-up</h1> */}

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <span>Top-up Card</span>
            </CardTitle>
            <CardDescription>
              Add coins to your NFC card to use in participating stores.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount to top up (Coins)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={handleAmountChange}
                min={1}
                className="text-lg"
              />
            </div>

            <div className="grid grid-cols-4 gap-2 mt-4">
              {predefinedAmounts.map((presetAmount) => (
                <Button
                  key={presetAmount}
                  variant={
                    amount === presetAmount.toString() ? "default" : "outline"
                  }
                  className="h-12"
                  onClick={() => setAmount(presetAmount.toString())}
                >
                  {presetAmount}
                </Button>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => setIsTopupModalOpen(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              disabled={parsedAmount <= 0}
            >
              <PlusCircle className="h-5 w-5" />
              <span> Top up {parsedAmount} Coins</span>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <TopupCardModal
        open={isTopupModalOpen}
        onClose={() => setIsTopupModalOpen(false)}
        amount={parsedAmount} // send number to modal
        onSuccess={handleTopupSuccess}
      />
    </div>
  );
};

export default TopupPage;
