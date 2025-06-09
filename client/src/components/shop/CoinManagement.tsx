import { useState } from "react";
import { NfcCard } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Coins, Plus, Pencil } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { insertNfcCardSchema } from "@shared/schema";
import * as z from "zod";
import { apiRequest } from "@/lib/queryClient";
import { API } from "@/lib/airtable";
import { formatDistanceToNow } from "date-fns";

interface CoinManagementProps {
  nfcCards: NfcCard[];
  totalCoins: number;
  isLoading: boolean;
}

const extendedNfcCardSchema = insertNfcCardSchema.extend({
  cardId: z.string().min(4, { message: "Card ID must be at least 4 characters" }),
  balance: z.number().min(0, { message: "Balance must be 0 or higher" }),
});

const CoinManagement = ({ nfcCards, totalCoins, isLoading }: CoinManagementProps) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Create form
  const form = useForm<z.infer<typeof extendedNfcCardSchema>>({
    resolver: zodResolver(extendedNfcCardSchema),
    defaultValues: {
      cardId: "",
      balance: 0,
      active: true,
    },
  });

  // Add NFC card mutation
  const addNfcCardMutation = useMutation({
    mutationFn: async (values: z.infer<typeof extendedNfcCardSchema>) => {
      const res = await apiRequest("POST", API.NFC_CARDS, values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API.NFC_CARDS] });
      toast({
        title: "NFC Card created",
        description: "The NFC card has been created successfully",
      });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create NFC card: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: z.infer<typeof extendedNfcCardSchema>) => {
    addNfcCardMutation.mutate(values);
  };

  // Format time ago from now
  const formatTimeAgo = (timestamp: Date | null) => {
    if (!timestamp) return "Never used";
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  // Get recent cards sorted by last used
  const recentCards = [...nfcCards]
    .sort((a, b) => {
      if (!a.lastUsed) return 1;
      if (!b.lastUsed) return -1;
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    })
    .slice(0, 3);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Coin Management</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Issue Coins
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue New NFC Card</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="cardId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter card ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Balance</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter initial balance" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addNfcCardMutation.isPending}
                  >
                    {addNfcCardMutation.isPending ? "Creating..." : "Create Card"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="bg-gray-100 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Total Coins in Circulation</p>
            <p className="text-2xl font-bold text-gray-800">{totalCoins.toLocaleString()}</p>
          </div>
          <div className="bg-yellow-100 p-3 rounded-full">
            <Coins className="text-yellow-600 text-xl" />
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-800 mb-3">Recent NFC Cards</h4>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Card ID</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      No NFC cards found
                    </TableCell>
                  </TableRow>
                ) : (
                  recentCards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell>
                        <div className="text-sm font-medium text-gray-900">#{card.cardId}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">{card.balance} Coins</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">{formatTimeAgo(card.lastUsed)}</div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4 text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoinManagement;
