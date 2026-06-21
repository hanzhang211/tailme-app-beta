"use client";

/**
 * components/paw-planet/GalleryView.jsx
 * 「回忆相册」——分类 tab + 2 列网格（对齐设计稿屏4）。第一版 mock，图片用占位块。
 * props: { petName, avatar, mock, onBack, onOpen }
 */

import { useState } from "react";
import { RotateCw, Star } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import { PLANET_C as C, GALLERY_CATEGORIES } from "@/lib/pawPlanetMock";

const THUMBS = ["linear-gradient(135deg,#FBE3D0,#F3C49B)", "linear-gradient(135deg,#DDEFC9,#B6D99A)",
                "linear-gradient(135deg,#E6DEF7,#C6BCE8)", "linear-gradient(135deg,#FCE0E6,#F2B8C6)",
                "linear-gradient(135deg,#FBEEC8,#F2D98A)", "linear-gradient(135deg,#D9ECF2,#ABD3E0)"];

export default function GalleryView({ petName = "毛孩子", avatar, mock, onBack, onOpen }) {
  const [cat, setCat] = useState("全部");
  const all = mock?.memories || [];
  const list = cat === "全部" ? all : all.filter((m) => m.category === cat);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F4ECE0" }}>
      <div style={{ padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} />
        <div style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 800, color: C.text }}>回忆相册</div>
        <span style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", border: `1px solid ${C.border}`,
                       display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <RotateCw size={16} color={C.pri} />
        </span>
      </div>

      {/* 分类 tab */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "4px 16px 10px", flexShrink: 0 }}>
        {GALLERY_CATEGORIES.map((g) => {
          const on = cat === g;
          return (
            <button key={g} onClick={() => setCat(g)}
              style={{ flexShrink: 0, padding: "7px 16px", borderRadius: 16, cursor: "pointer", fontSize: 13, fontWeight: 700,
                       background: on ? C.pri : "#fff", color: on ? "#fff" : C.sub,
                       border: `1px solid ${on ? C.pri : C.border}`, WebkitTapHighlightColor: "transparent" }}>
              {g}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 20px" }}>
        {list.length === 0 ? (
          <div style={{ textAlign: "center", color: C.sub, marginTop: 70 }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>🖼️</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>这里会慢慢装满你们的回忆</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>上传第一张照片，留下和它的故事</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {list.map((m, i) => (
              <div key={m.id} style={{ borderRadius: 16, overflow: "hidden", background: "#fff",
                                       boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
                <div style={{ height: 120, background: THUMBS[i % THUMBS.length], display: "flex",
                              alignItems: "center", justifyContent: "center" }}>
                  <img src={avatar} alt="" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover",
                                                     border: "2px solid rgba(255,255,255,0.85)" }} />
                </div>
                <div style={{ padding: "8px 10px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{m.title}</div>
                  <div style={{ fontSize: 10.5, color: C.sub, marginTop: 2 }}>{m.event_date}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: "10px 16px 14px", flexShrink: 0 }}>
        <button onClick={() => onOpen?.("card")}
          style={{ width: "100%", padding: "14px 0", borderRadius: 16, border: "none", cursor: "pointer",
                   background: C.pri, color: "#fff", fontSize: 15, fontWeight: 800,
                   display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                   boxShadow: "0 6px 18px rgba(230,134,69,0.32)" }}>
          <Star size={17} color="#fff" fill="#fff" /> 生成纪念卡片
        </button>
      </div>
    </div>
  );
}
