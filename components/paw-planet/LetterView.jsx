"use client";

/**
 * components/paw-planet/LetterView.jsx
 * 「写给它的信」——梦幻紫星空信纸（仅视觉改造；保存/输入逻辑保持不变）。
 * props: { petName, petId, userId, avatar, petType, onBack, toast, onLetterSaved }
 */

import { useState } from "react";
import { Camera, Mail } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import FloatingStars from "@/components/paw-planet/FloatingStars";
import { PLANET_PURPLE as P, GlassCircle } from "@/components/paw-planet/PlanetDecor";
import { addMemorialLetter } from "@/services/memorialLetterService";

export default function LetterView({ petName = "毛孩子", petId, userId, avatar, petType = "dog", onBack, toast, onLetterSaved }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [signer, setSigner] = useState("主人"); // 署名「爱你的__」，用户可改
  const [saving, setSaving] = useState(false);
  const petImg = avatar || (petType === "cat" ? "/cat.png" : "/dog.png");

  const save = async () => {
    if (!content.trim()) { toast?.("写点想对它说的话吧～"); return; }
    if (saving) return;
    setSaving(true);
    try {
      // 真实写入 Supabase memorial_letters（记录在案）；署名一并写进信末
      const body = content.trim();
      const full = signer.trim() ? `${body}\n\n—— 爱你的${signer.trim()}` : body;
      await addMemorialLetter({ userId, petId, title, content: full });
      onLetterSaved?.();
      toast?.("已寄到星球信箱 💌");
      setTitle(""); setContent("");
      setTimeout(() => onBack?.(), 700);
    } catch (e) {
      toast?.("寄送失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ height: "100%", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", background: P.bg }}>
      <FloatingStars />

      {/* header */}
      <div style={{ position: "relative", zIndex: 1, padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} bg={P.glassBtn} color="#fff" border={false} shadow={false} />
        <div style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: 800, color: "#fff" }}>
          写给{petName}的信 <span style={{ fontSize: 13 }}>✨</span>
        </div>
        <GlassCircle ariaLabel="相机"><Camera size={17} color="#fff" /></GlassCircle>
      </div>

      <div style={{ position: "relative", zIndex: 1, flex: 1, overflowY: "auto", padding: "46px 16px 20px" }}>
        {/* 信纸 + 宠物趴在上沿 */}
        <div style={{ position: "relative" }}>
          <img src={petImg} alt={petName}
               style={{ position: "absolute", top: -42, left: 24, width: 78, height: 78, objectFit: "contain", zIndex: 2,
                        filter: "drop-shadow(0 6px 12px rgba(20,16,60,0.35))" }} />
          <div style={{ position: "relative", zIndex: 1, background: P.paper, borderRadius: 28, padding: "20px 18px 18px",
                        border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 18px 60px rgba(25,20,80,0.32)",
                        backgroundImage: `repeating-linear-gradient(transparent, transparent 33px, ${P.paperLine} 34px)` }}>
            <input className="pp-letter-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="给这封信起个标题"
              style={{ width: "100%", border: "none", background: "transparent", outline: "none",
                       fontSize: 15, fontWeight: 800, color: P.inkTitle, marginBottom: 8 }} />
            <textarea className="pp-letter-field" value={content} onChange={(e) => setContent(e.target.value)}
              placeholder={`亲爱的${petName}：\n今天又想你了……`} rows={9}
              style={{ width: "100%", border: "none", background: "transparent", outline: "none", resize: "none",
                       fontSize: 14, color: P.ink, lineHeight: "34px", fontFamily: "inherit" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2,
                          fontSize: 13, color: P.sign, marginTop: 4 }}>
              —— 爱你的
              <input className="pp-letter-field" value={signer} onChange={(e) => setSigner(e.target.value)}
                placeholder="主人" maxLength={8}
                style={{ border: "none", borderBottom: `1px dashed ${P.paperLine}`, background: "transparent",
                         outline: "none", color: P.sign, fontSize: 13, fontWeight: 700, textAlign: "center",
                         width: `${Math.max(2, signer.length) * 16 + 6}px` }} />
            </div>
            <span style={{ position: "absolute", left: 14, bottom: 10, fontSize: 15, opacity: 0.85 }}>🐾</span>
          </div>
        </div>

        <div style={{ fontSize: 12, color: P.sub, textAlign: "center", marginTop: 16 }}>
          每一封信，{petName}都会在爪爪星球收到哦～
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "10px 16px 14px", flexShrink: 0 }}>
        <button onClick={save} disabled={saving}
          style={{ width: "100%", padding: "15px 0", borderRadius: 18, border: "none",
                   cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1,
                   background: P.btn, color: "#fff", fontSize: 15.5, fontWeight: 800,
                   display: "flex", alignItems: "center", justifyContent: "center", gap: 9, boxShadow: P.btnGlow }}>
          <Mail size={18} color="#fff" /> {saving ? "寄送中..." : "保存到星球信箱"}
        </button>
      </div>

      <style>{`.pp-letter-field::placeholder{ color:${P.inkPlaceholder}; opacity:1; }`}</style>
    </div>
  );
}
