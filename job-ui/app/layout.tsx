import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Monitor & Notification System",
  description:
    "Production-ready folder monitoring and job notification dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' className='h-full antialiased'>
      <body className='min-h-full flex flex-col font-sans bg-gray-50 text-gray-900 antialiased'>
        {children}
      </body>
    </html>
  );
}
