import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Amboras Analytics",
  description: "Real-time store analytics dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#fafaf9] text-[#1a1a1a]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
