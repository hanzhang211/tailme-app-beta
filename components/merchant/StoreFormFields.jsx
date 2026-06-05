"use client";

/**
 * components/merchant/StoreFormFields.jsx
 * 店铺资质表单字段（入驻 & 编辑共用）。受控：{ form, setForm }。
 * 文件/图片上传走 uploadMerchantImage（storeId 可为空 → 暂存到 _new 路径）。
 */

import { useState } from "react";
import { uploadMerchantImage } from "@/services/merchantService";
import { MC, Field, Input, Textarea, ImageUpload } from "./ui";

export default function StoreFormFields({ form, setForm, storeId, toast }) {
  const [uploading, setUploading] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pick = (key, kind = "doc") => async (file) => {
    setUploading(key);
    try {
      const url = await uploadMerchantImage(file, storeId, kind);
      setForm((f) => ({ ...f, [key]: url }));
    } catch (e) {
      toast?.(e.message || "上传失败", "error");
    } finally {
      setUploading(null);
    }
  };

  return (
    <>
      {/* 店铺基础信息 */}
      <div style={{ fontSize: 13, fontWeight: 800, color: MC.ink, margin: "4px 0 14px" }}>店铺信息</div>

      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: MC.text, marginBottom: 7 }}>店铺 Logo</div>
          <ImageUpload value={form.logo_url} onPick={pick("logo_url", "store")}
            busy={uploading === "logo_url"} label="上传 Logo" w={100} h={100} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Field label="店铺名称" required>
            <Input value={form.name || ""} onChange={set("name")} placeholder="例：TailMe 官方旗舰店" maxLength={40} />
          </Field>
          <Field label="联系方式" hint="电话 / 微信，用于平台联系">
            <Input value={form.contact || ""} onChange={set("contact")} placeholder="例：138****8888" maxLength={40} />
          </Field>
        </div>
      </div>

      <Field label="店铺简介">
        <Textarea value={form.intro || ""} onChange={set("intro")} placeholder="一句话介绍你的店铺与主营品类"
          rows={2} maxLength={120} style={{ minHeight: 64 }} />
      </Field>

      {/* 公司与资质 */}
      <div style={{ fontSize: 13, fontWeight: 800, color: MC.ink, margin: "20px 0 14px",
                    paddingTop: 16, borderTop: `1px solid ${MC.line}` }}>公司信息与资质证明</div>

      <Field label="公司名称" required>
        <Input value={form.company_name || ""} onChange={set("company_name")} placeholder="营业执照上的公司全称" maxLength={60} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16 }}>
        <DocSlot label="营业执照" required value={form.license_url} busy={uploading === "license_url"} onPick={pick("license_url")} />
        <DocSlot label="品牌授权文件" value={form.brand_auth_url} busy={uploading === "brand_auth_url"} onPick={pick("brand_auth_url")} />
        <DocSlot label="食品经营 / 生产许可" value={form.food_license_url} busy={uploading === "food_license_url"} onPick={pick("food_license_url")} />
      </div>
      <div style={{ fontSize: 12, color: MC.sub, marginTop: 10, lineHeight: 1.6 }}>
        资质材料用于平台审核，审核通过后店铺方可正式经营。支持图片格式（jpg / png）。
      </div>
    </>
  );
}

function DocSlot({ label, required, value, busy, onPick }) {
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: MC.text, marginBottom: 7 }}>
        {label} {required && <span style={{ color: MC.err }}>*</span>}
      </div>
      <ImageUpload value={value} onPick={onPick} busy={busy} label="上传" w="100%" h={104} />
    </div>
  );
}
