import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "SiteInsight AI — Web Audits for the Modern Digital Age",
    description:
        "Deep SEO, content clarity, and UX analysis in seconds. Designed for teams who obsess over the finer details of the user journey.",
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
        <body
            className={`${inter.variable} font-sans antialiased bg-surface-0 text-white min-h-screen`}
        >
        {children}
        </body>
        </html>
    );
}
