"use client";

import { useMemo } from "react";
import qrcode from "qrcode-generator";

/** Renders `value` as a crisp, scalable QR SVG. */
export function QrCode({
  value,
  size = 220,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const svg = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }, [value]);

  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      // qrcode-generator output is a static, self-contained <svg> string
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
