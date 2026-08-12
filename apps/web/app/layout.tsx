import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TBBT 台词素材检索",
  description: "搜索《生活大爆炸》双语台词，预览并分享视频片段",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
