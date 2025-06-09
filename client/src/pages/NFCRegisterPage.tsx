import NFCCardRegister from "@/components/nfc/NFCCardRegister";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NFCRegisterPage() {
  return (
    <div className="container ">
      {/* <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">ลงทะเบียนบัตร NFC</h1>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          กลับ
        </Button>
      </div> */}

      <div className="max-w-lg mx-auto">
        <NFCCardRegister />
      </div>
    </div>
  );
}
