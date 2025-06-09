import { useState, useEffect, useCallback } from "react";
import { useRef } from "react";

interface NDEFReader {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  onreading: ((event: any) => void) | null;
  onreadingerror: ((error: any) => void) | null;
}

declare global {
  interface Window {
    NDEFReader?: {
      new (): NDEFReader;
    };
  }
}

export type NFCReadStatus =
  | "idle"
  | "reading"
  | "success"
  | "error"
  | "not-supported";

interface UseNFCOptions {
  onRead?: (serialNumber: string) => Promise<void> | void;
  autoStart?: boolean;
  allowNFCReading?: boolean;
}

export function useNFC({
  onRead,
  autoStart = false,
  allowNFCReading = true,
}: UseNFCOptions = {}) {
  const [isReading, setIsReading] = useState(false);
  const [status, setStatus] = useState<NFCReadStatus>("idle");
  const [supportedNFC, setSupportedNFC] = useState<boolean | null>(null);
  const [lastTagId, setLastTagId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const clearTag = useCallback(() => {
    setLastTagId(null);
  }, []);
  const isStoppedRef = useRef(false);

  useEffect(() => {
    if (!allowNFCReading) {
      setIsReading(false);
      setError(null);
      setStatus("idle");
      // หยุดการอ่าน NFC ทันที
      if (abortController) {
        abortController.abort();
        setAbortController(null);
      }
      return;
    }

    const checkNFCSupport = () => {
      if ("NDEFReader" in window) {
        setSupportedNFC(true);
        if (autoStart && allowNFCReading) {
          startReading();
        }
      } else {
        setSupportedNFC(false);
      }
    };
    checkNFCSupport();
  }, [autoStart, allowNFCReading, abortController]);

  const stopReading = useCallback(() => {
    console.log("useNFC: stopReading called", abortController);
    isStoppedRef.current = true;
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsReading(false);
    setStatus("idle");
  }, [abortController]);

  // เพิ่ม useEffect เพื่อหยุด NFC ทันทีเมื่อ allowNFCReading เปลี่ยนเป็น false
  useEffect(() => {
    if (!allowNFCReading && isReading) {
      stopReading();
    }
  }, [allowNFCReading, isReading, stopReading]);

  const startReading = useCallback(async () => {
    isStoppedRef.current = false; // reset ทุกครั้งที่ start
    if (!supportedNFC || isReading || !allowNFCReading) return;

    if (!window.NDEFReader) {
      setError(new Error("NFC not supported on this device or browser"));
      setStatus("not-supported");
      return;
    }

    try {
      setStatus("reading");
      setIsReading(true);
      setError(null);

      const controller = new AbortController();
      setAbortController(controller);

      const ndef = new window.NDEFReader();

      ndef.onreading = (event: any) => {
        // ตรวจสอบอีกครั้งก่อนประมวลผล
        if (isStoppedRef.current) {
          console.log("NFC event ignored: stopped by ref");
          return;
        }
        if (!allowNFCReading) {
          stopReading();
          return;
        }
        const serialNumber = event.serialNumber;
        if (!serialNumber) return;

        // ไม่หยุดอ่านทันที ให้ component ควบคุมเอง

        if (isProcessing) return;

        setLastTagId(serialNumber);
        setStatus("success");
        setIsProcessing(true);

        if (onRead) {
          (async () => {
            try {
              await onRead(serialNumber);
            } catch (err) {
              console.error("Error in onRead:", err);
            } finally {
              setTimeout(() => {
                setIsProcessing(false);
              }, 500);
            }
          })();
        } else {
          setIsProcessing(false);
        }
      };

      // เปลี่ยนตรงนี้: ไม่แสดง error UI แค่ log เฉยๆ
      ndef.onreadingerror = (event) => {
        console.warn("⚠️ NFC reading error (ignored):", event);
        // ไม่ set error หรือ status แสดง UI
      };

      await ndef.scan({ signal: controller.signal }).catch((err) => {
        ndef.onreading = null;
        ndef.onreadingerror = null;
        throw err;
      });
    } catch (error: any) {
      setError(error);
      setStatus("error");
      setIsReading(false);
    }
  }, [
    onRead,
    stopReading,
    isProcessing,
    allowNFCReading,
    supportedNFC,
    isReading,
  ]);

  return {
    isReading,
    status,
    supportedNFC,
    lastTagId,
    error,
    startReading,
    stopReading,
    clearTag, // << เพิ่มออกไปด้วย
  };
}

export const checkNFCSupport = (): boolean => {
  return "NDEFReader" in window;
};

export default useNFC;
