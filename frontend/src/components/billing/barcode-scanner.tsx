"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Camera } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

/**
 * Camera-based barcode scanner (mobile/laptop camera) using ZXing.
 * USB barcode scanners work natively as keyboard input and don't need this component -
 * they can type directly into the product search field (which ends with Enter).
 */
export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromVideoDevice(null, videoRef.current!, (result, err) => {
        if (result) {
          onScan(result.getText());
          reader.reset();
        }
      })
      .catch((err) => {
        setError("Unable to access camera. Please check permissions.");
        console.error(err);
      });

    return () => {
      reader.reset();
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" />
            Scan Barcode
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : (
            <video ref={videoRef} className="w-full rounded-md bg-black aspect-video" muted autoPlay />
          )}
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Point the camera at a product barcode. The product will be added automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
