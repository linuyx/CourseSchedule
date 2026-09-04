import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '课序 · 每周课程表',
  description: '清晰查看每周课程，并在当前浏览器维护课程、教师与教室安排。',
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
