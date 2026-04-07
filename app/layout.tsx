import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "DNS Block Manager",
  description: "BIND9 RPZ admin panel",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "monospace", background: "#0d1117", color: "#e6edf3", margin: 0 }}>
        {children}
      </body>
    </html>
  )
}