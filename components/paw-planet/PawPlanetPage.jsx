"use client";

/**
 * components/paw-planet/PawPlanetPage.jsx
 *
 * 「爪爪星球」独立页面模块容器（全屏浮层 + 内部 view 状态机 + 星球专属底部导航）。
 * 由纪念模式「查看纪念页面」进入；只接收已开启 is_memorial_mode 的宠物。
 *
 * view：home（星球首页）/ today / letter / gallery / timeline / story / mailbox / card / me
 * 第一版全 mock（lib/pawPlanetMock）；星球主视觉用 CSS（PlanetHero 预留真实 PNG 替换位）。
 *
 * props: { pet, onBack }  onBack 返回纪念模式选择页。
 */

import { useState, useMemo } from "react";
import { ChevronDown, BookOpen } from "lucide-react";
import { isCatPet } from "@/services/breedAvatar";
import { formatBirthday } from "@/services/petAge";
import BackButton from "@/components/icons/BackButton";
import FloatingStars from "@/components/paw-planet/FloatingStars";
import PlanetHero from "@/components/paw-planet/PlanetHero";
import TodayStoryCard from "@/components/paw-planet/TodayStoryCard";
import PlanetActionCards from "@/components/paw-planet/PlanetActionCards";
import MemoryTimelinePreview from "@/components/paw-planet/MemoryTimelinePreview";
import PlanetMailboxPreview from "@/components/paw-planet/PlanetMailboxPreview";
import PlanetBottomNav from "@/components/paw-planet/PlanetBottomNav";
import TodayView from "@/components/paw-planet/TodayView";
import LetterView from "@/components/paw-planet/LetterView";
import GalleryView from "@/components/paw-planet/GalleryView";
import TimelineView from "@/components/paw-planet/TimelineView";
import StoryView from "@/components/paw-planet/StoryView";
import MailboxView from "@/components/paw-planet/MailboxView";
import MemorialCardView from "@/components/paw-planet/MemorialCardView";
import { PLANET_C as C, buildPlanetMock } from "@/lib/pawPlanetMock";

// 与首页一致：优先 thumb 缩略图（300px 透明小图，秒加载），其次 AI 原图，再次猫狗占位
const avatarOf = (pet) => pet?.pet_avatar_thumb_url || pet?.ai_avatar_url || (isCatPet(pet) ? "/cat.png" : "/dog.png");

export default function PawPlanetPage({ pet, onBack }) {
  const [view, setView] = useState("home");
  const [notice, setNotice] = useState(null);

  const petName = pet?.name || "毛孩子";
  const avatar = avatarOf(pet);
  const mock = useMemo(() => buildPlanetMock(petName), [petName]);
  const enteredAt = pet?.memorial_started_at ? formatBirthday(pet.memorial_started_at) : null;
  const daysTogether = useMemo(() => {
    const d = pet?.created_at || pet?.birthday;
    if (!d) return null;
    const n = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    return n > 0 ? n : null;
  }, [pet?.created_at, pet?.birthday]);

  const toast = (msg) => {
    setNotice(msg);
    if (toast._t) clearTimeout(toast._t);
    toast._t = setTimeout(() => setNotice(null), 2200);
  };

  const navActive = ["today"].includes(view) ? "today"
    : ["letter", "mailbox"].includes(view) ? "letter"
    : ["gallery", "card", "timeline"].includes(view) ? "gallery"
    : view === "me" ? "me" : "home";

  const sub = { petName, avatar, mock, daysTogether, onBack: () => setView("home"), toast, onOpen: setView };

  let body;
  if (view === "today") body = <TodayView {...sub} />;
  else if (view === "letter") body = <LetterView {...sub} />;
  else if (view === "gallery") body = <GalleryView {...sub} />;
  else if (view === "timeline") body = <TimelineView {...sub} />;
  else if (view === "story") body = <StoryView {...sub} />;
  else if (view === "mailbox") body = <MailboxView {...sub} />;
  else if (view === "card") body = <MemorialCardView {...sub} onBack={() => setView("gallery")} />;
  else if (view === "me") body = <MeView petName={petName} avatar={avatar} daysTogether={daysTogether} onLeave={onBack} />;
  else body = (
    /* ════ 星球首页 ════ */
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative",
                  background: "linear-gradient(180deg,#2D3163 0%,#4A4885 42%,#8E84C8 100%)" }}>
      <FloatingStars />
      <div style={{ position: "relative", zIndex: 1, padding: "max(env(safe-area-inset-top), 28px) 16px 4px",
                    display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} bg="rgba(255,255,255,0.9)" />
        <div style={{ flex: 1, fontSize: 17, fontWeight: 900, color: "#fff" }}>爪爪星球 ✨</div>
        <button onClick={() => setView("story")}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 16,
                   background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)",
                   color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          <BookOpen size={14} /> 星球故事
        </button>
      </div>

      <div style={{ position: "relative", zIndex: 1, flex: 1, overflowY: "auto", padding: "6px 16px 24px" }}>
        {/* 大标题 */}
        <div style={{ padding: "4px 2px 0" }}>
          <div style={{ fontSize: 25, fontWeight: 900, color: "#fff", lineHeight: 1.32 }}>
            {petName}已经在<br />爪爪星球住下啦
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 10, lineHeight: 1.7 }}>
            它在这里晒太阳、交朋友，<br />也一直被好好爱着 ♥
          </div>
        </div>

        {/* 星球主视觉 */}
        <PlanetHero petImageUrl={avatar} petName={petName} planetImageUrl="/xingqiu.png" />

        {/* 今天的它 摘要卡 */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
          <TodayStoryCard petName={petName} summary={mock.today.summary} onClick={() => setView("today")} />
        </div>

        {/* 进入日期 */}
        {enteredAt && (
          <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.82)", margin: "14px 0 12px" }}>
            {petName} · {enteredAt} 进入爪爪星球
          </div>
        )}

        {/* 功能入口 */}
        <PlanetActionCards onOpen={setView} />

        {/* 向下提示 */}
        <div style={{ display: "flex", justifyContent: "center", margin: "12px 0 2px" }}>
          <ChevronDown size={22} color="rgba(255,255,255,0.7)" className="pp-bounce" />
        </div>

        <MemoryTimelinePreview timeline={mock.timeline} onMore={() => setView("timeline")} />
        <PlanetMailboxPreview unread={mock.unreadLetters} petName={petName} onClick={() => setView("mailbox")} />
      </div>

      <style>{`.pp-bounce{animation:pp-bounce 1.8s ease-in-out infinite}@keyframes pp-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}`}</style>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 250, background: C.cream, display: "flex", justifyContent: "center" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 430, height: "100%", display: "flex", flexDirection: "column",
                    overflow: "hidden", animation: "pp-in .24s ease-out" }}>
        <div style={{ flex: 1, position: "relative", minHeight: 0, overflow: "hidden" }}>{body}</div>
        <PlanetBottomNav active={navActive} onChange={(k) => setView(k)} />
      </div>
      {notice && (
        <div style={{ position: "fixed", left: "50%", bottom: 88, transform: "translateX(-50%)", zIndex: 270,
                      maxWidth: 300, padding: "10px 18px", borderRadius: 14, fontSize: 13, fontWeight: 600,
                      textAlign: "center", background: C.pri, color: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.22)" }}>
          {notice}
        </div>
      )}
      <style>{`@keyframes pp-in { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }`}</style>
    </div>
  );
}

/* 极简「我的」占位页（星球内 tab） */
function MeView({ petName, avatar, daysTogether, onLeave }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: 14, padding: "0 30px",
                  background: "linear-gradient(180deg,#4A4885,#8E84C8)" }}>
      <img src={avatar} alt={petName}
           style={{ width: 110, height: 110, objectFit: "contain", display: "block",
                    filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.3))" }} />
      <div style={{ fontSize: 19, fontWeight: 900, color: "#fff" }}>{petName}</div>
      {daysTogether != null && (
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.88)" }}>陪伴了你 {daysTogether} 天 · 现在在爪爪星球</div>
      )}
      <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 1.7, marginTop: 4 }}>
        这里以后会有更多和它一起的陪伴功能～
      </div>
      <button onClick={onLeave}
        style={{ marginTop: 10, padding: "12px 28px", borderRadius: 16, cursor: "pointer", border: "none",
                 background: "rgba(255,255,255,0.92)", color: "#5F5A9D", fontSize: 14, fontWeight: 800 }}>
        离开爪爪星球
      </button>
    </div>
  );
}
