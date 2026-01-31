export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", margin: 0, background: "#0b0b0f", color: "#f2f2f2" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>SelfHeal</div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>Agentic CI Fix App</div>
          </div>
          <div style={{ border: "1px solid #222", borderRadius: 14, padding: 16, background: "#111118" }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}