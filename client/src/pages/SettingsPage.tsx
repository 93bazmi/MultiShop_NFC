import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { API } from "@/lib/airtable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Settings, User, Database, CreditCard, Key, Save, Store } from "lucide-react";
import { config } from "@/lib/airtable";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("account");
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [baseId, setBaseId] = useState(config.baseId);
  const { toast } = useToast();

  // Fetch user data (for demo)
  const { data: userData } = useQuery({
    queryKey: [API.USERS, 1], // Assuming user ID 1 is the logged-in user
  });

  // Handle save settings
  const handleSaveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your settings have been saved successfully",
    });
  };

  // Handle save API settings
  const handleSaveApiSettings = () => {
    toast({
      title: "API settings saved",
      description: "Your API settings have been saved successfully",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Settings</CardTitle>
          <CardDescription>
            Manage your account settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="account" className="gap-2">
                <User className="h-4 w-4" />
                Account
              </TabsTrigger>
              <TabsTrigger value="api" className="gap-2">
                <Key className="h-4 w-4" />
                API Settings
              </TabsTrigger>
              <TabsTrigger value="shops" className="gap-2">
                <Store className="h-4 w-4" />
                Shop Settings
              </TabsTrigger>
              <TabsTrigger value="payment" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Settings
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="account">
              <div className="space-y-6">
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input id="name" defaultValue="John Smith" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="username" className="text-right">
                      Username
                    </Label>
                    <Input id="username" defaultValue="johnsmith" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <Input 
                      id="email" 
                      type="email" 
                      defaultValue="john.smith@example.com" 
                      className="col-span-3"
                    />
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="email-notifications">Email Notifications</Label>
                        <p className="text-sm text-gray-500">
                          Receive email notifications for important events
                        </p>
                      </div>
                      <Switch id="email-notifications" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="transaction-alerts">Transaction Alerts</Label>
                        <p className="text-sm text-gray-500">
                          Get notified about new transactions in your shops
                        </p>
                      </div>
                      <Switch id="transaction-alerts" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="marketing-emails">Marketing Emails</Label>
                        <p className="text-sm text-gray-500">
                          Receive updates about new features and offers
                        </p>
                      </div>
                      <Switch id="marketing-emails" />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="api">
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> These API settings are used to connect to your Airtable database.
                    Make sure to keep your API key secure and never share it publicly.
                  </p>
                </div>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="api-key" className="text-right">
                      API Key
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="api-key" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        type="password"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Your Airtable API Key
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="base-id" className="text-right">
                      Base ID
                    </Label>
                    <div className="col-span-3">
                      <Input 
                        id="base-id" 
                        value={baseId}
                        onChange={(e) => setBaseId(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Your Airtable Base ID
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Database Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="sync-frequency">Automatic Sync</Label>
                        <p className="text-sm text-gray-500">
                          Automatically sync data with Airtable
                        </p>
                      </div>
                      <Switch id="sync-frequency" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="cache-data">Cache Data</Label>
                        <p className="text-sm text-gray-500">
                          Store data locally to improve performance
                        </p>
                      </div>
                      <Switch id="cache-data" defaultChecked />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleSaveApiSettings} className="gap-2">
                    <Save className="h-4 w-4" />
                    Save API Settings
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="shops">
              <div className="space-y-6">
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="default-shop" className="text-right">
                      Default Shop
                    </Label>
                    <Input id="default-shop" defaultValue="Java Junction" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="currency" className="text-right">
                      Currency
                    </Label>
                    <Input id="currency" defaultValue="Coins" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="tax-rate" className="text-right">
                      Tax Rate (%)
                    </Label>
                    <Input id="tax-rate" type="number" defaultValue="0" className="col-span-3" />
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Shop Display Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show-product-images">Show Product Images</Label>
                        <p className="text-sm text-gray-500">
                          Display product images in POS system
                        </p>
                      </div>
                      <Switch id="show-product-images" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enable-product-search">Enable Product Search</Label>
                        <p className="text-sm text-gray-500">
                          Allow searching for products by name
                        </p>
                      </div>
                      <Switch id="enable-product-search" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show-out-of-stock">Show Out of Stock Items</Label>
                        <p className="text-sm text-gray-500">
                          Display products that are out of stock
                        </p>
                      </div>
                      <Switch id="show-out-of-stock" />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Shop Settings
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="payment">
              <div className="space-y-6">
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="nfc-reader" className="text-right">
                      NFC Reader Device
                    </Label>
                    <Input id="nfc-reader" defaultValue="ACR122U USB NFC Reader" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reader-port" className="text-right">
                      Reader Port
                    </Label>
                    <Input id="reader-port" defaultValue="USB" className="col-span-3" />
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Payment Options</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enable-nfc">Enable NFC Payments</Label>
                        <p className="text-sm text-gray-500">
                          Allow payments using NFC cards
                        </p>
                      </div>
                      <Switch id="enable-nfc" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enable-cash">Enable Cash Payments</Label>
                        <p className="text-sm text-gray-500">
                          Allow cash payments
                        </p>
                      </div>
                      <Switch id="enable-cash" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="require-confirmation">Require Transaction Confirmation</Label>
                        <p className="text-sm text-gray-500">
                          Show confirmation dialog before completing transactions
                        </p>
                      </div>
                      <Switch id="require-confirmation" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="print-receipt">Print Receipts</Label>
                        <p className="text-sm text-gray-500">
                          Automatically print receipts after transactions
                        </p>
                      </div>
                      <Switch id="print-receipt" />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Payment Settings
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="border-t pt-6">
          <p className="text-sm text-gray-500">
            <Settings className="h-4 w-4 inline-block mr-1" />
            Settings last updated: {new Date().toLocaleDateString()}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SettingsPage;
