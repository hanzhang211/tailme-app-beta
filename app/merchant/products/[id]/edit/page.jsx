"use client";

/** /merchant/products/[id]/edit — 编辑商品 */

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import MerchantShell, { useMerchant } from "@/components/merchant/MerchantShell";
import ProductForm from "@/components/merchant/ProductForm";
import { getMyProduct } from "@/services/merchantService";
import { MC, useToast, Empty } from "@/components/merchant/ui";

export default function EditProductRoute() {
  return <MerchantShell active="products"><EditProduct /></MerchantShell>;
}

function EditProduct() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const { store } = useMerchant();
  const { toast, ToastHost } = useToast();
  const [product, setProduct] = useState(undefined); // undefined=loading, null=not found

  useEffect(() => {
    if (!id) return;
    getMyProduct(id).then(setProduct).catch(() => setProduct(null));
  }, [id]);

  if (product === undefined) return <div style={{ color: MC.sub, fontSize: 13, padding: 30 }}>加载中…</div>;
  if (!product || (store?.id && product.store_id !== store.id)) {
    return <Empty icon="🚫" title="商品不存在或无权访问" desc="请返回商品列表" />;
  }

  return (
    <>
      <ProductForm storeId={store?.id} storeApproved={store?.status === "approved"} product={product}
        toast={toast} onDone={() => router.replace("/merchant/products")} />
      <ToastHost />
    </>
  );
}
