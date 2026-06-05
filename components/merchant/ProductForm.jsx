"use client";

/**
 * components/merchant/ProductForm.jsx
 * 商品发布 / 编辑表单（新增与编辑共用）。
 * 保存为草稿(draft) 或 提交审核(pending_review)。商家不能直接置 approved。
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveProduct, saveProductDocs, listProductDocs, deleteProduct,
  uploadMerchantImage, docsForCategory, PRODUCT_CATEGORIES, HIGH_RISK_CATEGORIES,
} from "@/services/merchantService";
import {
  MC, Card, Field, Input, Textarea, Select, Btn, Banner, ImageUpload, StatusBadge, SectionTitle,
} from "./ui";

export default function ProductForm({ storeId, storeApproved, product, onDone, toast }) {
  const router = useRouter();
  const isEdit = !!product?.id;

  const [form, setForm] = useState(() => ({
    title:          product?.title || "",
    category_id:    product?.category_id || PRODUCT_CATEGORIES[0].id,
    price:          product?.price ?? "",
    original_price: product?.original_price ?? "",
    stock:          product?.stock ?? "",
    unit:           product?.unit || "",
    main_image:     product?.main_image || "",
    gallery:        product?.gallery || [],
    detail_images:  product?.detail_images || [],
    tags:           product?.tags || [],
    description:    product?.description || "",
  }));
  const [tagInput, setTagInput] = useState("");
  const [docs, setDocs] = useState({});       // { doc_type: file_url }
  const [busy, setBusy] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null);

  // 编辑模式载入已存的证明材料
  useEffect(() => {
    if (product?.id) listProductDocs(product.id).then((rows) => {
      const m = {}; rows.forEach((r) => { m[r.doc_type] = r.file_url; }); setDocs(m);
    }).catch(() => {});
  }, [product?.id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const required = docsForCategory(form.category_id);
  const isHighRisk = HIGH_RISK_CATEGORIES.includes(form.category_id);

  const upload = (kind, cb) => async (file) => {
    setUploadingKey(kind);
    try { cb(await uploadMerchantImage(file, storeId, kind)); }
    catch (e) { toast?.(e.message || "上传失败", "error"); }
    finally { setUploadingKey(null); }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t) && form.tags.length < 6) setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  };

  const validate = (submit) => {
    if (!form.title.trim()) return "请填写商品名称";
    if (form.price === "" || isNaN(parseFloat(form.price))) return "请填写有效价格";
    if (!form.main_image) return "请上传商品主图";
    if (submit) {
      const missing = required.filter((d) => !docs[d.type]);
      if (missing.length) return `提交审核前请补齐证明材料：${missing.map((d) => d.name).join("、")}`;
    }
    return null;
  };

  const handleSave = async (submit) => {
    const e = validate(submit);
    if (e) return toast?.(e, "error");
    setBusy(true);
    try {
      const saved = await saveProduct({
        storeId, productId: product?.id, fields: form, submit,
      });
      await saveProductDocs(saved.id, Object.entries(docs).map(([doc_type, file_url]) => ({ doc_type, file_url })));
      toast?.(submit ? "已提交审核" : "已保存草稿", "success");
      setTimeout(() => onDone?.(saved), 700);
    } catch (err) {
      toast?.(err.message || "保存失败", "error");
    } finally { setBusy(false); }
  };

  const handleDelete = async () => {
    if (!product?.id) return;
    if (!confirm(`删除商品「${product.title}」？此操作不可撤销。`)) return;
    setBusy(true);
    try { await deleteProduct(product.id, storeId); toast?.("已删除", "success"); setTimeout(() => router.replace("/merchant/products"), 600); }
    catch (e) { toast?.(e.message, "error"); setBusy(false); }
  };

  return (
    <>
      <SectionTitle sub={isEdit ? "修改后需重新提交审核" : "填写商品信息并提交平台审核"}
        right={isEdit ? <StatusBadge status={product.status} /> : null}>
        {isEdit ? "编辑商品" : "发布商品"}
      </SectionTitle>

      {isEdit && product.status === "rejected" && product.reject_reason && (
        <div style={{ marginBottom: 16 }}><Banner tone="err">审核反馈：{product.reject_reason}</Banner></div>
      )}
      {!storeApproved && (
        <div style={{ marginBottom: 16 }}><Banner tone="warn">店铺尚未通过审核，商品提交后将在店铺通过后才会上线到商城。</Banner></div>
      )}

      {/* 基本信息 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: MC.ink, marginBottom: 16 }}>基本信息</div>
        <Field label="商品名称" required>
          <Input value={form.title} onChange={set("title")} placeholder="例：TailMe 全价犬粮 成犬通用 2kg" maxLength={60} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="商品分类" required>
            <Select value={form.category_id} onChange={set("category_id")}>
              {PRODUCT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="商品单位" hint="如 袋 / 件 / 盒">
            <Input value={form.unit} onChange={set("unit")} placeholder="袋" maxLength={6} />
          </Field>
          <Field label="商品价格 (¥)" required>
            <Input value={form.price} onChange={set("price")} placeholder="169" inputMode="decimal" />
          </Field>
          <Field label="划线价 / 原价 (¥)" hint="可空">
            <Input value={form.original_price} onChange={set("original_price")} placeholder="199" inputMode="decimal" />
          </Field>
          <Field label="库存数量" required>
            <Input value={form.stock} onChange={set("stock")} placeholder="999" inputMode="numeric" />
          </Field>
        </div>

        {isHighRisk && <Banner tone="warn">该品类属于高风险（驱虫 / 药品），提交后须经平台人工审核，不支持自动上线。</Banner>}

        {/* 标签 */}
        <Field label="商品标签" hint="最多 6 个，回车添加" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {form.tags.map((t) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: MC.tint,
                                     color: MC.priDark, borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 700 }}>
                {t}
                <span onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))}
                  style={{ cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</span>
              </span>
            ))}
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="+ 标签" maxLength={10}
              style={{ border: "none", outline: "none", fontSize: 13, background: "transparent", color: MC.text, minWidth: 70 }} />
          </div>
        </Field>
      </Card>

      {/* 图片 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: MC.ink, marginBottom: 16 }}>商品图片</div>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: MC.text, marginBottom: 7 }}>主图 <span style={{ color: MC.err }}>*</span></div>
            <ImageUpload value={form.main_image} busy={uploadingKey === "main"}
              onPick={upload("main", (url) => setForm((f) => ({ ...f, main_image: url })))} w={120} h={120} />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <MultiImage label="轮播图（最多 5 张）" max={5} value={form.gallery} uploadingKey={uploadingKey}
              onUpload={upload("gallery", (url) => setForm((f) => ({ ...f, gallery: [...f.gallery, url].slice(0, 5) })))}
              onRemove={(i) => setForm((f) => ({ ...f, gallery: f.gallery.filter((_, x) => x !== i) }))} />
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <MultiImage label="商品详情大图（最多 8 张）" max={8} value={form.detail_images} uploadingKey={uploadingKey}
            onUpload={upload("detail", (url) => setForm((f) => ({ ...f, detail_images: [...f.detail_images, url].slice(0, 8) })))}
            onRemove={(i) => setForm((f) => ({ ...f, detail_images: f.detail_images.filter((_, x) => x !== i) }))} />
        </div>
      </Card>

      {/* 描述 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: MC.ink, marginBottom: 16 }}>商品描述</div>
        <Textarea value={form.description} onChange={set("description")} rows={5}
          placeholder="介绍商品卖点、规格、适用对象等" maxLength={1000} style={{ minHeight: 120 }} />
      </Card>

      {/* 证明材料 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: MC.ink, marginBottom: 4 }}>证明材料</div>
        <div style={{ fontSize: 12.5, color: MC.sub, marginBottom: 16 }}>
          根据所选分类，提交审核前需补齐以下材料（{PRODUCT_CATEGORIES.find((c) => c.id === form.category_id)?.name}）。
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16 }}>
          {required.map((d) => (
            <div key={d.type}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: MC.text, marginBottom: 7 }}>
                {d.name} <span style={{ color: MC.err }}>*</span>
              </div>
              <ImageUpload value={docs[d.type]} busy={uploadingKey === `doc-${d.type}`} w="100%" h={104}
                onPick={upload(`doc-${d.type}`, (url) => setDocs((m) => ({ ...m, [d.type]: url })))} />
            </div>
          ))}
        </div>
      </Card>

      {/* 操作 */}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", alignItems: "center" }}>
        {isEdit && <Btn variant="danger" onClick={handleDelete} disabled={busy} style={{ marginRight: "auto" }}>删除商品</Btn>}
        <Btn variant="ghost" onClick={() => handleSave(false)} disabled={busy}>保存草稿</Btn>
        <Btn onClick={() => handleSave(true)} disabled={busy}>{busy ? "处理中…" : "提交审核"}</Btn>
      </div>
    </>
  );
}

function MultiImage({ label, value, max, onUpload, onRemove, uploadingKey }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: MC.text, marginBottom: 7 }}>{label}</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {value.map((url, i) => (
          <div key={i} style={{ position: "relative", width: 92, height: 92, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <span onClick={() => onRemove(i)}
              style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%",
                       background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 13, display: "flex",
                       alignItems: "center", justifyContent: "center", cursor: "pointer" }}>×</span>
          </div>
        ))}
        {value.length < max && (
          <ImageUpload value="" busy={uploadingKey === (label.includes("详情") ? "detail" : "gallery")}
            onPick={onUpload} w={92} h={92} label="添加" />
        )}
      </div>
    </div>
  );
}
