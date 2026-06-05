import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TailMe 商家后台",
  description: "爪爪日记 · 商家中心",
};

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
