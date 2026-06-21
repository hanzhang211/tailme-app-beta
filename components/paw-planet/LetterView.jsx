"use client";

/**
 * components/paw-planet/LetterView.jsx
 * 「写给它的信」——信纸输入（对齐设计稿屏3）。第一版保存到 mock state + toast。
 * props: { petName, mock, onBack, toast }
 */

import { useState } from "react";
import { Camera } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import { PLANET_C as C } from "@/lib/pawPlanetMock";

export default function LetterView({ petName = "毛孩子", onBack, toast }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const save = () => {
    if (!content.trim()) { toast?.("写点想对它说的话吧～"); return; }
    // 第一版：mock 保存，提示已寄出。后续接 memorial_letters 表。
    toast?.("已寄到星球信箱 💌");
    setTitle(""); setContent("");
    setTimeout(() => onBack?.(), 700);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F4ECE0" }}>
      <div style={{ padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} />
        <div style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 800, color: C.text }}>写给它的信</div>
        <span style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", border: `1px solid ${C.border}`,
                       display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Camera size={17} color={C.pri} />
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 20px" }}>
        {/* 信纸 */}
        <div style={{ position: "relative", background: "#FFFDF8", borderRadius: 18, padding: "18px 16px",
                      border: "1px solid #EFE6D6", boxShadow: "0 6px 20px rgba(150,120,80,0.14)",
                      backgroundImage: "repeating-linear-gradient(transparent, transparent 33px, #F3E9DA 34px)" }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="给这封信起个标题"
            style={{ width: "100%", border: "none", background: "transparent", outline: "none",
                     fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 8 }} />
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            placeholder={`亲爱的${petName}：\n今天又想你了……`}
            rows={9}
            style={{ width: "100%", border: "none", background: "transparent", outline: "none", resize: "none",
                     fontSize: 14, color: C.text, lineHeight: "34px", fontFamily: "inherit" }} />
          <div style={{ textAlign: "right", fontSize: 13, color: C.brown, marginTop: 4 }}>—— 爱你的主人</div>
          {/* 星光瓶装饰 */}
          <div style={{ position: "absolute", right: 14, bottom: -6, fontSize: 30, opacity: 0.9 }}>🫙</div>
          <span style={{ position: "absolute", right: 50, bottom: 6, fontSize: 14 }}>✨</span>
        </div>
        <div style={{ fontSize: 11.5, color: C.sub, textAlign: "center", marginTop: 16 }}>
          每一封信，{petName}都会在爪爪星球收到哦～
        </div>
      </div>

      <div style={{ padding: "10px 16px 14px", flexShrink: 0 }}>
        <button onClick={save}
          style={{ width: "100%", padding: "15px 0", borderRadius: 16, border: "none", cursor: "pointer",
                   background: C.pri, color: "#fff", fontSize: 15.5, fontWeight: 800,
                   boxShadow: "0 6px 18px rgba(230,134,69,0.32)" }}>
          保存到星球信箱
        </button>
      </div>
    </div>
  );
}
