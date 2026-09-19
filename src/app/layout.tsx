import type { Metadata, Viewport } from "next";
import { Bai_Jamjuree, IBM_Plex_Sans_Thai } from "next/font/google";
import { RestaurantProvider } from "@/context/RestaurantContext";
import "./globals.css";

// Display: squarish, tightly set — the stamped lettering of a noodle-shop sign.
const baiJamjuree = Bai_Jamjuree({
  subsets: ["thai", "latin"],
  variable: "--font-bai-jamjuree",
  weight: ["500", "600", "700"],
  display: "swap",
});

// Body: even colour and true tabular figures, which the prices and timers need.
const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-plex-thai",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "รามยอนออนนี่ | สั่งอาหารจากโต๊ะของคุณ",
  description:
    "สแกน QR บนโต๊ะแล้วสั่งอาหารเกาหลีได้เอง ดูสถานะทุกจานจนกว่าจะถึงโต๊ะ",
};

export const viewport: Viewport = {
  themeColor: "#e53935",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${baiJamjuree.variable} ${plexThai.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-brand-bg text-ink font-sans">
        <RestaurantProvider>{children}</RestaurantProvider>
      </body>
    </html>
  );
}
