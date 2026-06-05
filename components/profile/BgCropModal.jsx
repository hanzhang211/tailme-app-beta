"use client";

/**
 * components/profile/BgCropModal.jsx
 *
 * 背景图裁剪 / 取景弹窗：用户拖动 + 缩放，所见即所得地选择要展示的区域，
 * 按目标比例（与「我的」页顶部背景条一致）导出一张已裁好的小图（JPEG）。
 * 既解决「不知道会裁哪部分」，又因为导出小图而显著加快上传。
 *
 * props:
 *  - file:      用户选择的原图 File
 *  - aspect:    目标宽高比（背景条 宽/高）
 *  - onCancel()
 *  - onConfirm(blob)   导出裁好的 image/jpeg Blob
 */

import { useEffect, useRef, useState } from "react";

const C = { pri:"#E68645", bg:"#1A1614", text:"#fff", sub:"rgba(255,255,255,0.7)" };

export default function BgCropModal({ file, aspect = 1.95, onCancel, onConfirm }) {
  const wrapRef = useRef(null);
  const dragRef = useRef(null);
  const [img, setImg]   = useState(null);          // 已加载的 HTMLImageElement
  const [nat, setNat]   = useState({ w: 0, h: 0 });
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [z, setZ]       = useState(1);             // 缩放倍数（>=1）
  const [off, setOff]   = useState({ x: 0, y: 0 }); // 图片左上角相对取景框的偏移
  const [busy, setBusy] = useState(false);

  // 载入图片
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { setImg(im); setNat({ w: im.naturalWidth, h: im.naturalHeight }); };
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // 计算取景框尺寸（按容器宽度 + 目标比例）
  useEffect(() => {
    const cw = Math.min(wrapRef.current?.clientWidth || 320, 360);
    setFrame({ w: cw, h: Math.round(cw / aspect) });
  }, [aspect, img]);

  const scaleCover = (nat.w && nat.h && frame.w)
    ? Math.max(frame.w / nat.w, frame.h / nat.h) : 1;
  const scale = scaleCover * z;
  const dw = nat.w * scale, dh = nat.h * scale;

  const clampOff = (o, w = dw, h = dh) => ({
    x: Math.min(0, Math.max(frame.w - w, o.x)),
    y: Math.min(0, Math.max(frame.h - h, o.y)),
  });

  // 图片/取景框就绪后居中
  useEffect(() => {
    if (dw && dh && frame.w) setOff(clampOff({ x: (frame.w - dw) / 2, y: (frame.h - dh) / 2 }));
    // eslint-disable-next-line
  }, [img, frame.w, frame.h]);

  const onZoom = (nz) => {
    const fx = frame.w / 2, fy = frame.h / 2;          // 以取景框中心为焦点
    const ix = (fx - off.x) / scale, iy = (fy - off.y) / scale;
    const ns = scaleCover * nz, ndw = nat.w * ns, ndh = nat.h * ns;
    setZ(nz);
    setOff(clampOff({ x: fx - ix * ns, y: fy - iy * ns }, ndw, ndh));
  };

  const onPointerDown = (e) => {
    dragRef.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = dragRef.current; if (!d) return;
    setOff(clampOff({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }));
  };
  const onPointerUp = () => { dragRef.current = null; };

  const confirm = () => {
    if (!img || !frame.w || busy) return;
    setBusy(true);
    try {
      const outW = Math.min(Math.round(frame.w * 2), 1080);
      const outH = Math.round(outW / aspect);
      const cvs = document.createElement("canvas");
      cvs.width = outW; cvs.height = outH;
      const ctx = cvs.getContext("2d");
      const sx = -off.x / scale, sy = -off.y / scale;
      const sw = frame.w / scale, sh = frame.h / scale;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
      cvs.toBlob((b) => { if (b) onConfirm(b); else setBusy(false); }, "image/jpeg", 0.85);
    } catch { setBusy(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(0,0,0,0.7)",
                  display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div ref={wrapRef} style={{ width:"100%", maxWidth:400, background:C.bg, borderRadius:22,
                                  padding:"18px 16px 16px", boxShadow:"0 12px 40px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize:16, fontWeight:800, color:C.text, textAlign:"center", marginBottom:4 }}>调整背景</div>
        <div style={{ fontSize:12, color:C.sub, textAlign:"center", marginBottom:14 }}>拖动图片、滑动缩放，框内即为展示区域</div>

        {/* 取景框 */}
        <div style={{ position:"relative", width:frame.w || "100%", height:frame.h || 160, margin:"0 auto",
                      borderRadius:12, overflow:"hidden", background:"#000", touchAction:"none",
                      cursor: dragRef.current ? "grabbing" : "grab" }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
          {img && (
            <img src={img.src} alt="" draggable={false}
              style={{ position:"absolute", left:off.x, top:off.y, width:dw, height:dh,
                       maxWidth:"none", userSelect:"none", pointerEvents:"none" }} />
          )}
          {/* 取景边框提示 */}
          <div style={{ position:"absolute", inset:0, boxShadow:"inset 0 0 0 2px rgba(255,255,255,0.5)",
                        borderRadius:12, pointerEvents:"none" }} />
        </div>

        {/* 缩放滑块 */}
        <div style={{ display:"flex", alignItems:"center", gap:10, margin:"16px 4px 4px" }}>
          <span style={{ color:C.sub, fontSize:13 }}>－</span>
          <input type="range" min="1" max="3" step="0.01" value={z}
            onChange={(e) => onZoom(parseFloat(e.target.value))}
            style={{ flex:1, accentColor:C.pri, cursor:"pointer" }} />
          <span style={{ color:C.sub, fontSize:15 }}>＋</span>
        </div>

        {/* 操作按钮 */}
        <div style={{ display:"flex", gap:12, marginTop:14 }}>
          <button onClick={onCancel} disabled={busy}
            style={{ flex:1, padding:"13px 0", borderRadius:14, fontSize:15, fontWeight:700,
                     background:"rgba(255,255,255,0.12)", color:C.text, border:"none",
                     cursor: busy ? "default" : "pointer" }}>取消</button>
          <button onClick={confirm} disabled={busy || !img}
            style={{ flex:1, padding:"13px 0", borderRadius:14, fontSize:15, fontWeight:800,
                     background: (busy || !img) ? "#7A5436" : C.pri, color:"#fff", border:"none",
                     cursor: (busy || !img) ? "default" : "pointer" }}>
            {busy ? "处理中…" : "使用这张"}
          </button>
        </div>
      </div>
    </div>
  );
}
