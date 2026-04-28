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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
