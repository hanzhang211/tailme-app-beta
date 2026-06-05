"use client";

/**
 * app/page.jsx — TailMe / 爪爪日记
 *
 * 手机号账号体系 MVP。
 * 状态流：
 *   loading → login（手机号+验证码）→ onboarding（无宠物时）→ app（四 Tab）
 * user_id 持久化在 localStorage，刷新页面自动恢复登录态。
 */

import { useState, useEffect, useRef } from "react";
import {
  getOrCreateUserByPhone,
  getUserById,
  getUserPets,
  savePetProfile,
  getFeedingPlan,
  saveFeedingPlan,
  saveHealthUpload,
  setUsername,
  isUsernameTaken,
  updatePet,
} from "@/services/supabaseService";
import { checkUsername } from "@/services/contentFilter";
import { formatPetAge, formatBirthday, PERSONALITIES, todayISO } from "@/services/petAge";
import MapTab from "@/components/map/MapTab";
import SocialTab from "@/components/social/SocialTab";
import CommunityTab from "@/components/community/CommunityTab";
import { prefetchCommunityFeed } from "@/components/community/PostFeed";
import UserProfile from "@/components/community/UserProfile";
import ProfileTab from "@/components/profile/ProfileTab";
import ExpensePage, { prefetchExpense } from "@/components/home/ExpensePage";
import RecipePage,  { prefetchRecipes } from "@/components/home/RecipePage";
import HealthPage,  { prefetchHealth }  from "@/components/home/HealthPage";
import NewsPage, { NewsCover } from "@/components/home/NewsPage";
import PetChatPage from "@/components/home/PetChatPage";
import AvatarGenerator from "@/components/home/AvatarGenerator";
import PetOnboarding from "@/components/profile/PetOnboarding";
import PetAvatar from "@/components/PetAvatar";
import MapIcon from "@/components/MapIcon";
import ChatIcon from "@/components/ChatIcon";
import { AccountingIcon, RecipeIcon, HealthIcon } from "@/components/icons/HomeModuleIcons";
import BackButton from "@/components/icons/BackButton";
import {
  Sparkles, ChevronRight, PawPrint, Heart, CalendarDays, Scale, Venus, Mars,
  Utensils, Settings, Sun, Moon, MoonStar, CheckCircle, Clock, Calculator, Lightbulb,
} from "lucide-react";
import { DOG_BREEDS, CAT_BREEDS } from "@/services/breedAvatar";
import { getMonthlyTotal } from "@/services/petExpenseService";
import { getTodayRecipe }  from "@/services/petRecipeService";
import { getLatestNews }   from "@/services/petNewsService";
import { listDiseaseRecords, isMedDoneToday } from "@/services/petHealthService";

/* ══════════════════════════════════════════════════════════════
   AI Stub（社群已迁至 components/community/CommunityTab.jsx 真实数据）
══════════════════════════════════════════════════════════════ */
const _delay = (ms) => new Promise((r) => setTimeout(r, ms));
const aiHealthService = {
  analyzeFoodImage:  async () => { await _delay(2200); return AI_RES.food;  },
  analyzePoopImage:  async () => { await _delay(2200); return AI_RES.poop;  },
  analyzeOtherImage: async () => { await _delay(2200); return AI_RES.other; },
};

/* ══════════════════════════════════════════════════════════════
   STATIC DATA（地图/聊天/附近狗狗 UI 数据）
══════════════════════════════════════════════════════════════ */
// 品种列表 (来自 breedAvatar，顶部 import 已加)
// DOG_BREEDS / CAT_BREEDS 在 import 区引入后此处仅作注释占位

const feedAmt = (w) => {
  const n = parseFloat(w) || 5;
  if (n < 3)  return "50–70g / 次";
  if (n < 5)  return "70–90g / 次";
  if (n < 10) return "100–140g / 次";
  if (n < 20) return "180–250g / 次";
  if (n < 30) return "300–380g / 次";
  return "400–550g / 次";
};

const FEED_LABELS    = ["第一次喂食", "第二次喂食", "第三次喂食"];
const FEED_ICONS     = ["🌅", "🌆", "🌙"];
const FEED_UNITS     = ["g", "勺", "杯", "罐", "袋"];
const DEFAULT_FEEDING = { time:"08:00", amount:"", unit:"g", note:"" };

const formatFeedingTime = (timeStr) => {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  const h  = parseInt(parts[0], 10);
  const m  = parseInt(parts[1] || "0", 10);
  const mm = String(m).padStart(2, "0");
  if (h === 0)  return `凌晨 12:${mm}`;
  if (h < 6)   return `凌晨 ${h}:${mm}`;
  if (h < 12)  return `早上 ${h}:${mm}`;
  if (h === 12) return `下午 12:${mm}`;
  if (h < 18)  return `下午 ${h - 12}:${mm}`;
  return `晚上 ${h - 12}:${mm}`;
};

const isHungry = (bt, dt) => {
  const now = new Date(), m = now.getHours() * 60 + now.getMinutes();
  const [bh, bm] = bt.split(":").map(Number);
  const [dh, dm] = dt.split(":").map(Number);
  return (m > bh * 60 + bm + 180 && m < dh * 60 + dm - 120) || m > dh * 60 + dm + 180;
};

const AI_RES = {
  food:  { score:85, risk:"低", rc:"#4CAF50", txt:"食物搭配营养均衡，蛋白质含量适中。建议继续保持当前饮食，可适量补充益生菌。" },
  poop:  { score:78, risk:"低", rc:"#4CAF50", txt:"排泄物颜色和形态正常，水分含量适中。肠胃健康状况良好，继续日常观察即可。" },
  other: { score:65, risk:"中", rc:"#FA8C16", txt:"发现少量异常分泌物，可能与轻微炎症或过敏有关。建议近期关注症状，如持续出现请就医。" },
};

/* ══════════════════════════════════════════════════════════════
   THEME
══════════════════════════════════════════════════════════════ */
const C = {
  pri:"#E68645",      // 橙色强调 / 按钮 / 选中态 / CTA
  grad:"#E68645",
  accent:"#E68645",   // 同强调色（用于小图标、选中文字等）
  tint:"#F2E5DA",     // 浅粉米色 / 装饰背景 / 选中底
  bg:"#EEE9E1",       // 米白主背景
  card:"#FFFFFF",
  text:"#1A1006",
  sub:"#8A8074",      // 暖灰文字
  light:"#D6D5D8",    // 浅灰紫 / 辅助填充
  border:"#D6D5D8",
};
// 宠物聊天气泡随机文案池（营造不同宠物主动陪伴的氛围）
const CHAT_BUBBLE_PHRASES = [
  "点我聊聊～",
  "我在等你呀 🐾",
  "今天开心吗？💛",
  "我有点想你 ✨",
  "来找我玩吧 🐾",
  "陪陪我嘛 🥺",
  "我来陪你啦 ✨",
  "要不要聊聊天？",
  "今天过得怎么样？",
  "我想和你说话 💛",
  "快来摸摸我 🐾",
  "想听你说说今天 ✨",
];
const cardStyle = { background:C.card, borderRadius:20, padding:16, marginBottom:12, boxShadow:"0 2px 14px rgba(0,0,0,0.05)" };
const btnStyle  = (active) => ({
  background: active ? C.pri : "#FFFFFF", color: active ? "#fff" : "#1A1006",
  border:`2px solid ${active ? C.pri : "#000000"}`, borderRadius:16,
  padding:"10px 0", fontSize:13, fontWeight:600, cursor:"pointer", flex:1, transition:"all .2s",
});

/* ══════════════════════════════════════════════════════════════
   BRAND LOGO（内联 SVG，爪印 + 轨道环）
══════════════════════════════════════════════════════════════ */
function Logo({ size = 52 }) {
  return (
    <img src="/logo.png" alt="爪爪日记"
         style={{ display:"block", width:size, height:"auto" }} />
  );
}

// 装饰用纯爪印（无轨道），可控颜色

function PawIcon({ size = 16, color = "#E68645" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}
         xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
         style={{ display:"inline-block", verticalAlign:"middle" }}>
      <ellipse cx="6" cy="8" rx="2" ry="2.6" />
      <ellipse cx="10.5" cy="5" rx="2.2" ry="3" />
      <ellipse cx="14.5" cy="5" rx="2.2" ry="3" />
      <ellipse cx="19" cy="8" rx="2" ry="2.6" />
      <path d="M 7 14 Q 5 18, 8 21 Q 12.5 23, 17 21 Q 20 18, 18 14 Q 16 11.5, 12.5 11.5 Q 9 11.5, 7 14 Z" />
    </svg>
  );
}

function ProfileIcon({ size = 20, color = "#E68645" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}
         xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
         style={{ display:"inline-block", verticalAlign:"middle" }}>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8H4z" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════
   SHARED WIDGETS
══════════════════════════════════════════════════════════════ */
const Label = ({ children, style }) => (
  <div style={{ fontSize:12, fontWeight:600, color:"#3B4252", marginBottom:8, ...style }}>{children}</div>
);
const Inp = (props) => (
  <input {...props} style={{ width:"100%", borderRadius:16, padding:"12px 14px", fontSize:14,
    border:"1.5px solid #7A6F62", background:"#FFFFFF", color:C.text, outline:"none",
    boxSizing:"border-box", ...props.style }} />
);
const ErrBox = ({ msg }) =>
  msg ? (
    <div style={{ marginTop:10, padding:"10px 14px", background:"#FFF0F0", borderRadius:14,
                  fontSize:12, color:"#D94040", lineHeight:1.5 }}>
      ❌ {msg}
    </div>
  ) : null;

/* ══════════════════════════════════════════════════════════════
   LOADING SCREEN
══════════════════════════════════════════════════════════════ */
function LoadingScreen() {
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", background:"#EEE9E1" }}>
      <div style={{ marginBottom:20, animation:"float 3s ease-in-out infinite" }}><Logo size={96} /></div>
      <div style={{ fontSize:24, fontWeight:800, color:C.text }}>爪爪日记</div>
      <div style={{ fontSize:13, color:"#8A8074", marginTop:8 }}>正在加载...</div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PHONE LOGIN
   MVP 测试验证码：123456
   正式上线接阿里云短信 SDK：
     POST https://dysmsapi.aliyuncs.com → SendSms
     在 Next.js API Route /api/send-sms 中调用，避免前端暴露 AK
══════════════════════════════════════════════════════════════ */
function PhoneLogin({ onLogin }) {
  const [step, setStep]       = useState(1); // 1=输入手机号, 2=输入验证码
  const [phone, setPhone]     = useState("");
  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const isValidPhone = /^1[3-9]\d{9}$/.test(phone.trim());

  const handleSendCode = () => {
    if (!isValidPhone) { setError("请输入正确的11位中国大陆手机号"); return; }
    setError(null);
    // MVP：不实际发送短信，直接进入验证码输入
    // 正式上线：fetch("/api/send-sms", { method:"POST", body: JSON.stringify({ phone }) })
    setStep(2);
  };

  const handleVerify = async () => {
    if (code.trim() !== "123456") {
      setError("验证码错误（MVP 固定测试码：123456）");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await getOrCreateUserByPhone(phone.trim());
      onLogin(user.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // PhoneLogin 本地白底冷调
  const P_SURFACE = "#F2E5DA";   // 浅粉米色 / 禁用按钮 / 区号块
  const P_BORDER  = "#000000";   // 黑色边框
  const P_SUB     = "#8A8074";   // 暖灰文字

  return (
    <div style={{ height:"100%", background:"#EEE9E1",
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 28px" }}>
      <div style={{ marginBottom:12 }}><Logo size={96} /></div>
      <div style={{ fontSize:26, fontWeight:800, color:C.text, marginBottom:4 }}>爪爪日记</div>
      <div style={{ fontSize:12, color:P_SUB, marginBottom:36 }}>TailMe · 让陪伴更懂你</div>

      <div style={{ width:"100%", background:"white", border:"1.5px solid #7A6F62",
                    borderRadius:28, padding:"28px 24px",
                    boxShadow:"0 6px 18px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.12)" }}>
        {step === 1 ? (
          <>
            <div style={{ fontSize:18, fontWeight:700, color:C.text, marginBottom:4 }}>手机号登录</div>
            <div style={{ fontSize:12, color:P_SUB, marginBottom:22 }}>
              新用户自动注册，老用户直接进入
            </div>
            <Label>手机号</Label>
            <div style={{ display:"flex", gap:10, marginBottom:4 }}>
              <div style={{ background:"#FFFFFF", borderRadius:16, padding:"12px 14px", fontSize:14,
                            color:C.text, border:"1.5px solid #7A6F62", whiteSpace:"nowrap", fontWeight:600 }}>
                +86
              </div>
              <Inp
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                type="tel"
                maxLength={11}
                placeholder="请输入手机号"
              />
            </div>
            <ErrBox msg={error} />
            <button
              onClick={handleSendCode}
              style={{ marginTop:18, width:"100%", padding:"14px 0", borderRadius:20, fontSize:14,
                       fontWeight:700, background:isValidPhone ? "#E68645" : P_SURFACE,
                       color:isValidPhone ? "white" : P_SUB,
                       border:isValidPhone ? "none" : `1px solid ${P_BORDER}`,
                       cursor:isValidPhone ? "pointer" : "default", transition:"all .2s" }}>
              获取验证码
            </button>
          </>
        ) : (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <button onClick={() => { setStep(1); setCode(""); setError(null); }}
                style={{ background:"transparent", border:"none", fontSize:18, cursor:"pointer", color:P_SUB }}>
                ←
              </button>
              <div style={{ fontSize:18, fontWeight:700, color:C.text }}>输入验证码</div>
            </div>
            <div style={{ fontSize:12, color:P_SUB, marginBottom:22 }}>
              已发送至 +86 {phone}
              <span style={{ marginLeft:8, color:C.accent, fontWeight:600, fontSize:11 }}>
                [MVP 测试码: 123456]
              </span>
            </div>
            <Label>验证码</Label>
            <Inp
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              type="number"
              maxLength={6}
              placeholder="请输入6位验证码"
              style={{ letterSpacing:6, fontSize:20, textAlign:"center" }}
            />
            <ErrBox msg={error} />
            <button
              onClick={handleVerify}
              disabled={loading || code.length < 6}
              style={{ marginTop:18, width:"100%", padding:"14px 0", borderRadius:20, fontSize:14,
                       fontWeight:700, background:!loading && code.length >= 6 ? "#E68645" : P_SURFACE,
                       color:!loading && code.length >= 6 ? "white" : P_SUB,
                       border:!loading && code.length >= 6 ? "none" : `1px solid ${P_BORDER}`,
                       cursor:!loading && code.length >= 6 ? "pointer" : "default",
                       transition:"all .2s" }}>
              {loading ? "验证中..." : "登录 / 注册"}
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop:20, fontSize:11, color:P_SUB, textAlign:"center", lineHeight:1.7 }}>
        登录即代表同意《用户协议》和《隐私政策》
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   USERNAME SETUP
   宠物档案创建后、进入 App 前的步骤；老用户没 username 也会被拉进来
══════════════════════════════════════════════════════════════ */
function UsernameSetup({ userId, onComplete }) {
  const [name, setName]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  const handleSubmit = async () => {
    setError(null);
    const check = checkUsername(name);
    if (!check.ok) { setError(check.reason); return; }
    setSaving(true);
    try {
      // 先查重（友好提示）
      const taken = await isUsernameTaken(name.trim());
      if (taken) {
        setError("该用户名已被占用，请换一个");
        return;
      }
      const updated = await setUsername(userId, name.trim());
      onComplete(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ height:"100%", background:"#EEE9E1",
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 28px" }}>
      <div style={{ marginBottom:14 }}><Logo size={72} /></div>
      <div style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:4 }}>设置用户名</div>
      <div style={{ fontSize:12, color:"#8A8074", marginBottom:28, textAlign:"center", lineHeight:1.6 }}>
        用户名是你在社群里的唯一身份<br/>2–20 个字符 · 不能重复 · 不能包含敏感词
      </div>

      <div style={{ width:"100%", background:"white", border:"1.5px solid #7A6F62",
                    borderRadius:28, padding:"24px 22px",
                    boxShadow:"0 6px 18px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.12)" }}>
        <Label>用户名</Label>
        <Inp
          value={name}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && !saving && handleSubmit()}
          maxLength={20}
          placeholder="比如：小明_豆豆爸"
        />
        <ErrBox msg={error} />
        <button
          onClick={handleSubmit}
          disabled={saving || name.trim().length < 2}
          style={{ marginTop:18, width:"100%", padding:"14px 0", borderRadius:20, fontSize:14,
                   fontWeight:700,
                   background: !saving && name.trim().length >= 2 ? C.pri : "#F2E5DA",
                   color:      !saving && name.trim().length >= 2 ? "white" : "#8A8074",
                   border:     !saving && name.trim().length >= 2 ? "none" : "1px solid #D6D5D8",
                   cursor:     !saving && name.trim().length >= 2 ? "pointer" : "default",
                   transition:"all .2s" }}>
          {saving ? "保存中..." : "进入爪爪日记 →"}
        </button>
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HOME TAB
══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   PET PROFILE COMPLETE MODAL
   老用户没填生日/性格时弹出，温柔提示，可关闭（session 内不再弹）
══════════════════════════════════════════════════════════════ */
function PetProfileComplete({ pet, onClose, onSaved }) {
  const [birthday, setBirthday]       = useState(pet?.birthday || "");
  const [personality, setPersonality] = useState(pet?.personality || "");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState(null);

  const canSave = birthday && personality && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true); setError(null);
    try {
      const updated = await updatePet(pet.id, { birthday, personality });
      onSaved?.(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={(e) => e.target === e.currentTarget && !saving && onClose?.()}
      style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.45)",
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:"#EEE9E1",
                    borderRadius:"22px 22px 0 0", padding:"22px 20px 28px",
                    animation:"compose-up .25s ease-out" }}>
        <div style={{ fontSize:18, fontWeight:800, color:"#1A1006", marginBottom:4 }}>
          帮我记住 {pet?.name || "毛孩子"} 的生日吧 🐾
        </div>
        <div style={{ fontSize:12, color:"#8A8074", marginBottom:18, lineHeight:1.6 }}>
          完善一下小档案，让主页更懂 TA
        </div>

        <Label>毛孩子的生日 🎂</Label>
        <Inp value={birthday} onChange={(e) => setBirthday(e.target.value)}
             type="date" max={todayISO()} />
        <div style={{ fontSize:11, color:"#8A8074", marginTop:6, lineHeight:1.6 }}>
          不知道准确生日也没关系，挑一个属于你们的纪念日就好 💛
        </div>

        <Label style={{ marginTop:18 }}>选一个最像 TA 的小性格 ✨</Label>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {PERSONALITIES.map((p) => {
            const on = personality === p;
            return (
              <button key={p} onClick={() => setPersonality(p)}
                style={{ padding:"10px 8px", borderRadius:14, fontSize:12,
                         fontWeight: on ? 700 : 600,
                         background: on ? "#E68645" : "#FFFFFF",
                         color: on ? "white" : "#1A1006",
                         border:`1.5px solid ${on ? "#E68645" : "#7A6F62"}`,
                         cursor:"pointer", transition:"all .15s" }}>
                {p}
              </button>
            );
          })}
        </div>

        <ErrBox msg={error} />

        <div style={{ display:"flex", gap:10, marginTop:18 }}>
          <button onClick={onClose} disabled={saving}
            style={{ flex:1, padding:"13px 0", borderRadius:14, fontSize:13, fontWeight:600,
                     background:"transparent", color:"#8A8074",
                     border:"1px solid #D6D5D8",
                     cursor: saving ? "default" : "pointer" }}>
            稍后再说
          </button>
          <button onClick={handleSave} disabled={!canSave}
            style={{ flex:2, padding:"13px 0", borderRadius:14, fontSize:13, fontWeight:700,
                     background: canSave ? "#E68645" : "#F2E5DA",
                     color: canSave ? "white" : "#8A8074",
                     border:"none",
                     cursor: canSave ? "pointer" : "default" }}>
            {saving ? "保存中..." : "保存 ✨"}
          </button>
        </div>
      </div>
      <style>{`@keyframes compose-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

function HomeTab({ user, pet, pets = [], onPetUpdate, onSwitchPet }) {
  // 子页面：null | 'expenses' | 'recipes' | 'health' | 'news'
  const [subPage, setSubPage] = useState(null);
  const [monthExpense, setMonthExpense] = useState(null);
  const [todayRecipe,  setTodayRecipe]  = useState(null);
  const [latestNews,   setLatestNews]   = useState(null);
  const [avatarOpen,       setAvatarOpen]   = useState(false);
  const [avatarBroken,     setAvatarBroken] = useState(false);
  const [avatarLoaded,     setAvatarLoaded] = useState(false);
  const [cachedAvatar,     setCachedAvatar] = useState(null); // 该宠物上次成功显示的头像（localStorage 占位）
  const avatarImgRef = useRef(null);
  // 优先用 thumb（300 WebP 小图，加载快）；rembg 抠图后 thumb 也是透明的
  // URL 含时间戳，每次生成都不同，天然绕开缓存
  const avatarSrc = pet.pet_avatar_thumb_url || pet.ai_avatar_url || null;
  const avatarCacheKey = pet?.id ? `tailme_pet_avatar_cache_${pet.id}` : null;

  // 切换宠物 / 换头像：重置加载态，并读出该宠物上次缓存的头像作为占位（避免空白）
  useEffect(() => {
    setAvatarBroken(false);
    setAvatarLoaded(false);
    if (!avatarCacheKey) { setCachedAvatar(null); return; }
    try { setCachedAvatar(localStorage.getItem(avatarCacheKey) || null); } catch { setCachedAvatar(null); }
  }, [pet?.id, avatarSrc, avatarCacheKey]);

  // 命中浏览器缓存的图片，onLoad 可能在 React 绑定前就触发 → 用 complete 兜底，避免一直空白需刷新
  useEffect(() => {
    const img = avatarImgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setAvatarLoaded(true);
  }, [avatarSrc]);

  // 聊天气泡文案：首次打开随机一条，切换宠物时重新随机（尽量避开上一条），同一次浏览保持不变
  const lastBubbleIdx = useRef(-1);
  const [bubbleText, setBubbleText] = useState(CHAT_BUBBLE_PHRASES[0]);
  useEffect(() => {
    let idx = Math.floor(Math.random() * CHAT_BUBBLE_PHRASES.length);
    if (CHAT_BUBBLE_PHRASES.length > 1 && idx === lastBubbleIdx.current) {
      idx = (idx + 1) % CHAT_BUBBLE_PHRASES.length;
    }
    lastBubbleIdx.current = idx;
    setBubbleText(CHAT_BUBBLE_PHRASES[idx]);
  }, [pet?.id]);

  // 多宠物 carousel —— 循环轮播（环形）
  const petCount     = pets.length;
  const rawIdx       = pets.findIndex((p) => p.id === pet?.id);
  const petIdx       = rawIdx < 0 ? 0 : rawIdx;
  const showCarousel = petCount > 1;
  // 环形上一只 / 下一只（即使在首/尾也回绕）
  const prevPet = showCarousel ? pets[(petIdx - 1 + petCount) % petCount] : null;
  const nextPet = showCarousel ? pets[(petIdx + 1) % petCount] : null;

  // 预加载当前 + 相邻宠物头像，切换/打开时不闪白
  useEffect(() => {
    const urls = [
      avatarSrc,
      prevPet?.pet_avatar_thumb_url || prevPet?.ai_avatar_url,
      nextPet?.pet_avatar_thumb_url || nextPet?.ai_avatar_url,
    ].filter(Boolean);
    urls.forEach((u) => { const im = new Image(); im.src = u; });
  }, [avatarSrc, prevPet?.id, nextPet?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Swipe 手势（循环，无边界，无 rubber-band）
  const touchStartX = useRef(null);
  const [dragX, setDragX] = useState(0);
  const onTouchStart = (e) => {
    if (!showCarousel) return;
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e) => {
    if (touchStartX.current === null || !showCarousel) return;
    setDragX(e.touches[0].clientX - touchStartX.current);
  };
  const onTouchEnd = () => {
    if (touchStartX.current === null) return;
    const THRESHOLD = 40;
    if (dragX <= -THRESHOLD && nextPet) onSwitchPet?.(nextPet);       // 左滑 → 下一只
    else if (dragX >= THRESHOLD && prevPet) onSwitchPet?.(prevPet);   // 右滑 → 上一只
    setDragX(0);
    touchStartX.current = null;
  };

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    getMonthlyTotal(user.id).then((v) => { if (alive) setMonthExpense(v); }).catch(() => {});
    getTodayRecipe().then((r) => { if (alive) setTodayRecipe(r); }).catch(() => {});
    getLatestNews().then((n) => { if (alive) setLatestNews(n); }).catch(() => {});
    // 后台预取记账/食谱/健康全量数据，点进子页时秒开有内容
    prefetchExpense(user.id);
    prefetchRecipes();
    if (pet?.id) prefetchHealth(pet.id, user.id);
    return () => { alive = false; };
  }, [user?.id, subPage]);   // 从子页面返回时刷新
  // 年龄显示：优先用 birthday 计算（整数岁/月/日）；老数据回退到 pet.age
  const ageLabel      = formatPetAge(pet.birthday) || (pet.age != null ? `${pet.age}岁` : "未设置");
  const birthdayLabel = formatBirthday(pet.birthday);

  // 老用户缺生日 → 弹出补全 modal（用户可一次性 dismiss，session 内不再弹）
  const [completeOpen, setCompleteOpen] = useState(false);
  const [dismissed, setDismissed]       = useState(false);
  useEffect(() => {
    if (!pet?.birthday && !dismissed) setCompleteOpen(true);
  }, [pet?.birthday, dismissed]);

  const [feedings, setFeedings]   = useState([{ ...DEFAULT_FEEDING }]);
  const [editFeed, setEdit]       = useState(false);
  const [expandedMeal, setExpandedMeal] = useState(null); // 喂食详情页展开的 index
  const [feedLoading, setFeedLoading]     = useState(false);
  const [hasFeedRecord, setHasFeedRecord] = useState(false);

  // 每日喂食完成状态（localStorage，key 含日期+pet.id，第二天自动重置）
  const today = new Date().toISOString().slice(0, 10);
  const feedDoneKey = `tailme_feed_done_${today}_${pet?.id || ""}`;
  const [doneMeals, setDoneMeals] = useState(() => {
    try { const s = localStorage.getItem(feedDoneKey); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  // pet 切换时重新读取对应记录
  useEffect(() => {
    try { const s = localStorage.getItem(feedDoneKey); setDoneMeals(s ? JSON.parse(s) : {}); } catch { setDoneMeals({}); }
  }, [pet?.id, today]); // eslint-disable-line
  const toggleMealDone = (i) => {
    const next = { ...doneMeals, [i]: !doneMeals[i] };
    setDoneMeals(next);
    try { localStorage.setItem(feedDoneKey, JSON.stringify(next)); } catch {}
  };
  const [uplType, setUpl]   = useState(null);
  const [loading, setLoad]  = useState(false);
  const [result, setResult] = useState(null);
  const [feedError, setFeedError]     = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // 切换宠物时重新加载该宠物的喂食计划
  useEffect(() => {
    if (!pet?.id) return;
    let alive = true;
    setFeedLoading(true);
    setEdit(false);
    setFeedError(null);
    getFeedingPlan(pet.id)
      .then((rows) => {
        if (!alive) return;
        if (rows.length > 0) {
          setFeedings(rows.map((r) => ({
            time:   (r.scheduled_time || "08:00:00").slice(0, 5),
            amount: r.amount != null ? String(r.amount) : "",
            unit:   r.unit  || "g",
            note:   r.note  || "",
          })));
          setHasFeedRecord(true);
        } else {
          setFeedings([{ ...DEFAULT_FEEDING }]);
          setHasFeedRecord(false);
        }
      })
      .catch(() => { if (alive) setHasFeedRecord(false); })
      .finally(() => { if (alive) setFeedLoading(false); });
    return () => { alive = false; };
  }, [pet?.id]);

  // 每分钟 tick 一次，让基于时间的饿了提醒能随时间自动更新（无需手动刷新）
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  // 饿了提醒：绑定【当前 activePet】的喂食时间 + 完成状态（doneMeals，localStorage 每日重置、按宠物隔离）
  //   - "soon"   距某顿未完成喂食 ≤30 分钟  → 我快饿啦
  //   - "hungry" 已过某顿喂食时间且未完成    → 我有点饿啦
  //   - 该顿被标记「已完成」后立即不再提醒（doneMeals 变化触发重算）
  const feedReminder = (() => {
    if (!hasFeedRecord || !feedings.length) return null;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const meals = feedings.map((f, i) => {
      const [h, m] = (f.time || "").split(":").map(Number);
      return { min: (h || 0) * 60 + (m || 0), done: !!doneMeals[i] };
    });
    // 1) 已过点且未完成 → 饿了（取过去时间里离现在最近的一顿）
    const overdue = meals.filter((x) => !x.done && x.min <= nowMin)
                         .sort((a, b) => b.min - a.min)[0];
    if (overdue) return "hungry";
    // 2) 30 分钟内即将到点且未完成 → 快饿了
    const soon = meals.filter((x) => !x.done && x.min > nowMin && x.min - nowMin <= 30)
                      .sort((a, b) => a.min - b.min)[0];
    if (soon) return "soon";
    return null;
  })();

  // ── 健康联动：加载【当前 activePet】的生病记录（按 pet_id 过滤，宠物间独立）──
  // healthRefresh 在离开健康页时 +1，确保康复/新增/用药改动后首页提醒立即重算
  const [diseases, setDiseases] = useState([]);
  const [healthRefresh, setHealthRefresh] = useState(0);
  useEffect(() => {
    if (!pet?.id) { setDiseases([]); return; }
    let alive = true;
    listDiseaseRecords(pet.id)
      .then((rows) => { if (alive) setDiseases(rows || []); })
      .catch(() => { if (alive) setDiseases([]); });
    return () => { alive = false; };
  }, [pet?.id, healthRefresh]);

  // 当前是否生病中：存在任一 status !== "recovered" 的疾病记录
  const activeDisease = diseases.find((d) => d.status !== "recovered") || null;
  const sick = !!activeDisease;

  // 用药提醒（仅生病中）：依据 activeDisease 的 medicine_reminder_time + 今日是否已用药
  //   - "soon"    距用药时间 ≤30 分钟      → 快到用药时间啦
  //   - "overdue" 已过用药时间且今日未完成 → 该吃药啦
  //   - 今日已用药 / 用药周期外 / 未设提醒 → null
  const medReminder = (() => {
    if (!sick) return null;
    const d = activeDisease;
    if (!d.medicine_reminder_enabled || !d.medicine_reminder_time) return null;
    if (d.medicine_start_date && today < d.medicine_start_date) return null;
    if (d.medicine_end_date   && today > d.medicine_end_date)   return null;
    if (isMedDoneToday(d.id)) return null;
    const [h, m] = String(d.medicine_reminder_time).split(":").map(Number);
    const medMin = (h || 0) * 60 + (m || 0);
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    if (medMin <= nowMin) return "overdue";
    if (medMin - nowMin <= 30) return "soon";
    return null;
  })();

  const addFeed    = () => { setFeedings(p => [...p, { ...DEFAULT_FEEDING, time:"18:00" }]); };
  const removeFeed = (i) => setFeedings(p => p.filter((_, idx) => idx !== i));
  const updFeed    = (i, k, v) => setFeedings(p => p.map((f, idx) => idx === i ? { ...f, [k]: v } : f));

  const handleSaveFeed = async () => {
    if (editFeed) {
      try {
        await saveFeedingPlan(pet.id, feedings);
        setHasFeedRecord(true);
        setFeedError(null);
      } catch (err) {
        setFeedError(err.message);
        return;
      }
    }
    setEdit((v) => !v);
  };

  const handleUpload = async (type) => {
    setUpl(type); setResult(null); setLoad(true); setUploadError(null);
    try {
      const analyze = type === "food"
        ? aiHealthService.analyzeFoodImage
        : type === "poop"
          ? aiHealthService.analyzePoopImage
          : aiHealthService.analyzeOtherImage;
      const res = await analyze("pending_upload", pet);
      await saveHealthUpload({ pet_id: pet.id, type, score: res.score, risk_level: res.risk, analysis: res.txt });
      setResult(res);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setLoad(false);
    }
  };

  // HomeTab 本地白底科技风配色（仅作用于本 Tab，保留橙色作为点缀）
  const H_BG       = "#EEE9E1";  // 米白主背景
  const H_SURFACE  = "#F2E5DA";  // 浅粉米色 / 信息块填充
  const H_BORDER   = "#D6D5D8";  // 浅灰紫描边
  const H_SHADOW   = "0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04)";  // 轻柔阴影
  const H_SUB      = "#8A8074";  // 次级暖灰文字

  if (subPage === "feeding") {
    // ── 喂食计划详情页：折叠卡片 + 手风琴编辑 ──
    const mealIconCfgFP = (t) => {
      const h = t ? parseInt(t.split(":")[0], 10) : 8;
      if (h >= 5  && h < 12) return { Icon:Sun,      grad:"linear-gradient(135deg,#FFE6A8,#F4A64E)", ic:"white" };
      if (h >= 12 && h < 18) return { Icon:Sun,      grad:"linear-gradient(135deg,#FFD6A5,#E88A35)", ic:"white" };
      if (h >= 18 && h < 24) return { Icon:Moon,     grad:"linear-gradient(135deg,#F9B087,#8B4C7A)", ic:"white" };
      return                         { Icon:MoonStar, grad:"linear-gradient(135deg,#22375C,#687AAE)", ic:"#FFE6A8" };
    };
    const SUGGEST_FP = ["06:00–10:00","12:00–15:00","16:00–21:00"];
    const FoodBowlFP = () => (
      <svg width="64" height="50" viewBox="0 0 90 70" fill="none" style={{ flexShrink:0 }}>
        <ellipse cx="45" cy="20" rx="32" ry="12" fill="#E6A348" opacity="0.45"/>
        <path d="M18 24H72L64 58H26L18 24Z" fill="#F4ECD9" stroke="#A86E3D" strokeWidth="3"/>
        <circle cx="35" cy="40" r="3" fill="#A86E3D"/><circle cx="45" cy="37" r="3" fill="#A86E3D"/><circle cx="55" cy="40" r="3" fill="#A86E3D"/>
        <circle cx="35" cy="16" r="4" fill="#E68645" opacity="0.5"/>
        <circle cx="55" cy="14" r="3" fill="#E68645" opacity="0.4"/>
      </svg>
    );

    const doSaveAndBack = async () => {
      try {
        await saveFeedingPlan(pet.id, feedings);
        setHasFeedRecord(true);
        setFeedError(null);
        setExpandedMeal(null);
        setSubPage(null);
      } catch (e) { setFeedError(e.message); }
    };

    const toggleExpand = (i) => setExpandedMeal(prev => prev === i ? null : i);

    const iStyle = {
      width:"100%", borderRadius:12, padding:"11px 14px", fontSize:15,
      border:"1px solid rgba(230,134,69,0.22)", background:"white",
      boxSizing:"border-box", color:"#111", outline:"none", fontFamily:"inherit",
    };

    return (
      <div style={{ height:"100%", overflowY:"auto", background:H_BG }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"52px 16px 10px", background:H_BG }}>
          <BackButton onClick={() => setSubPage(null)} />
          <span style={{ fontSize:17, fontWeight:800, color:C.text }}>喂食计划</span>
          <button onClick={doSaveAndBack}
            style={{ height:36, padding:"0 18px", borderRadius:999, cursor:"pointer",
                     fontWeight:700, border:`1.5px solid ${C.pri}`,
                     background:"rgba(255,255,255,0.55)", color:C.pri, fontSize:14 }}>
            完成
          </button>
        </div>

        {/* 副标题 */}
        <div style={{ display:"flex", alignItems:"center", gap:7, padding:"4px 20px 14px" }}>
          <Utensils size={14} color={H_SUB} strokeWidth={1.8}/>
          <span style={{ fontSize:13, color:H_SUB }}>科学喂养，健康成长每一天</span>
        </div>

        <div style={{ padding:"0 14px 90px", display:"flex", flexDirection:"column", gap:12 }}>

          {/* ── 折叠手风琴卡片 ── */}
          {feedings.map((f, i) => {
            const cfg = mealIconCfgFP(f.time);
            const MIcon = cfg.Icon;
            const open = expandedMeal === i;
            return (
              <div key={i} style={{ background:"white", borderRadius:22,
                                    boxShadow:"0 4px 16px rgba(0,0,0,0.06)",
                                    border:"1px solid rgba(230,134,69,0.12)",
                                    overflow:"hidden" }}>
                {/* 折叠头 */}
                <div style={{ display:"flex", alignItems:"center", padding:"14px 16px", gap:14 }}>
                  {/* 点击主区域展开/折叠 */}
                  <button onClick={() => toggleExpand(i)}
                    style={{ display:"flex", alignItems:"center", gap:14, flex:1,
                             background:"transparent", border:"none", cursor:"pointer", textAlign:"left",
                             padding:0, minWidth:0 }}>
                    <div style={{ width:54, height:54, borderRadius:16, flexShrink:0, background:cfg.grad,
                                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <MIcon size={26} color={cfg.ic} strokeWidth={1.8}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, color:"#8A7B6A", fontWeight:700, marginBottom:3 }}>
                        {FEED_LABELS[i]}
                      </div>
                      <div style={{ fontSize:20, fontWeight:800, color:"#111", lineHeight:1.1 }}>
                        {formatFeedingTime(f.time)}
                        {f.amount && (
                          <span style={{ fontSize:14, fontWeight:800, color:C.pri, marginLeft:8 }}>
                            {f.amount} {f.unit}
                          </span>
                        )}
                      </div>
                      {!open && <div style={{ fontSize:11, color:"#8A7B6A", marginTop:3 }}>
                        建议：{SUGGEST_FP[i] || SUGGEST_FP[0]}
                      </div>}
                    </div>
                  </button>
                  {/* 状态切换按钮（独立，不触发展开） */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                    <button onClick={() => toggleMealDone(i)}
                      style={{ display:"flex", alignItems:"center", gap:4, height:30, padding:"0 10px",
                               borderRadius:999, border:"none", cursor:"pointer", fontSize:12, fontWeight:800,
                               transition:"all .2s",
                               background: doneMeals[i] ? "rgba(95,167,102,0.14)" : "rgba(230,134,69,0.12)",
                               color: doneMeals[i] ? "#5FA766" : "#E68645" }}>
                      {doneMeals[i]
                        ? <CheckCircle size={12} strokeWidth={2.2}/>
                        : <Clock size={12} strokeWidth={2.2}/>}
                      {doneMeals[i] ? "已完成" : "待喂食"}
                    </button>
                    <ChevronRight size={18} color="#C5B9B0" strokeWidth={2}
                      onClick={() => toggleExpand(i)}
                      style={{ transform: open ? "rotate(90deg)" : "none", transition:"transform .2s", cursor:"pointer" }}/>
                  </div>
                </div>

                {/* 展开编辑区 */}
                {open && (
                  <div style={{ padding:"0 16px 18px", display:"flex", flexDirection:"column", gap:14,
                                borderTop:"1px solid rgba(230,134,69,0.12)" }}>
                    <div style={{ paddingTop:14 }}>
                      <div style={{ fontSize:13, color:"#8A7B6A", fontWeight:600, marginBottom:7 }}>喂食时间</div>
                      <div style={{ position:"relative" }}>
                        <input type="time" value={f.time} onChange={(e) => updFeed(i,"time",e.target.value)}
                          style={{ ...iStyle, paddingRight:40 }}/>
                        <Clock size={16} color="#C5B9B0" strokeWidth={1.8}
                          style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}/>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize:13, color:"#8A7B6A", fontWeight:600, marginBottom:7 }}>喂食量</div>
                      <div style={{ display:"flex", gap:10 }}>
                        <input type="number" min="0" step="0.5" value={f.amount}
                          onChange={(e) => updFeed(i,"amount",e.target.value)} placeholder="例如：2"
                          style={{ ...iStyle, flex:2 }}/>
                        <select value={f.unit} onChange={(e) => updFeed(i,"unit",e.target.value)}
                          style={{ ...iStyle, flex:1 }}>
                          {FEED_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize:13, color:"#8A7B6A", fontWeight:600, marginBottom:7 }}>备注（可选）</div>
                      <input value={f.note} onChange={(e) => updFeed(i,"note",e.target.value)}
                        placeholder="例如：半罐猫粮" style={iStyle}/>
                    </div>
                    <button onClick={() => { removeFeed(i); setExpandedMeal(null); }}
                      disabled={feedings.length <= 1}
                      style={{ display:"flex", alignItems:"center", gap:6, background:"transparent",
                               border:"none", cursor: feedings.length > 1 ? "pointer" : "default",
                               color: feedings.length > 1 ? "#D94040" : "#C5B9B0",
                               fontSize:14, fontWeight:600, padding:"4px 0" }}>
                      🗑 删除这一项
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* 添加喂食（最多 10 次） */}
          {feedings.length < 10 ? (
            <button onClick={() => { const idx = feedings.length; addFeed(); setExpandedMeal(idx); }}
              style={{ width:"100%", height:52, background:"rgba(255,255,255,0.55)",
                       border:"1.5px dashed rgba(230,134,69,0.4)", borderRadius:18,
                       fontSize:15, fontWeight:700, color:C.pri, cursor:"pointer" }}>
              + 添加喂食
            </button>
          ) : (
            <div style={{ textAlign:"center", fontSize:13, color:H_SUB, padding:"6px 0" }}>
              已添加 10 次喂食（上限）
            </div>
          )}

          {/* 橙色大保存按钮 */}
          <button onClick={doSaveAndBack}
            style={{ width:"100%", height:56, borderRadius:999, fontSize:17, fontWeight:800,
                     background:`linear-gradient(135deg, ${C.pri}, #F09A5B)`,
                     color:"white", border:"none", cursor:"pointer",
                     boxShadow:"0 10px 24px rgba(230,134,69,0.28)", marginTop:4 }}>
            保存喂食计划
          </button>

          {/* 温馨提示 */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                        background:"rgba(255,255,255,0.6)", borderRadius:20, padding:"14px 18px",
                        border:"1px solid rgba(230,134,69,0.12)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <PawPrint size={18} color="#E6A348" strokeWidth={1.8} style={{ flexShrink:0 }}/>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#A86E3D", marginBottom:2 }}>温馨提示</div>
                <div style={{ fontSize:13, color:"#8A7B6A", lineHeight:1.5 }}>
                  定时定量喂食，有助于Ta的健康成长
                </div>
              </div>
            </div>
            <FoodBowlFP/>
          </div>

          <ErrBox msg={feedError}/>
        </div>
      </div>
    );
  }

  if (subPage === "expenses") {
    return <ExpensePage user={user} pets={pets} onBack={() => setSubPage(null)}
      onAmountChanged={() => getMonthlyTotal(user.id).then(setMonthExpense).catch(() => {})} />;
  }
  if (subPage === "recipes") {
    return <RecipePage onBack={() => setSubPage(null)} />;
  }
  if (subPage === "health") {
    return <HealthPage user={user} pet={pet} pets={pets} onPetUpdate={onPetUpdate}
                       onBack={() => { setSubPage(null); setHealthRefresh((n) => n + 1); }} />;
  }
  if (subPage === "petchat") {
    return <PetChatPage user={user} pet={pet} onPetUpdate={onPetUpdate}
                        onBack={() => setSubPage(null)} />;
  }
  if (subPage === "news") {
    return <NewsPage onBack={() => setSubPage(null)} />;
  }

  return (
    <div style={{ height:"100%", overflowY:"auto", background:H_BG }}>
      {completeOpen && (
        <PetProfileComplete
          pet={pet}
          onClose={() => { setCompleteOpen(false); setDismissed(true); }}
          onSaved={(updated) => { setCompleteOpen(false); onPetUpdate?.(updated); }}
        />
      )}
      {avatarOpen && (
        <AvatarGenerator
          user={user}
          pet={pet}
          onClose={() => setAvatarOpen(false)}
          onSaved={(updated) => { setAvatarOpen(false); onPetUpdate?.(updated); }}
        />
      )}
      <div style={{ background:H_BG, padding:"52px 20px 6px",
                    position:"relative", overflow:"hidden" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <Logo size={52} />
            <div>
              <div style={{ fontSize:10, color:H_SUB, marginBottom:2, letterSpacing:0.5 }}>爪爪日记 TailMe</div>
              <div style={{ fontSize:20, fontWeight:800, color:C.text }}>嗨，{pet.name} 👋</div>
            </div>
          </div>
          <a href="/admin" style={{ width:38, height:38, borderRadius:"50%", background:H_SURFACE,
                                    border:`1px solid ${H_BORDER}`,
                                    display:"flex", alignItems:"center", justifyContent:"center",
                                    fontSize:16, textDecoration:"none" }}>🔔</a>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>

          {/* 宠物图 + AI 入口卡片 包裹层（relative；AI 卡片是手势 div 的兄弟节点，不影响滑动） */}
          <div style={{ position:"relative", width:"100%" }}>

          {/* ── 装饰元素：百分比定位，贴近居中宠物图（pointer-events:none）── */}
          <div style={{ position:"absolute", left:"18%", top:"22%", color:"#F2A55F", opacity:0.42,
                        transform:"rotate(-12deg)", pointerEvents:"none", zIndex:1 }}>
            <PawPrint size={30} strokeWidth={1.6}/>
          </div>
          <div style={{ position:"absolute", left:"22%", top:"46%", color:"#F2A55F", opacity:0.38,
                        transform:"rotate(10deg)", pointerEvents:"none", zIndex:1 }}>
            <Heart size={22} strokeWidth={1.6}/>
          </div>
          <div style={{ position:"absolute", left:"20%", top:"66%", color:"#F2A55F", opacity:0.32,
                        pointerEvents:"none", zIndex:1 }}>
            <Sparkles size={24} strokeWidth={1.6}/>
          </div>
          {/* 虚线弧线 */}
          <svg style={{ position:"absolute", left:"16%", top:"40%", width:90, height:70,
                        pointerEvents:"none", zIndex:1, opacity:0.45 }}
               viewBox="0 0 90 70" fill="none">
            <path d="M8 12 C20 55, 62 65, 82 28"
              stroke="#E68645" strokeWidth="3" strokeLinecap="round" strokeDasharray="7 9"/>
          </svg>

          {/* ── Swipe carousel：左 ghost / 主头像 / 右 ghost ── */}
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
            style={{ width:"100%", overflow:"hidden", touchAction: showCarousel ? "pan-y" : "auto",
                     userSelect:"none" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                          background: H_BG,
                          transform: `translateX(${dragX}px)`,
                          transition: dragX === 0
                            ? "transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94)"
                            : "none",
                          willChange:"transform" }}>

              {/* 左侧 ghost（环形上一只 prevPet） */}
              {showCarousel && prevPet && (
                <div onClick={() => onSwitchPet?.(prevPet)}
                  style={{ width:108, display:"flex", justifyContent:"center", alignItems:"center",
                           flexShrink:0, flexDirection:"column", gap:4,
                           background: H_BG,
                           opacity: 0.48,
                           transform:"scale(0.58)", transformOrigin:"right center",
                           pointerEvents: "auto",
                           cursor: "pointer",
                           transition:"opacity 0.3s ease" }}>
                  <PetAvatar pet={prevPet} size={90} bg="transparent" blendMode="multiply" />
                  <div style={{ fontSize:10, color:H_SUB, fontWeight:600,
                                textAlign:"center", maxWidth:70,
                                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {prevPet.name}
                  </div>
                </div>
              )}

              {/* 主头像（点击进入 AI 宠物聊天占位页） */}
              <div onClick={() => setSubPage("petchat")}
                   style={{ position:"relative", padding:"4px 10px", flexShrink:0, cursor:"pointer" }}>
                <div style={{ position:"relative", width:210, height:210 }}>
                  {/* 占位层：真实头像未加载完成时显示 —— 优先上次缓存头像，否则默认小狗（永不空白） */}
                  {!avatarLoaded && (
                    cachedAvatar ? (
                      <img src={cachedAvatar} alt="" aria-hidden="true"
                        style={{ position:"absolute", inset:0, width:210, height:210, objectFit:"contain",
                                 animation:"float 3s ease-in-out infinite", mixBlendMode:"multiply" }} />
                    ) : (
                      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
                                    justifyContent:"center", fontSize:150, lineHeight:1,
                                    animation:"float 3s ease-in-out infinite" }}>
                        🐶
                      </div>
                    )
                  )}
                  {/* 真实头像：加载完成后淡入覆盖占位层；broken 时不渲染，占位层继续兜底 */}
                  {avatarSrc && !avatarBroken && (
                    <img ref={avatarImgRef} src={avatarSrc} alt={pet.name}
                      fetchPriority="high"
                      onLoad={() => {
                        setAvatarLoaded(true);
                        try { if (avatarCacheKey && avatarSrc) localStorage.setItem(avatarCacheKey, avatarSrc); } catch {}
                      }}
                      onError={() => setAvatarBroken(true)}
                      style={{ position:"absolute", inset:0, width:210, height:210, objectFit:"contain", display:"block",
                               opacity: avatarLoaded ? 1 : 0,
                               transition:"opacity 0.45s ease",
                               animation:"float 3s ease-in-out infinite",
                               mixBlendMode:"multiply" }} />
                  )}
                </div>
                {/* 位置 A：右上角小状态标签。生病中 > 饿了 */}
                {sick ? (
                  <div style={{ position:"absolute", top:0, right:-4, background:"#5FA766", borderRadius:20,
                                padding:"3px 9px", fontSize:10, fontWeight:700, color:"white",
                                boxShadow:"0 2px 10px rgba(95,167,102,0.35)" }}>
                    🤒 生病中
                  </div>
                ) : feedReminder && (
                  <div style={{ position:"absolute", top:0, right:-4, background:C.accent, borderRadius:20,
                                padding:"3px 9px", fontSize:10, fontWeight:700, color:"white",
                                boxShadow:"0 2px 10px rgba(230,134,69,0.35)" }}>
                    {feedReminder === "soon" ? "⏰ 快饿啦" : "😋 饿了"}
                  </div>
                )}
              </div>

              {/* 右侧 ghost（环形下一只 nextPet） */}
              {showCarousel && nextPet && (
                <div onClick={() => onSwitchPet?.(nextPet)}
                  style={{ width:108, display:"flex", justifyContent:"center", alignItems:"center",
                           flexShrink:0, flexDirection:"column", gap:4,
                           background: H_BG,
                           opacity: 0.48,
                           transform:"scale(0.58)", transformOrigin:"left center",
                           pointerEvents: "auto",
                           cursor: "pointer",
                           transition:"opacity 0.3s ease" }}>
                  <PetAvatar pet={nextPet} size={90} bg="transparent" blendMode="multiply" />
                  <div style={{ fontSize:10, color:H_SUB, fontWeight:600,
                                textAlign:"center", maxWidth:70,
                                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {nextPet.name}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 「点我聊聊～」说话气泡：浮在宠物左上方（左耳侧），点击进入 AI 宠物聊天占位页
              外层固定 rotate(-6deg)，内层做呼吸动画，避免动画 transform 覆盖旋转 */}
          <div style={{ position:"absolute", left:"7%", top:8, zIndex:6,
                        transform:"rotate(-6deg)", transformOrigin:"center bottom" }}>
            <button onClick={() => setSubPage("petchat")}
              aria-label="和宠物聊聊"
              style={{ position:"relative",
                       width:"fit-content", maxWidth:160, minWidth:90,
                       padding:"10px 14px",
                       display:"flex", alignItems:"center", justifyContent:"center",
                       background:"#FFFDF8",
                       border:`1.5px solid ${C.pri}`, borderRadius:18,
                       boxShadow:"0 3px 9px rgba(230,134,69,0.12)",
                       color:C.pri, fontSize:13.5, fontWeight:800, lineHeight:1.3,
                       textAlign:"center", wordBreak:"break-word",
                       cursor:"pointer",
                       animation:"chatBubbleBreath 2.8s ease-in-out infinite" }}>
              {bubbleText}
              {/* 小三角尾巴：在气泡右下角，指向宠物 */}
              <span style={{ position:"absolute", right:20, bottom:-8, width:0, height:0,
                             borderLeft:"8px solid transparent", borderRight:"8px solid transparent",
                             borderTop:`9px solid ${C.pri}` }} />
              <span style={{ position:"absolute", right:21, bottom:-6, width:0, height:0,
                             borderLeft:"7px solid transparent", borderRight:"7px solid transparent",
                             borderTop:"8px solid #FFFDF8" }} />
            </button>
          </div>

          {/* AI 入口卡片：浮在宠物图右下角（手势 div 的兄弟节点，点击触发原 setAvatarOpen 逻辑） */}
          <button onClick={() => setAvatarOpen(true)}
            style={{ position:"absolute", right:0, bottom:4, zIndex:5,
                     display:"flex", alignItems:"center", gap:7,
                     minWidth:140, height:44, padding:"5px 10px 5px 5px",
                     background:"linear-gradient(135deg, #E68645, #F09A5B)",
                     border:"2px solid rgba(255,255,255,0.72)", borderRadius:999,
                     boxShadow:"0 6px 16px rgba(230,134,69,0.26)",
                     cursor:"pointer", textAlign:"left" }}>
            <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0,
                          background:"rgba(255,255,255,0.95)",
                          display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Sparkles size={16} color="#E68645" strokeWidth={2} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:800, color:"white", lineHeight:1.2 }}>
                {avatarSrc ? "我的 AI 形象" : "AI 生成宠物形象"}
              </div>
              <div style={{ fontSize:10, fontWeight:500, color:"rgba(255,255,255,0.88)", marginTop:1 }}>
                {avatarSrc ? "查看专属宠物" : "还原最可爱的它"}
              </div>
            </div>
            <ChevronRight size={14} color="rgba(255,255,255,0.9)" strokeWidth={2.5}
              style={{ flexShrink:0 }} />
          </button>

          </div>{/* /relative 包裹层 */}

          {/* 宠物名字 */}
          <div style={{ marginTop:20, fontSize:20, fontWeight:800, color:C.text }}>{pet.name}</div>

          {/* 生日 + 性格 胶囊标签（数据来自真实宠物字段） */}
          {(birthdayLabel || pet.personality) && (
            <div style={{ display:"flex", justifyContent:"center", alignItems:"center",
                          gap:10, flexWrap:"wrap", marginTop:10 }}>
              {birthdayLabel && (
                <span style={{ background:"rgba(255,255,255,0.62)",
                               border:"1px solid rgba(255,255,255,0.72)",
                               borderRadius:999, padding:"5px 12px",
                               boxShadow:"0 4px 10px rgba(0,0,0,0.04)",
                               fontSize:12, fontWeight:600, color:"#8A7B6A" }}>
                  🎂 {birthdayLabel}
                </span>
              )}
              {pet.personality && (
                <span style={{ background:"rgba(255,255,255,0.62)",
                               border:"1px solid rgba(255,255,255,0.72)",
                               borderRadius:999, padding:"5px 12px",
                               boxShadow:"0 4px 10px rgba(0,0,0,0.04)",
                               fontSize:12, fontWeight:600, color:"#8A7B6A" }}>
                  ✨ {pet.personality}
                </span>
              )}
            </div>
          )}

          {/* 进度点 + 左右箭头（辅助） */}
          {showCarousel && (
            <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:10 }}>
              <button
                onClick={() => prevPet && onSwitchPet?.(prevPet)}
                style={{ background:"transparent", border:"none", fontSize:22, lineHeight:1,
                         color: C.pri, cursor: "pointer",
                         padding:"0 4px" }}>‹</button>
              <div style={{ display:"flex", gap:6 }}>
                {pets.map((p, i) => (
                  <div key={p.id} onClick={() => onSwitchPet?.(p)}
                    style={{ width: i === petIdx ? 16 : 6, height:6, borderRadius:3,
                             background: i === petIdx ? C.pri : H_BORDER,
                             cursor:"pointer", transition:"all 0.25s ease" }} />
                ))}
              </div>
              <button
                onClick={() => nextPet && onSwitchPet?.(nextPet)}
                style={{ background:"transparent", border:"none", fontSize:22, lineHeight:1,
                         color: C.pri, cursor: "pointer",
                         padding:"0 4px" }}>›</button>
            </div>
          )}

          {/* 位置 B：长条提醒。生病中→用药提醒（无则隐藏，不显示喂食）；未生病→喂食提醒 */}
          {sick ? (
            medReminder && (
              <div style={{ marginTop:12, background:"rgba(95,167,102,0.1)", border:"1px solid rgba(95,167,102,0.25)",
                            borderRadius:20, padding:"8px 18px", fontSize:13, color:"#4E8C56", fontWeight:600 }}>
                {medReminder === "soon"
                  ? "💊 快到用药时间啦，记得照顾我哦"
                  : "💊 该吃药啦，记得帮我用药哦"}
              </div>
            )
          ) : feedReminder && (
            <div style={{ marginTop:12, background:H_SURFACE, border:`1px solid ${H_BORDER}`,
                          borderRadius:20, padding:"8px 18px", fontSize:13, color:C.accent, fontWeight:600 }}>
              {feedReminder === "soon" ? "🍖 我快饿啦，记得喂我哦！" : "🍖 我有点饿啦，记得喂我哦！"}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding:"6px 14px 90px" }}>
        {/* 宠物基础信息卡：品种 / 年龄 / 体重 / 性别（lucide icons） */}
        <div style={{ display:"flex", alignItems:"center", background:"white",
                      borderRadius:20, padding:"14px 6px", marginBottom:12,
                      boxShadow:H_SHADOW, border:`1px solid ${H_BORDER}` }}>
          {[
            { Icon:PawPrint,    bg:"#F7E8D8", ic:"#A86E3D", val: pet.breed || "—",  label:"品种" },
            { Icon:CalendarDays,bg:"#F8E1C7", ic:"#E68645", val: ageLabel,          label:"年龄" },
            { Icon:Scale,       bg:"#E4F1DF", ic:"#5FA766", val: pet.weight ? `${pet.weight} kg` : "—", label:"体重" },
            { Icon: pet.gender === "male" ? Mars : Venus,
              bg:   pet.gender === "male" ? "#DCE9F7" : "#F8DDE4",
              ic:   pet.gender === "male" ? "#5A83B8" : "#D9567A",
              val:  pet.gender === "male" ? "男孩" : pet.gender === "female" ? "女孩" : "—", label:"性别" },
          ].map(({ Icon, bg, ic, val, label }, i) => (
            <div key={label} style={{ flex:1, display:"flex", alignItems:"center", gap:8,
                                      padding:"0 8px",
                                      borderLeft: i === 0 ? "none" : `1px solid ${H_BORDER}` }}>
              <div style={{ width:38, height:38, borderRadius:"50%", background:bg, flexShrink:0,
                            display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon size={18} color={ic} strokeWidth={1.8}/>
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:800, color:C.text, lineHeight:1.2,
                              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {val}
                </div>
                <div style={{ fontSize:10, color:H_SUB, marginTop:1 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 3 个入口卡：记账 / 食谱 / 健康 */}
        <div style={{ display:"flex", gap:12, marginBottom:12 }}>
          <HomeNavCard
            icon={<AccountingIcon size={54} />} label="宠物记账"
            value={monthExpense == null ? "—" : `¥${Number(monthExpense).toFixed(0)}`}
            sub="本月" valueSize={18}
            bg="#F2E5DA" deco="paw"
            onClick={() => setSubPage("expenses")}
            H_SUB={H_SUB} text={C.text} />
          <HomeNavCard
            icon={<RecipeIcon size={54} />} label="宠物食谱"
            value={todayRecipe?.title || "看看推荐"}
            sub="今日推荐" valueSize={14}
            bg="#F4ECD9" deco="bowl"
            onClick={() => setSubPage("recipes")}
            H_SUB={H_SUB} text={C.text} />
          <HomeNavCard
            icon={<HealthIcon size={54} />} label="宠物健康"
            value={(pet?.neutered ? "已绝育" : "未绝育")}
            sub={pet?.vaccinated ? "疫苗齐全" : "疫苗待补"} valueSize={16}
            bg="#ECEEE8" deco="shield"
            onClick={() => setSubPage("health")}
            H_SUB={H_SUB} text={C.text} />
        </div>

        {/* ── Feeding Card（首页摘要：只显示下一顿）── */}
        {(() => {
          const mealIconCfg = (t) => {
            const h = t ? parseInt(t.split(":")[0], 10) : 8;
            if (h >= 5  && h < 12) return { Icon:Sun,      grad:"linear-gradient(135deg,#FFE6A8,#F4A64E)", ic:"white" };
            if (h >= 12 && h < 18) return { Icon:Sun,      grad:"linear-gradient(135deg,#FFD6A5,#E88A35)", ic:"white" };
            if (h >= 18 && h < 24) return { Icon:Moon,     grad:"linear-gradient(135deg,#F9B087,#8B4C7A)", ic:"white" };
            return                         { Icon:MoonStar, grad:"linear-gradient(135deg,#22375C,#687AAE)", ic:"#FFE6A8" };
          };
          const SUGGEST = ["06:00–10:00","12:00–15:00","16:00–20:00"];
          const FoodBowl = () => (
            <svg width="80" height="62" viewBox="0 0 90 70" fill="none" style={{ flexShrink:0 }}>
              <ellipse cx="45" cy="20" rx="32" ry="12" fill="#E6A348" opacity="0.45"/>
              <path d="M18 24H72L64 58H26L18 24Z" fill="#F4ECD9" stroke="#A86E3D" strokeWidth="3"/>
              <circle cx="35" cy="40" r="3" fill="#A86E3D"/><circle cx="45" cy="37" r="3" fill="#A86E3D"/><circle cx="55" cy="40" r="3" fill="#A86E3D"/>
            </svg>
          );
          return (
            <div style={{ background:"rgba(255,255,255,0.72)", borderRadius:28, padding:22,
                          marginBottom:12, boxShadow:"0 8px 24px rgba(0,0,0,0.06)",
                          border:"1px solid rgba(255,255,255,0.7)" }}>

              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:48, height:48, borderRadius:999, background:"#F8E1C7",
                                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Utensils size={24} color="#E68645" strokeWidth={2}/>
                  </div>
                  <div>
                    <div style={{ fontSize:17, fontWeight:800, color:C.text }}>喂食计划</div>
                    <div style={{ fontSize:12, color:H_SUB, marginTop:1 }}>科学喂养，健康成长每一天</div>
                  </div>
                </div>
                <button onClick={() => setSubPage("feeding")}
                  style={{ height:40, padding:"0 16px", borderRadius:999, cursor:"pointer",
                           display:"flex", alignItems:"center", gap:6, fontWeight:700,
                           border:"1.5px solid rgba(230,134,69,0.35)",
                           background:"rgba(255,255,255,0.55)", color:"#E68645", fontSize:13 }}>
                  <Settings size={16} strokeWidth={2}/>
                  设置
                </button>
              </div>

              {feedLoading ? (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[1,2].map((n) => (
                    <div key={n} style={{ background:"rgba(244,236,217,0.5)", borderRadius:22, height:80,
                                          animation:"pulse 1.4s ease-in-out infinite" }} />
                  ))}
                </div>

              ) : !hasFeedRecord ? (
                <div style={{ textAlign:"center", padding:"16px 0 10px" }}>
                  <div style={{ fontSize:13, color:H_SUB, marginBottom:14 }}>
                    还没有为 <b style={{ color:C.text }}>{pet.name}</b> 添加喂食计划
                  </div>
                  <button onClick={() => setSubPage("feeding")}
                    style={{ background:C.pri, color:"white", border:"none", borderRadius:999,
                             padding:"10px 24px", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                    + 添加喂食计划
                  </button>
                </div>

              ) : (
                /* 首页摘要：下一顿待执行 or 全完成 */
                (() => {
                  const meals = feedings.slice(0, 3);
                  const nextIdx = meals.findIndex((_, i) => !doneMeals[i]);
                  const allDone = nextIdx === -1;
                  if (allDone) {
                    return (
                      <button onClick={() => setSubPage("feeding")}
                        style={{ width:"100%", background:"rgba(95,167,102,0.08)",
                                 border:"1px solid rgba(95,167,102,0.2)", borderRadius:20,
                                 padding:"18px 16px", cursor:"pointer", textAlign:"left" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                          <CheckCircle size={40} color="#5FA766" strokeWidth={1.6}/>
                          <div>
                            <div style={{ fontSize:16, fontWeight:800, color:"#5FA766" }}>今日喂食已完成</div>
                            <div style={{ fontSize:13, color:"#7A8275", marginTop:3 }}>
                              {meals.length} 顿喂食均已完成 · 点击查看详情
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  }
                  const f = meals[nextIdx];
                  const cfg = mealIconCfg(f.time); const MIcon = cfg.Icon;
                  return (
                    <button onClick={() => setSubPage("feeding")}
                      style={{ width:"100%", background:"rgba(244,236,217,0.42)",
                               border:"1px solid rgba(230,134,69,0.14)", borderRadius:22,
                               padding:16, cursor:"pointer", textAlign:"left",
                               display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{ width:46, height:46, borderRadius:14, flexShrink:0,
                                    background:cfg.grad, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <MIcon size={22} color={cfg.ic} strokeWidth={1.8}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, color:"#8A7B6A", fontWeight:700, marginBottom:3 }}>
                          下一顿 · {FEED_LABELS[nextIdx]}
                        </div>
                        <div style={{ fontSize:17, fontWeight:800, color:"#111", lineHeight:1.2 }}>
                          今天 {formatFeedingTime(f.time)}
                          {f.amount && <span style={{ fontSize:15, fontWeight:800, color:"#E68645", marginLeft:5 }}>· {f.amount}{f.unit}</span>}
                        </div>
                        <div style={{ fontSize:11, color:"#8A7B6A", marginTop:4 }}>
                          建议：{SUGGEST[nextIdx] || SUGGEST[0]} · 点击管理
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                        <button onClick={(e) => { e.stopPropagation(); toggleMealDone(nextIdx); }}
                          style={{ display:"flex", alignItems:"center", gap:4, height:32, padding:"0 11px",
                                   borderRadius:999, border:"none", cursor:"pointer", fontSize:12, fontWeight:800,
                                   background:"rgba(230,134,69,0.12)", color:"#E68645" }}>
                          <Clock size={13} strokeWidth={2.2}/>待喂食
                        </button>
                        <ChevronRight size={16} color="#C5B9B0"/>
                      </div>
                    </button>
                  );
                })()
              )}
              <ErrBox msg={feedError} />
            </div>
          );
        })()}

        {/* 活动推送 / 资讯 */}
        <button onClick={() => setSubPage("news")}
          style={{ width:"100%", background:"white", border:`1px solid ${H_BORDER}`,
                   borderRadius:20, padding:14, marginBottom:12, boxShadow:H_SHADOW,
                   cursor:"pointer", textAlign:"left",
                   display:"flex", alignItems:"center", gap:12 }}>
          <NewsCover news={latestNews} size={64} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
              <span style={{ fontSize:11, color:C.accent, fontWeight:700 }}>📰 活动推送</span>
              <span style={{ fontSize:10, color:H_SUB }}>· 更多 ›</span>
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, lineHeight:1.4,
                          display:"-webkit-box", WebkitLineClamp:2,
                          WebkitBoxOrient:"vertical", overflow:"hidden" }}>
              {latestNews?.title || "暂无资讯，去看看更多 →"}
            </div>
          </div>
        </button>

        {/* AI Upload */}
        <div style={{ background:"white", border:`1px solid ${H_BORDER}`, borderRadius:20,
                      padding:16, marginBottom:12, boxShadow:H_SHADOW }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ fontSize:18 }}>🔬</span>
            <span style={{ fontSize:14, fontWeight:700, color:C.text }}>AI 健康分析</span>
            <span style={{ marginLeft:"auto", fontSize:10, background:C.tint, color:C.accent,
                           border:`1px solid ${C.tint}`,
                           padding:"2px 9px", borderRadius:20, fontWeight:600 }}>Beta</span>
          </div>
          <div style={{ fontSize:11, color:H_SUB, marginBottom:14 }}>上传照片，AI 帮你初步分析健康状况</div>
          <div style={{ display:"flex", gap:8 }}>
            {[["food","🥩","食物照片"],["poop","💩","便便照片"],["other","🔍","分泌物"]].map(([key, em, lbl]) => (
              <button key={key} onClick={() => handleUpload(key)}
                style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
                         padding:"12px 6px", borderRadius:16,
                         background:uplType === key ? C.tint : H_SURFACE,
                         border:`1.5px solid ${uplType === key ? C.pri : H_BORDER}`,
                         cursor:"pointer", transition:"all .2s" }}>
                <span style={{ fontSize:24 }}>{em}</span>
                <span style={{ fontSize:10, color:C.text, marginTop:5, textAlign:"center", lineHeight:1.3 }}>{lbl}</span>
              </button>
            ))}
          </div>
          {loading && (
            <div style={{ marginTop:18, textAlign:"center", padding:"12px 0" }}>
              <div style={{ fontSize:28, display:"inline-block", animation:"spin 1s linear infinite" }}>⟳</div>
              <div style={{ fontSize:12, color:H_SUB, marginTop:8 }}>AI 分析中，请稍候...</div>
            </div>
          )}
          <ErrBox msg={uploadError} />
          {result && !loading && (
            <div style={{ marginTop:14, borderRadius:16, padding:16, background:C.tint, border:`1px solid ${H_BORDER}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12, paddingBottom:12, borderBottom:`1px solid ${H_BORDER}` }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:30, fontWeight:800, color:result.rc, lineHeight:1 }}>{result.score}</div>
                  <div style={{ fontSize:10, color:H_SUB, marginTop:2 }}>健康评分</div>
                </div>
                <div style={{ width:1, height:40, background:H_BORDER }}/>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:result.rc }}>风险：{result.risk}</div>
                  <div style={{ fontSize:10, color:H_SUB, marginTop:2 }}>当前等级</div>
                </div>
                <div style={{ marginLeft:"auto", width:42, height:42, borderRadius:"50%",
                              background:`${result.rc}22`, display:"flex", alignItems:"center",
                              justifyContent:"center", fontSize:22 }}>
                  {result.score >= 80 ? "😊" : result.score >= 65 ? "😐" : "😟"}
                </div>
              </div>
              <div style={{ fontSize:13, lineHeight:1.7, color:C.text, marginBottom:10 }}>{result.txt}</div>
              <div style={{ fontSize:11, background:"white", border:`1px solid ${H_BORDER}`,
                            borderRadius:12, padding:"8px 12px", color:H_SUB, lineHeight:1.5 }}>
                ⚠️ 本结果仅为健康辅助参考，不能替代兽医诊断。如有疑虑请及时就医。
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes chatBubbleBreath { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-4px) scale(1.04)} }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HOME NAV CARD — 首页 3 个入口的统一样式
══════════════════════════════════════════════════════════════ */
/* 装饰性背景 SVG（右下角，透明度 0.08） */
function CardDeco({ type }) {
  const s = { position:"absolute", bottom:-15, right:-15, opacity:0.08, pointerEvents:"none", color:"#1A1006",
              transform:"scale(0.78)", transformOrigin:"bottom right" };
  if (type === "paw") return (
    <div style={s}>
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
        <ellipse cx="27" cy="38" rx="8" ry="11"/>
        <ellipse cx="50" cy="28" rx="9" ry="12"/>
        <ellipse cx="73" cy="38" rx="8" ry="11"/>
        <path d="M33 58 Q22 78 38 88 Q55 95 72 88 Q88 78 77 58 Q70 48 55 48 Q40 48 33 58Z"/>
      </svg>
    </div>
  );
  if (type === "bowl") return (
    <div style={s}>
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 52 Q15 82 50 82 Q85 82 85 52"/>
        <ellipse cx="50" cy="52" rx="35" ry="10"/>
        <line x1="50" y1="82" x2="50" y2="91"/>
        <line x1="36" y1="91" x2="64" y2="91"/>
      </svg>
    </div>
  );
  if (type === "shield") return (
    <div style={s}>
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 10 L80 22 L80 55 Q80 80 50 90 Q20 80 20 55 L20 22 Z"/>
        <path d="M38 50 L45 50 L45 38 L55 38 L55 50 L62 50 L62 60 L55 60 L55 72 L45 72 L45 60 L38 60 Z"/>
      </svg>
    </div>
  );
  return null;
}

function HomeNavCard({ icon, label, value, sub, valueSize = 26, bg, deco, onClick, H_SUB, text }) {
  return (
    <button onClick={onClick}
      style={{ flex:1, background: bg || "#F2E5DA", border:"none",
               borderRadius:24, minHeight:140,
               boxShadow:"0 6px 18px rgba(0,0,0,0.05)", cursor:"pointer",
               display:"flex", flexDirection:"column", alignItems:"center",
               justifyContent:"flex-start", padding:"12px 6px 10px",
               minWidth:0, position:"relative", overflow:"hidden", textAlign:"center" }}>

      {/* 右下角装饰 */}
      <CardDeco type={deco} />

      {/* Icon 圆形浮层 */}
      <div style={{ width:60, height:60, borderRadius:999,
                    background:"rgba(255,255,255,0.6)",
                    backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
                    boxShadow:"0 4px 12px rgba(0,0,0,0.04)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0, marginBottom:6 }}>
        {icon}
      </div>

      {/* 标签 */}
      <div style={{ fontSize:10, color:H_SUB, marginBottom:3, letterSpacing:0.3 }}>{label}</div>

      {/* 主数据 */}
      <div style={{ fontSize:valueSize, fontWeight:700, color:text || "#1A1006", lineHeight:1.1,
                    maxWidth:"100%", overflow:"hidden", textOverflow:"ellipsis",
                    whiteSpace:"nowrap", padding:"0 4px" }}>
        {value}
      </div>

      {/* 副标签 */}
      {sub && (
        <div style={{ fontSize:10, color:H_SUB, marginTop:3 }}>{sub}</div>
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAP TAB — 已迁移至 components/map/MapTab.jsx
   使用高德 JS API，动态加载，无 SSR 报错。
   import MapTab from "@/components/map/MapTab" (顶部已导入)
══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   COMMUNITY TAB — 已迁至 components/community/CommunityTab.jsx
   （Supabase 真实数据 + Realtime + 内容过滤）
══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   SOCIAL TAB —— 已迁至 components/social/SocialTab.jsx
   （真实附近狗狗 + 遛弯名片 + 邀请私聊；隐私走 RPC，不暴露经纬度）
══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   APP SHELL
   状态机：loading → login → onboarding → app
   user_id 持久化至 localStorage("tailme_user_id")
══════════════════════════════════════════════════════════════ */
const TABS = [
  { icon:"🐾", label:"遛弯" },
  { label:"地图" },
  { home:true, label:"首页" },
  { label:"社群" },
  { icon:"👤", label:"我的" },
];

// 状态：loading | login | onboarding | app
const S = { LOADING:"loading", LOGIN:"login", ONBOARDING:"onboarding", USERNAME:"username", APP:"app" };
const LS_KEY          = "tailme_user_id";
const LS_ACTIVE_PET   = "tailme_active_pet_id";

export default function AppRoot() {
  const [screen, setScreen] = useState(S.LOADING);
  const [user, setUser]     = useState(null);
  const [pets, setPets]     = useState([]);   // 全部宠物列表
  const [pet, setPet]       = useState(null); // 当前激活宠物
  const [tab, setTab]       = useState(2);
  const [profileUserId, setProfileUserId] = useState(null); // 用户主页浮层

  const userId = user?.id ?? null;

  /* 进入 App 后后台预取社群 feed，用户点「社群」时直接命中缓存（无加载） */
  useEffect(() => {
    if (screen === S.APP && userId) prefetchCommunityFeed(userId);
  }, [screen, userId]);

  /* 切换激活宠物，同步到 localStorage */
  const setActivePet = (newPet) => {
    setPet(newPet);
    if (newPet?.id) localStorage.setItem(LS_ACTIVE_PET, newPet.id);
  };

  /* 更新某只宠物的数据（头像、资料等），同步到列表 + 若是激活宠物也更新。
     upsert：已存在则按 id 替换；不存在（新增宠物）则追加，让首页 carousel 立即出现新宠物，
     并自动切换为当前激活宠物 */
  const handlePetDataUpdated = (p) => {
    const isNew = !pets.some((x) => x.id === p.id);
    setPets((prev) => isNew ? [...prev, p] : prev.map((x) => x.id === p.id ? p : x));
    if (isNew) setActivePet(p);                                  // 新增 → 自动切到新宠物
    else setPet((prev) => prev?.id === p.id ? p : prev);
  };

  /* 删除宠物：从列表移除；若删的是当前激活宠物，自动切到列表第一只（无则 null） */
  const handlePetDeleted = (petId) => {
    setPets((prev) => prev.filter((x) => x.id !== petId));
    setPet((cur) => {
      if (cur?.id !== petId) return cur;
      const fallback = pets.find((x) => x.id !== petId) || null;
      if (fallback?.id) localStorage.setItem(LS_ACTIVE_PET, fallback.id);
      else localStorage.removeItem(LS_ACTIVE_PET);
      return fallback;
    });
  };

  /* 状态分发：拿到 user + pets 之后决定下一步 */
  const routeAfterLoad = (loadedUser, loadedPets) => {
    setUser(loadedUser);
    const petsArr = loadedPets || [];
    setPets(petsArr);
    if (petsArr.length === 0) { setScreen(S.ONBOARDING); return; }
    const storedId = localStorage.getItem(LS_ACTIVE_PET);
    const active   = (storedId && petsArr.find((p) => p.id === storedId)) || petsArr[0];
    setPet(active);
    if (!loadedUser?.username) { setScreen(S.USERNAME); return; }
    setScreen(S.APP);
  };

  /* 启动时：读取 localStorage → 验证 user → 查询宠物 → 决定下一步 */
  useEffect(() => {
    const storedId = localStorage.getItem(LS_KEY);
    if (!storedId) { setScreen(S.LOGIN); return; }

    (async () => {
      try {
        const u    = await getUserById(storedId);
        const pets = await getUserPets(storedId);
        routeAfterLoad(u, pets);
      } catch {
        localStorage.removeItem(LS_KEY);
        setScreen(S.LOGIN);
      }
    })();
  }, []);

  /* 登录成功 → 保存 userId → 拉 user + pets → 路由 */
  const handleLogin = async (uid) => {
    localStorage.setItem(LS_KEY, uid);
    setScreen(S.LOADING);
    try {
      const u    = await getUserById(uid);
      const pets = await getUserPets(uid);
      routeAfterLoad(u, pets);
    } catch {
      setUser({ id: uid });
      setScreen(S.ONBOARDING);
    }
  };

  /* 宠物创建成功 → 追加到列表，设为激活，检查 username */
  const handlePetCreated = (newPet) => {
    setPets((prev) => [...prev, newPet]);
    setActivePet(newPet);
    if (!user?.username) { setScreen(S.USERNAME); return; }
    setScreen(S.APP);
  };

  /* 用户名设置完成 → 进入 App */
  const handleUsernameSet = (updatedUser) => {
    setUser(updatedUser);
    setScreen(S.APP);
  };

  /* 退出登录 → 清 localStorage / state，回到登录页 */
  const handleLogout = () => {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_ACTIVE_PET);
    setUser(null);
    setPets([]);
    setPet(null);
    setTab(2);
    setScreen(S.LOGIN);
  };

  const shell = (content, scroll = false) => (
    <div style={{ background:"#EEE9E1", minHeight:"100vh",
                  display:"flex", justifyContent:"center", alignItems:"flex-start" }}>
      <div style={{ width:"100%", maxWidth:430, height:"100vh", position:"relative",
                    background:C.bg, overflow:"hidden", boxShadow:"0 0 80px rgba(0,0,0,0.08)" }}>
        {scroll
          ? <div style={{ height:"100%", overflowY:"auto" }}>{content}</div>
          : content}
      </div>
    </div>
  );

  if (screen === S.LOADING)    return shell(<LoadingScreen />, false);
  if (screen === S.LOGIN)      return shell(<PhoneLogin onLogin={handleLogin} />, false);
  if (screen === S.ONBOARDING) return shell(<PetOnboarding userId={userId} onComplete={handlePetCreated} />, true);
  if (screen === S.USERNAME)   return shell(<UsernameSetup userId={userId} onComplete={handleUsernameSet} />, false);

  // S.APP
  return shell(
    <>
      <div style={{ position:"absolute", top:0, left:0, right:0, bottom:60, overflow:"hidden" }}>
        {tab === 0 && <SocialTab user={user} pet={pet} pets={pets} onOpenProfile={setProfileUserId} />}
        {tab === 1 && <MapTab />}
        {tab === 2 && <HomeTab user={user} pet={pet} pets={pets} onPetUpdate={handlePetDataUpdated} onSwitchPet={setActivePet} />}
        {tab === 3 && <CommunityTab user={user} pet={pet} pets={pets} onUserUpdated={setUser} onOpenProfile={setProfileUserId} />}
        {tab === 4 && <ProfileTab user={user} pet={pet} onSetActivePet={setActivePet} onPetUpdated={handlePetDataUpdated} onPetDeleted={handlePetDeleted} onUserUpdated={setUser} onOpenProfile={setProfileUserId} onLogout={handleLogout} />}
      </div>
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:60,
                    background:"white", display:"flex", zIndex:100 }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
                     justifyContent:"center", gap:2, border:"none", background:"transparent",
                     cursor:"pointer", transition:"all .15s", paddingTop:t.home ? 0 : 4 }}>
            {t.home ? (
              <div style={{ width:56, height:56, borderRadius:"50%", background:C.pri,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            marginTop:-16, boxShadow:"0 4px 14px rgba(230,134,69,0.4)" }}>
                <img src="/logo.png" alt="首页"
                     style={{ width:48, height:"auto",
                              filter:"brightness(0) invert(1)" }} />
              </div>
            ) : (
              <div style={{ height:22, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {t.label === "遛弯"
                  ? <PawIcon size={20} color={tab===i ? "#E68645" : "#C5C8CE"} />
                  : t.label === "地图"
                    ? <MapIcon size={34} color={tab===i ? "#E68645" : "#C5C8CE"} />
                    : t.label === "社群"
                      ? <ChatIcon size={42} color={tab===i ? "#E68645" : "#C5C8CE"} />
                      : t.label === "我的"
                        ? <ProfileIcon size={20} color={tab===i ? "#E68645" : "#C5C8CE"} />
                        : <span style={{ fontSize:20, lineHeight:1,
                                         filter: tab===i ? "none" : "grayscale(1) opacity(0.5)" }}>
                            {t.icon}
                          </span>}
              </div>
            )}
            <div style={{ fontSize:10, fontWeight:tab===i ? 700 : 500,
                          color:tab===i ? C.pri : "#8A8074", transition:"color .15s",
                          marginTop:t.home ? 2 : 0 }}>{t.label}</div>
            {tab === i && !t.home && <div style={{ width:18, height:2.5, borderRadius:4, background:C.grad, marginTop:1 }}/>}
          </button>
        ))}
      </div>

      {/* 用户主页浮层（任意位置点击作者/关注列表打开） */}
      {profileUserId && (
        <UserProfile viewerId={user?.id} userId={profileUserId}
          onClose={() => setProfileUserId(null)} />
      )}
    </>
  );
}
