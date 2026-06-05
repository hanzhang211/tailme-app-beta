"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MerchantIndex() {
  const router = useRouter();
  useEffect(() => { router.replace("/merchant/dashboard"); }, [router]);
  return null;
}
