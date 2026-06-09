"use client";

/**
 * CheckupDetail.jsx — 体检记录详情页
 *
 * 健康档案点击体检记录进入。展示上传图片 + 体检信息卡 + 底部「编辑记录」。
 * 暂不做关联记录模块。
 */

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, MoreHorizontal, Pencil, X } from "lucide-react";
import { checkupResultMeta, deleteCheckupRecord } from "@/services/petCheckupService";
import PetTrashIcon from "@/components/icons/PetTrashIcon";

const BG    = "#ECEEE8";
const GREEN = "#4FA85D";
const PRI   = "#E68645";
const TEXT  = "#1A1006";
const SUB   = "#7A8275";

const fmtSlash = (d) => (d ? String(d).slice(0, 10).replace(/-/g, "/") : "—");

export default function CheckupDetail({ record, user, onBack, onEdit, onDeleted, onError }) {
  const [page, setPage] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(null); // 大图查看器：当前打开的图片索引，null=关闭
  const images = Array.isArray(record?.image_urls) ? record.image_urls : [];
  const rs = checkupResultMeta(record?.result_status);
  const rsGreen = rs.tone === "green";

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!confirm("删除这条体检记录？")) return;
    try {
      await deleteCheckupRecord(record.id, user?.id);
      onDeleted?.();
    } catch (e) {
      onError?.(e.message || "删除失败");
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: BG }}>

      {/* Header */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "52px 16px 14px" }}>
        <button onClick={onBack}
          style={{ width: 40, height: 40, borderRadius: 999, background: "rgba(255,255,255,0.7)",
                   border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                   boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <ChevronLeft size={22} color={TEXT} strokeWidth={2.5} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>体检记录详情</span>
        <div style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen((o) => !o)}
            style={{ width: 40, height: 40, borderRadius: 999, background: "rgba(255,255,255,0.7)",
                     border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                     boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <MoreHorizontal size={20} color={TEXT} />
          </button>
          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 290 }} />
              <div style={{ position: "absolute", right: 0, top: 46, zIndex: 300, background: "#fff",
                            borderRadius: 14, padding: "6px 0", minWidth: 120,
                            boxShadow: "0 10px 28px rgba(0,0,0,0.16)" }}>
                <button onClick={() => { setMenuOpen(false); onEdit?.(); }}
                  style={{ width: "100%", padding: "11px 16px", textAlign: "left", border: "none",
                           background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600,
                           color: TEXT, display: "flex", alignItems: "center", gap: 8 }}>
                  <Pencil size={15} color={SUB} /> 编辑
                </button>
                <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "0 10px" }} />
                <button onClick={handleDelete}
                  style={{ width: "100%", padding: "11px 16px", textAlign: "left", border: "none",
                           background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600,
                           color: "#D94040", display: "flex", alignItems: "center", gap: 8 }}>
                  <PetTrashIcon size={16} active /> 删除
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* 图片区 */}
        {images.length > 0 && (
          <div style={{ position: "relative" }}>
            <div onScroll={(e) => {
                   const w = e.currentTarget.clientWidth || 1;
                   setPage(Math.round(e.currentTarget.scrollLeft / w));
                 }}
                 style={{ display: "flex", gap: 10, overflowX: "auto", scrollSnapType: "x mandatory",
                          borderRadius: 16, WebkitOverflowScrolling: "touch" }}>
              {images.map((url, i) => (
                <img key={i} src={url} alt={"体检图" + (i + 1)}
                  onClick={() => setLbIndex(i)}
                  style={{ width: "100%", flexShrink: 0, height: 240, objectFit: "contain",
                           borderRadius: 16, scrollSnapAlign: "start", background: "#F2F1ED", cursor: "zoom-in" }} />
              ))}
            </div>
            {images.length > 1 && (
              <div style={{ position: "absolute", right: 12, bottom: 10, padding: "3px 10px",
                            borderRadius: 999, background: "rgba(0,0,0,0.5)", color: "#fff",
                            fontSize: 12, fontWeight: 600 }}>
                {page + 1}/{images.length}
              </div>
            )}
          </div>
        )}

        {/* 信息卡 */}
        <div style={{ background: "#fff", borderRadius: 18, padding: "4px 18px",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.05)" }}>
          <InfoLine label="记录类型" value="体检" />
          <InfoLine label="体检日期" value={fmtSlash(record?.checkup_date)} />
          <InfoLine label="体检机构" value={record?.clinic_name || "—"} />
          <InfoLine label="体检项目" value={record?.checkup_items || "—"} />
          <InfoLine label="体检结果">
            <span style={{ fontSize: 12.5, fontWeight: 700, padding: "4px 12px", borderRadius: 999,
                           background: rsGreen ? "rgba(79,168,93,0.14)" : "rgba(230,134,69,0.14)",
                           color: rsGreen ? GREEN : PRI }}>
              {rs.label}
            </span>
          </InfoLine>
          <InfoLine label="下次提醒" value={fmtSlash(record?.next_due_date)} />
          <InfoLine label="详细说明" value={record?.notes || "—"} last multiline />
        </div>
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0, padding: "10px 16px 26px", background: BG }}>
        <button onClick={onEdit}
          style={{ width: "100%", height: 50, borderRadius: 16, border: "none", background: GREEN,
                   color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
                   boxShadow: "0 6px 16px rgba(79,168,93,0.32)" }}>
          编辑记录
        </button>
      </div>

      {/* 大图查看器（全屏浮层，点击缩略图打开）*/}
      {lbIndex !== null && (
        <ImageLightbox images={images} index={lbIndex} onClose={() => setLbIndex(null)} />
      )}
    </div>
  );
}

/* 全屏大图查看器：图片完整显示(contain) + 左右滑动 + 页码 + 点背景/关闭按钮退出 */
function ImageLightbox({ images, index, onClose }) {
  const scRef = useRef(null);
  const [page, setPage] = useState(index);

  // 打开时定位到点击的那张
  useEffect(() => {
    const el = scRef.current;
    if (el) el.scrollLeft = index * (el.clientWidth || 0);
  }, [index]);

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.92)",
               display: "flex", flexDirection: "column" }}>
      {/* 顶栏：页码 + 关闭 */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "48px 18px 10px" }}>
        <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
          {images.length > 1 ? `${page + 1}/${images.length}` : ""}
        </span>
        <button onClick={onClose}
          style={{ width: 38, height: 38, borderRadius: 999, border: "none", cursor: "pointer",
                   background: "rgba(255,255,255,0.16)",
                   display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={22} color="#fff" strokeWidth={2.4} />
        </button>
      </div>

      {/* 横滑大图区（每张 contain 完整居中显示）*/}
      <div ref={scRef}
           onScroll={(e) => {
             const w = e.currentTarget.clientWidth || 1;
             setPage(Math.round(e.currentTarget.scrollLeft / w));
           }}
           style={{ flex: 1, display: "flex", overflowX: "auto", overflowY: "hidden",
                    scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
        {images.map((url, i) => (
          <div key={i}
               style={{ width: "100%", height: "100%", flexShrink: 0, scrollSnapAlign: "center",
                        display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={url} alt={"体检图" + (i + 1)}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoLine({ label, value, children, last, multiline }) {
  return (
    <div style={{ display: "flex", alignItems: multiline ? "flex-start" : "center",
                  justifyContent: "space-between", gap: 16, padding: "14px 0",
                  borderBottom: last ? "none" : "1px solid rgba(0,0,0,0.05)" }}>
      <span style={{ fontSize: 14, color: SUB, flexShrink: 0 }}>{label}</span>
      {children ? children : (
        <span style={{ fontSize: 14, fontWeight: 600, color: TEXT, textAlign: "right",
                       lineHeight: 1.5, wordBreak: "break-word" }}>{value}</span>
      )}
    </div>
  );
}
