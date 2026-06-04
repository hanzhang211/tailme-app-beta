"use client";

/**
 * components/community/ChatSkeleton.jsx
 *
 * 聊天加载占位骨架（替代"加载中..."）：
 *  - MsgSkeleton：消息气泡占位（左右交错）
 *  - RowSkeleton：会话/房间列表行占位
 * 纯 CSS shimmer，无业务逻辑。
 */

const SKEL = "#ECE6DC";
const BORDER = "#E3DCD0";

function Shimmer() {
  return (
    <div style={{ position:"absolute", inset:0,
                  background:"linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.6) 50%, transparent 80%)",
                  transform:"translateX(-100%)", animation:"chatSkel 1.3s ease-in-out infinite" }} />
  );
}

/* 消息气泡骨架 */
export function MsgSkeleton() {
  const rows = [
    { own:false, w:150, h:38 },
    { own:true,  w:120, h:34 },
    { own:false, w:190, h:54 },
    { own:false, w:96,  h:34 },
    { own:true,  w:160, h:44 },
    { own:false, w:130, h:38 },
  ];
  return (
    <div style={{ padding:"4px 0" }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display:"flex", gap:8, marginBottom:14,
                              flexDirection: r.own ? "row-reverse" : "row" }}>
          {!r.own && <div style={{ width:34, height:34, borderRadius:"50%", background:SKEL, flexShrink:0 }} />}
          <div style={{ position:"relative", width:r.w, height:r.h, borderRadius:16,
                        background:SKEL, overflow:"hidden",
                        borderTopLeftRadius: r.own ? 16 : 6, borderTopRightRadius: r.own ? 6 : 16 }}>
            <Shimmer />
          </div>
        </div>
      ))}
      <style>{`@keyframes chatSkel { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }`}</style>
    </div>
  );
}

/* 列表行骨架（会话/房间）*/
export function RowSkeleton({ rows = 6 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 4px",
                              borderBottom:`1px solid ${BORDER}` }}>
          <div style={{ width:46, height:46, borderRadius:"50%", background:SKEL, flexShrink:0,
                        position:"relative", overflow:"hidden" }}><Shimmer /></div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ position:"relative", height:12, width:"42%", borderRadius:6, background:SKEL,
                          overflow:"hidden", marginBottom:8 }}><Shimmer /></div>
            <div style={{ position:"relative", height:10, width:"72%", borderRadius:5, background:SKEL,
                          overflow:"hidden" }}><Shimmer /></div>
          </div>
        </div>
      ))}
      <style>{`@keyframes chatSkel { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }`}</style>
    </div>
  );
}
