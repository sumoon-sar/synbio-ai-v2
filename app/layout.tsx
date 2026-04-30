import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SynBio AI",
  description: "合成生物学 AI 分析平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <nav style={{ background: '#0891b2', padding: '0 24px', height: 48, display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="/" style={navLink}>SynBio AI</a>
          <a href="/analyze" style={navLink}>分析</a>
          <a href="/literature" style={navLink}>文献库</a>
        </nav>
        {children}
      </body>
    </html>
  );
}

const navLink: React.CSSProperties = { color: '#fff', textDecoration: 'none', fontSize: 14, fontFamily: 'system-ui' }
