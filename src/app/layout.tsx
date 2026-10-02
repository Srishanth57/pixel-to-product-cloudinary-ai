import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EchoChapters — AI Multilingual Video Intelligence Pipeline",
  description: "Turn long-form lectures and videos into searchable, multilingual, auto-clipped media libraries with Cloudinary & Gemini.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100 antialiased">
      <body className="min-h-full flex flex-col selection:bg-blue-500 selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
