"use client";

/** /merchant/products/new — 发布新商品 */

import { useRouter } from "next/navigation";
import MerchantShell, { useMerchant } from "@/components/merchant/MerchantShell";
import ProductForm from "@/components/merchant/ProductForm";
import { useToast } from "@/components/merchant/ui";

export default function NewProductRoute() {
  return <MerchantShell active="products"><NewProduct /></MerchantShell>;
}

function NewProduct() {
  const router = useRouter();
  const { store } = useMerchant();
  const { toast, ToastHost } = useToast();
  return (
    <>
      <ProductForm storeId={store?.id} storeApproved={store?.status === "approved"}
        toast={toast} onDone={() => router.replace("/merchant/products")} />
      <ToastHost />
    </>
  );
}
