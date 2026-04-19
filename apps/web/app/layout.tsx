import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TodayTable",
  description: "Daily meal records for healthier eating habits."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
