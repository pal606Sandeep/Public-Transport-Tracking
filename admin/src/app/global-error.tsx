"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          fontFamily: "system-ui, sans-serif",
          padding: 24,
          textAlign: "center",
        }}
      >
        <h2>Something went wrong</h2>
        <p style={{ color: "#64748b", fontSize: 14 }}>{error.message}</p>
        <button
          onClick={reset}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
