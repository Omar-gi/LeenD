import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "لين — مساحة لسؤالك",
  description: "تجربة حوارية عربية عن الصداقة، تستند إلى مصادر محددة وتعرف حدود إجابتها. عرض تجريبي للبالغين.",
  robots: { index: false, follow: false }, icons: { icon: "/icon.svg" }
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><head><link rel="preload" href="/fonts/thmanyahsans-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" /></head><body>{children}</body></html>;
}
