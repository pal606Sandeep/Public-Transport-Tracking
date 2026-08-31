"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 32,
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Application error</h1>
        <p style={{ fontSize: 14, color: "#71717a", maxWidth: 360 }}>
          {error.message || "The app failed to load."}
        </p>
        <button
          onClick={reset}
          style={{
            borderRadius: 9999,
            border: "none",
            padding: "8px 20px",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            background: "#111",
            color: "#fff",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
