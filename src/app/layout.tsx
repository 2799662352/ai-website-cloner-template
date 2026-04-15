import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Miau - 专业视频创作工具",
  description: "Miau Canvas",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark h-full antialiased">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
