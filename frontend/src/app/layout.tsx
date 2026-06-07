import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Synthetic Data Studio | Premium AI Mock Data Generator",
  description: "Create high-fidelity realistic datasets for AI training, software testing, development, and analytics using natural language prompts or manually structured schemas.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full w-full">
      <head>
        <meta name="theme-color" content="#4f46e5" />
      </head>
      <body className="min-h-full w-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
