import type React from "react"
import type { Metadata } from "next/dist/lib/metadata/types/metadata-interface"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import LayoutWithSidebar from "@/components/LayoutWithSidebar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PrepTalk - AI Mock Interview Practice",
  description: "Practice mock interviews with AI feedback for Indian job seekers",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <LayoutWithSidebar>{children}</LayoutWithSidebar>
        </ThemeProvider>
      </body>
    </html>
  );
}
