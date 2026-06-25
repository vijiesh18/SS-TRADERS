"use client";

export default function OfflinePage() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f5f0e8", padding: 24,
    }}>
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: "rgba(180,155,110,0.12)", display: "flex",
          alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px", fontSize: 28,
        }}>📡</div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, color: "#2c2418", marginBottom: 8 }}>
          You&apos;re Offline
        </h1>
        <p style={{ fontSize: 14, color: "#a8937a", lineHeight: 1.6, marginBottom: 24 }}>
          Check your internet connection and try again. Previously visited pages may still be available.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "12px 28px", borderRadius: 10,
            background: "linear-gradient(135deg, #6b7c45, #8fa05a)",
            color: "#fff", border: "none", fontSize: 14, fontWeight: 700,
            cursor: "pointer", boxShadow: "0 4px 14px rgba(107,124,69,0.35)",
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
