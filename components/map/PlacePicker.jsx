"use client";

/**
 * components/map/PlacePicker.jsx
 * 滴滴式地点选择：输入门店/小区/地址 → 高德搜索 → 选中后回填 {placeName, address, lat, lng}。
 * 也可「使用我的当前位置」。复用在警示/友好上报第一步，以及地图「搜索地点」浮层。
 */

import { useEffect, useRef, useState } from "react";
import { searchPlaces } from "@/services/amapService";

const C = {
  pri: "#E68645", bg: "#EEE9E1", tint: "#F2E5DA", text: "#1A1006", sub: "#8A8074", border: "#E4DDD2",
};

export default function PlacePicker({ location, onPick, placeholder = "搜索门店、小区或地址", allowCurrent = true }) {
  const [kw, setKw] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!kw.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try { setResults(await searchPlaces(kw, location?.lat, location?.lng)); }
      catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
    return () => timer.current && clearTimeout(timer.current);
  }, [kw, location?.lat, location?.lng]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff",
                    border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "11px 14px" }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke={C.sub} strokeWidth="2" />
          <path d="M20 20l-3.2-3.2" stroke={C.sub} strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder={placeholder} autoFocus
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: C.text, minWidth: 0 }} />
        {kw && <span onClick={() => setKw("")} style={{ color: C.sub, cursor: "pointer", fontSize: 16 }}>×</span>}
      </div>

      {allowCurrent && location && (
        <button onClick={() => onPick({
          placeName: location.city ? `${location.city}（我的位置）` : "我的当前位置",
          address: location.city || "我的当前位置", lat: location.lat, lng: location.lng,
          current: true,
        })}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: "transparent",
                   border: "none", cursor: "pointer", padding: "12px 4px", marginTop: 4 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: C.tint, display: "flex",
                         alignItems: "center", justifyContent: "center", fontSize: 15 }}>📍</span>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: C.pri }}>使用我的当前位置</span>
        </button>
      )}

      <div style={{ marginTop: 4 }}>
        {loading && <div style={{ color: C.sub, fontSize: 12.5, padding: "12px 4px" }}>搜索中…</div>}
        {!loading && kw.trim() && results.length === 0 && (
          <div style={{ color: C.sub, fontSize: 12.5, padding: "12px 4px" }}>没有找到相关地点，换个关键词试试</div>
        )}
        {results.map((r) => (
          <button key={r.id} onClick={() => onPick({ placeName: r.name, address: r.address || r.name, lat: r.lat, lng: r.lng })}
            style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 10,
                     background: "transparent", border: "none", borderBottom: `1px solid ${C.bg}`,
                     cursor: "pointer", padding: "11px 4px" }}>
            <span style={{ marginTop: 1, fontSize: 15 }}>📌</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: C.text,
                             overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
              <span style={{ display: "block", fontSize: 11.5, color: C.sub, marginTop: 2,
                             overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.address}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
