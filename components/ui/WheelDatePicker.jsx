"use client";

/**
 * components/ui/WheelDatePicker.jsx
 *
 * 轻量「滚轮」日期选择器（年 / 月 / 日 三列），TailMe 暖色风格。
 * 纯 CSS scroll-snap + 滚动停止后读取选中项，无第三方依赖。
 *
 * props:
 *  - value:    "YYYY-MM-DD" 或空
 *  - onChange: (str) => void   选中后回调 "YYYY-MM-DD"
 *  - minYear:  最早可选年份（默认 今年-30）
 *  - maxDate:  可选最大日期（默认今天，不能选未来）
 */

import { useEffect, useRef, useState } from "react";

const ITEM = 40;            // 每行高度
const VISIBLE = 5;          // 可见行数（奇数，居中那行为选中）
const BOX = ITEM * VISIBLE; // 列高度
const PAD = (BOX - ITEM) / 2;

const C = { pri:"#E68645", band:"#F7ECDD", dim:"#B8AEA0" };
const pad2 = (n) => String(n).padStart(2, "0");
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

function WheelCol({ items, index, onCommit, render }) {
  const ref  = useRef(null);
  const tRef = useRef(null);
  const [live, setLive] = useState(index);

  // 外部 index 变化（或列表长度变化）→ 同步滚动位置 + 高亮
  useEffect(() => {
    setLive(index);
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ITEM) !== index) el.scrollTop = index * ITEM;
  }, [index, items.length]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    let i = Math.round(el.scrollTop / ITEM);
    i = Math.max(0, Math.min(items.length - 1, i));
    setLive(i);
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => { if (i !== index) onCommit(i); }, 110);
  };

  return (
    <div ref={ref} className="wheel-col" onScroll={onScroll}
      style={{ height:BOX, overflowY:"auto", scrollSnapType:"y mandatory", flex:1 }}>
      <div style={{ height:PAD }} />
      {items.map((it, i) => (
        <div key={i} style={{ height:ITEM, scrollSnapAlign:"center", display:"flex",
                              alignItems:"center", justifyContent:"center",
                              fontSize: i === live ? 19 : 15, fontWeight: i === live ? 800 : 500,
                              color: i === live ? C.pri : C.dim, transition:"font-size .12s, color .12s",
                              whiteSpace:"nowrap" }}>
          {render ? render(it) : it}
        </div>
      ))}
      <div style={{ height:PAD }} />
    </div>
  );
}

export default function WheelDatePicker({ value, onChange, minYear, maxDate }) {
  const today = maxDate ? new Date(maxDate) : new Date();
  const tY = today.getFullYear(), tM = today.getMonth() + 1, tD = today.getDate();
  const startY = minYear || tY - 30;

  const parsed = value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.split("-").map(Number) : [tY, tM, tD];
  const [d, setD] = useState({ y: parsed[0], m: parsed[1], dd: parsed[2] });

  const years = [];
  for (let y = startY; y <= tY; y++) years.push(y);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: daysInMonth(d.y, d.m) }, (_, i) => i + 1);

  const commit = (y, m, dd) => {
    let mm = m, ddd = dd;
    if (ddd > daysInMonth(y, mm)) ddd = daysInMonth(y, mm);
    if (y === tY) {                          // 不能选未来
      if (mm > tM) mm = tM;
      if (mm === tM && ddd > tD) ddd = tD;
      if (ddd > daysInMonth(y, mm)) ddd = daysInMonth(y, mm);
    }
    setD({ y, m: mm, dd: ddd });
    onChange?.(`${y}-${pad2(mm)}-${pad2(ddd)}`);
  };

  // 无初值时挂载即回填默认（避免流程被卡住）
  useEffect(() => { if (!value) onChange?.(`${d.y}-${pad2(d.m)}-${pad2(d.dd)}`); }, []); // eslint-disable-line

  return (
    <div style={{ position:"relative", height:BOX, userSelect:"none" }}>
      {/* 中心高亮带 */}
      <div style={{ position:"absolute", left:6, right:6, top:PAD, height:ITEM, borderRadius:12,
                    background:C.band, zIndex:0 }} />
      <div style={{ position:"absolute", inset:0, display:"flex", zIndex:1 }}>
        <WheelCol items={years}  index={years.indexOf(d.y)} render={(v) => `${v} 年`}
                  onCommit={(i) => commit(years[i], d.m, d.dd)} />
        <WheelCol items={months} index={d.m - 1} render={(v) => `${v} 月`}
                  onCommit={(i) => commit(d.y, i + 1, d.dd)} />
        <WheelCol items={days}   index={d.dd - 1} render={(v) => `${v} 日`}
                  onCommit={(i) => commit(d.y, d.m, i + 1)} />
      </div>
      {/* 上下渐隐遮罩 */}
      <div style={{ position:"absolute", left:0, right:0, top:0, height:PAD, zIndex:2, pointerEvents:"none",
                    background:"linear-gradient(#fff, rgba(255,255,255,0))" }} />
      <div style={{ position:"absolute", left:0, right:0, bottom:0, height:PAD, zIndex:2, pointerEvents:"none",
                    background:"linear-gradient(rgba(255,255,255,0), #fff)" }} />
      <style>{`.wheel-col{scrollbar-width:none;-ms-overflow-style:none;}
        .wheel-col::-webkit-scrollbar{display:none;}`}</style>
    </div>
  );
}
