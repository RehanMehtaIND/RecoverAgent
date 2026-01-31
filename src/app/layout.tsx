import { Space_Grotesk } from "next/font/google"

const space = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={space.className} style={body}>
        <div style={bgGlow} />
        <div style={wrap}>
          <header style={header}>
            <div style={{ display: "grid" }}>
              <div style={logo}>SelfHeal</div>
              <div style={tagline}>Agentic CI Fix App</div>
            </div>
            <div style={pill}>Build → Patch → Verify → PR</div>
          </header>
          <main style={panel}>{children}</main>
        </div>
      </body>
    </html>
  )
}

const body: React.CSSProperties = {
  margin: 0,
  minHeight: "100vh",
  background: "radial-gradient(circle at 20% 20%, rgba(70,120,255,0.16), transparent 45%), radial-gradient(circle at 80% 10%, rgba(120,255,230,0.14), transparent 40%), #0a0a0f",
  color: "#f5f6f8"
}

const bgGlow: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  background: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.05), transparent 55%)"
}

const wrap: React.CSSProperties = {
  maxWidth: 1040,
  margin: "0 auto",
  padding: "28px 20px 40px",
  position: "relative"
}

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 18,
  gap: 12,
  flexWrap: "wrap"
}

const logo: React.CSSProperties = {
  fontWeight: 700,
  letterSpacing: 0.3,
  fontSize: 20
}

const tagline: React.CSSProperties = {
  opacity: 0.7,
  fontSize: 12
}

const pill: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.06)"
}

const panel: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 20,
  padding: 20,
  background: "rgba(12,12,18,0.75)",
  boxShadow: "0 18px 50px rgba(0,0,0,0.35)"
}
