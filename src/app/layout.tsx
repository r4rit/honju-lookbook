import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR } from "next/font/google";
import type { ReactNode } from "react";
import { FamilyIdentityModal } from "@/components/layout/FamilyIdentityModal";
import { FamilyIdentityProvider } from "@/components/providers/FamilyIdentityProvider";
import { FontScaleProvider } from "@/components/providers/FontScaleProvider";
import "./globals.css";

const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-noto-serif-kr",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL &&
  process.env.NEXT_PUBLIC_SITE_URL.startsWith("http")
    ? process.env.NEXT_PUBLIC_SITE_URL
    : "https://honju-lookbook.vercel.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF8F5",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "혼주 룩북 — 우리 가족 메이크업 후보 모음",
    template: "%s | 혼주 룩북",
  },
  description:
    "양가 어머님과 가족이 함께 비교하고 의견을 나누는 혼주 메이크업 룩북",
  openGraph: {
    locale: "ko_KR",
    type: "website",
    siteName: "혼주 룩북",
    url: "/",
    title: "혼주 룩북 — 우리 가족 메이크업 후보 모음",
    description:
      "양가 어머님과 가족이 함께 비교하고 의견을 나누는 혼주 메이크업 룩북",
  },
  twitter: {
    card: "summary_large_image",
    title: "혼주 룩북 — 우리 가족 메이크업 후보 모음",
    description:
      "양가 어머님과 가족이 함께 비교하고 의견을 나누는 혼주 메이크업 룩북",
  },
};

const FONT_SCALE_INIT_SCRIPT = `
try {
  var s = localStorage.getItem('honju_font_scale');
  if (s === 'large') document.documentElement.setAttribute('data-font-scale', 'large');
} catch (e) {}
`.trim();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ko"
      className={notoSerifKr.variable}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <script
          dangerouslySetInnerHTML={{ __html: FONT_SCALE_INIT_SCRIPT }}
        />
      </head>
      <body>
        <FontScaleProvider>
          <FamilyIdentityProvider>
            {children}
            <FamilyIdentityModal />
          </FamilyIdentityProvider>
        </FontScaleProvider>
      </body>
    </html>
  );
}
