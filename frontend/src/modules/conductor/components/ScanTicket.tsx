"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useValidateTicket } from "../hooks/useConductor";

// BarcodeDetector is not in lib.dom yet — minimal shape.
type BarcodeDetectorLike = {
  detect: (
    source: CanvasImageSource
  ) => Promise<{ rawValue: string }[]>;
};
type BarcodeDetectorCtor = new (opts?: {
  formats?: string[];
}) => BarcodeDetectorLike;

export function ScanTicket() {
  const validate = useValidateTicket();
  const [manual, setManual] = useState("");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const supported =
    typeof window !== "undefined" && "BarcodeDetector" in window;

  const check = (code: string) => {
    if (code.trim()) validate.mutate(code.trim());
  };

  const stop = () => {
    setScanning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = async () => {
    if (!supported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      const Ctor = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor })
        .BarcodeDetector;
      const detector = new Ctor({ formats: ["qr_code"] });
      const tick = async () => {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) {
            stop();
            check(codes[0].rawValue);
            return;
          }
        } catch {
          /* frame not ready */
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setScanning(false);
      validate.reset();
      console.error(e);
    }
  };

  useEffect(() => stop, []);

  const result = validate.data;

  return (
    <div className="flex flex-col gap-4 p-4">
      {supported ? (
        <div className="overflow-hidden rounded-[var(--radius-app)] border bg-black">
          <video
            ref={videoRef}
            className="aspect-square w-full object-cover"
            muted
            playsInline
          />
        </div>
      ) : (
        <Alert tone="info">
          Camera QR scan isn&apos;t supported on this device — enter the code
          below.
        </Alert>
      )}

      {supported && (
        <Button
          fullWidth
          variant={scanning ? "secondary" : "primary"}
          onClick={scanning ? stop : start}
        >
          {scanning ? "Stop camera" : "Scan QR"}
        </Button>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Ticket code"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <Button
          loading={validate.isPending}
          onClick={() => check(manual)}
        >
          Check
        </Button>
      </div>

      {validate.isError && (
        <Alert tone="error">{errorMessage(validate.error)}</Alert>
      )}
      {result && (
        <Alert
          tone={
            String(result.status).toUpperCase().includes("VALID") ||
            String(result.status).toUpperCase() === "USED"
              ? "success"
              : "info"
          }
        >
          {String(result.status)}
          {result.ticket
            ? ` · ${result.ticket.passengerCategory} · ${result.ticket.currency}${result.ticket.amount}`
            : ""}
        </Alert>
      )}
    </div>
  );
}
