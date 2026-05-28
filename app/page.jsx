"use client";

/**
 * app/page.jsx — TailMe / 爪爪日记
 *
 * 手机号账号体系 MVP。
 * 状态流：
 *   loading → login（手机号+验证码）→ onboarding（无宠物时）→ app（四 Tab）
 * user_id 持久化在 localStorage，刷新页面自动恢复登录态。
 */

import { useState, useEffect } from "react";
import {
  getOrCreateUserByPhone,
  getUserById,
  getUserPets,
  savePetProfile,
  saveFeedingRecord,
  saveHealthUpload,
  setUsername,
  isUsernameTaken,
  updatePet,
} from "@/services/supabaseService";
import { checkUsername } from "@/services/contentFilter";
import { formatPetAge, formatBirthday, PERSONALITIES, todayISO } from "@/services/petAge";
import MapTab from "@/components/map/MapTab";
import CommunityTab from "@/components/community/CommunityTab";
import ProfileTab from "@/components/profile/ProfileTab";
import ExpensePage from "@/components/home/ExpensePage";
import RecipePage  from "@/components/home/RecipePage";
import HealthPage  from "@/components/home/HealthPage";
import NewsPage, { NewsCover } from "@/components/home/NewsPage";
import AvatarGenerator from "@/components/home/AvatarGenerator";
import { getMonthlyTotal } from "@/services/petExpenseService";
import { getTodayRecipe }  from "@/services/petRecipeService";
import { getLatestNews }   from "@/services/petNewsService";

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
const BREEDS = [
  "腊肠犬","柴犬","柯基","金毛","拉布拉多","边牧","法斗","比熊","贵宾","泰迪",
  "阿拉斯加","哈士奇","德牧","博美","马尔济斯","巴哥","吉娃娃","秋田","雪纳瑞","约克夏",
  "杜宾","萨摩耶","罗威纳","伯恩山","斗牛犬","灵缇","纽芬兰","牛头梗","可卡","其他",
];

const feedAmt = (w) => {
  const n = parseFloat(w) || 5;
  if (n < 3)  return "50–70g / 次";
  if (n < 5)  return "70–90g / 次";
  if (n < 10) return "100–140g / 次";
  if (n < 20) return "180–250g / 次";
  if (n < 30) return "300–380g / 次";
  return "400–550g / 次";
};

const isHungry = (bt, dt) => {
  const now = new Date(), m = now.getHours() * 60 + now.getMinutes();
  const [bh, bm] = bt.split(":").map(Number);
  const [dh, dm] = dt.split(":").map(Number);
  return (m > bh * 60 + bm + 180 && m < dh * 60 + dm - 120) || m > dh * 60 + dm + 180;
};

const DOGS = [
  { id:1, name:"Joy",    breed:"腊肠犬", age:"2岁", walk:"晚上 7:00", neut:true,  vacc:true,  likes:"小型犬",   char:"温柔粘人", av:"🌭", km:"0.3", owner:"Lucy" },
  { id:2, name:"Momo",   breed:"柯基",   age:"1岁", walk:"下午 5:00", neut:false, vacc:true,  likes:"活泼狗狗", char:"活泼好动", av:"🍑", km:"0.5", owner:"小明"  },
  { id:3, name:"花花",   breed:"柴犬",   age:"3岁", walk:"早上 8:00", neut:true,  vacc:true,  likes:"同品种",   char:"独立傲娇", av:"🦊", km:"0.8", owner:"晓雯"  },
  { id:4, name:"Butter", breed:"金毛",   age:"4岁", walk:"下午 4:00", neut:true,  vacc:true,  likes:"所有狗狗", char:"超级友善", av:"☀️", km:"1.1", owner:"大伟"  },
  { id:5, name:"雪球",   breed:"萨摩耶", age:"2岁", walk:"晚上 7:30", neut:false, vacc:true,  likes:"大型犬",   char:"开朗爱笑", av:"⛄", km:"1.5", owner:"阿强"  },
];

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
   ONBOARDING
   新增：接收 userId prop，创建宠物时必须绑定
══════════════════════════════════════════════════════════════ */
function Onboarding({ userId, onComplete }) {
  const [step, setStep]     = useState(1);
  const [f, setF]           = useState({
    name:"", breed:"", birthday:"", personality:"",
    weight:"", gender:"", neutered:"", vaccinated:"",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const TOTAL_STEPS = 4;
  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const ok  = [
    f.name && f.breed,                       // step 1
    f.birthday && f.weight && f.gender,      // step 2
    f.personality,                            // step 3
    f.neutered && f.vaccinated,              // step 4
  ][step - 1];

  const next = async () => {
    if (step < TOTAL_STEPS) { setStep((s) => s + 1); return; }
    setSaving(true);
    setError(null);
    try {
      const savedPet = await savePetProfile(f, userId);
      onComplete(savedPet);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Onboarding 本地白底冷调
  const O_BG       = "#EEE9E1";  // 米白主背景
  const O_SURFACE  = "#F2E5DA";  // 浅粉米色
  const O_BORDER   = "#D6D5D8";  // 浅灰紫描边
  const O_SUB      = "#8A8074";  // 暖灰

  return (
    <div style={{ minHeight:"100%", background:O_BG, display:"flex", flexDirection:"column" }}>
      <div style={{ paddingTop:56, paddingBottom:20, textAlign:"center" }}>
        <div style={{ marginBottom:8, display:"flex", justifyContent:"center" }}><Logo size={96} /></div>
        <div style={{ fontSize:26, fontWeight:800, color:C.text, letterSpacing:-0.5 }}>爪爪日记</div>
        <div style={{ fontSize:12, color:O_SUB, marginTop:3 }}>告诉我们你的毛孩子</div>
      </div>
      <div style={{ padding:"0 28px", marginBottom:20 }}>
        <div style={{ display:"flex", gap:6, marginBottom:4 }}>
          {[1,2,3,4].map((i) => (
            <div key={i} style={{ flex:1, height:4, borderRadius:4, transition:"background .3s",
                                   background: i <= step ? "#E68645" : O_BORDER }} />
          ))}
        </div>
        <div style={{ textAlign:"center", fontSize:11, color:O_SUB }}>第 {step} / 4 步</div>
      </div>

      <div style={{ flex:1, padding:"0 18px 20px" }}>
        <div style={{ background:"white", border:"1.5px solid #7A6F62", borderRadius:28, padding:"22px 20px",
                      boxShadow:"0 6px 18px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.12)" }}>
          {step === 1 && <>
            <div style={{ fontSize:19, fontWeight:700, color:C.text, marginBottom:3 }}>你的毛孩子叫什么？</div>
            <div style={{ fontSize:12, color:O_SUB, marginBottom:20 }}>先来认识一下 🐶</div>
            <Label>宠物名字</Label>
            <Inp value={f.name} onChange={(e) => upd("name", e.target.value)} placeholder="比如：豆豆、可乐、花花..." />
            <Label style={{ marginTop:16 }}>狗狗品种</Label>
            <div style={{ position:"relative" }}>
              <select value={f.breed} onChange={(e) => upd("breed", e.target.value)}
                style={{ width:"100%", borderRadius:16, padding:"12px 16px", fontSize:14,
                         border:"1.5px solid #7A6F62", background:"#FFFFFF",
                         color:f.breed ? C.text : O_SUB, outline:"none", appearance:"none", boxSizing:"border-box" }}>
                <option value="">选择品种</option>
                {BREEDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
                             color:O_SUB, pointerEvents:"none", fontSize:12 }}>▾</span>
            </div>
          </>}

          {step === 2 && <>
            <div style={{ fontSize:19, fontWeight:700, color:C.text, marginBottom:3 }}>{f.name || "它"} 的基本情况？</div>
            <div style={{ fontSize:12, color:O_SUB, marginBottom:18 }}>帮助我们更好地了解 💛</div>
            <Label>毛孩子的生日 🎂</Label>
            <Inp value={f.birthday} onChange={(e) => upd("birthday", e.target.value)}
                 type="date" max={todayISO()} />
            <div style={{ fontSize:11, color:O_SUB, marginTop:6, lineHeight:1.6 }}>
              不知道准确生日也没关系，挑一个属于你们的纪念日就好 💛
            </div>
            <div style={{ display:"flex", gap:12, marginTop:16, marginBottom:16 }}>
              <div style={{ flex:1 }}>
                <Label>体重（kg）</Label>
                <Inp value={f.weight} onChange={(e) => upd("weight", e.target.value)} type="number" min="0" max="80" step="0.1" placeholder="8.5" />
              </div>
              <div style={{ flex:1 }}>
                <Label>性别</Label>
                <div style={{ display:"flex", gap:6 }}>
                  <button style={btnStyle(f.gender === "male")}   onClick={() => upd("gender","male")}>男孩</button>
                  <button style={btnStyle(f.gender === "female")} onClick={() => upd("gender","female")}>女孩</button>
                </div>
              </div>
            </div>
          </>}

          {step === 3 && <>
            <div style={{ fontSize:19, fontWeight:700, color:C.text, marginBottom:3 }}>{f.name || "它"} 是什么性格？✨</div>
            <div style={{ fontSize:12, color:O_SUB, marginBottom:18 }}>选一个最像 TA 的小性格</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {PERSONALITIES.map((p) => {
                const on = f.personality === p;
                return (
                  <button key={p} onClick={() => upd("personality", p)}
                    style={{ padding:"11px 10px", borderRadius:14, fontSize:13,
                             fontWeight: on ? 700 : 600,
                             background: on ? "#E68645" : "#FFFFFF",
                             color: on ? "white" : C.text,
                             border:`1.5px solid ${on ? "#E68645" : "#7A6F62"}`,
                             cursor:"pointer", transition:"all .15s" }}>
                    {p}
                  </button>
                );
              })}
            </div>
          </>}

          {step === 4 && <>
            <div style={{ fontSize:19, fontWeight:700, color:C.text, marginBottom:3 }}>最后两个问题 🌟</div>
            <div style={{ fontSize:12, color:O_SUB, marginBottom:20 }}>社交和健康分析会用到</div>
            <Label>是否已绝育</Label>
            <div style={{ display:"flex", gap:10, marginBottom:18 }}>
              <button style={btnStyle(f.neutered === "yes")} onClick={() => upd("neutered","yes")}>已绝育 ✅</button>
              <button style={btnStyle(f.neutered === "no")}  onClick={() => upd("neutered","no")}>未绝育</button>
            </div>
            <Label>疫苗是否齐全</Label>
            <div style={{ display:"flex", gap:10 }}>
              <button style={btnStyle(f.vaccinated === "yes")} onClick={() => upd("vaccinated","yes")}>已齐全 💉</button>
              <button style={btnStyle(f.vaccinated === "no")}  onClick={() => upd("vaccinated","no")}>未完成 ⚠️</button>
            </div>
          </>}
        </div>

        <button onClick={next} disabled={!ok || saving}
          style={{ marginTop:14, width:"100%", padding:"15px 0", borderRadius:20, fontSize:14, fontWeight:700,
                   background:ok && !saving ? "#E68645" : O_SURFACE, color:ok && !saving ? "white" : O_SUB,
                   border:ok && !saving ? "none" : `1px solid ${O_BORDER}`,
                   cursor:ok && !saving ? "pointer" : "default", transition:"all .2s" }}>
          {saving ? "保存中..." : step < TOTAL_STEPS ? "继续 →" : `开始和 ${f.name || "它"} 的旅程 🐾`}
        </button>
        <ErrBox msg={error} />
        {step > 1 && (
          <button onClick={() => setStep((s) => s - 1)}
            style={{ width:"100%", marginTop:8, padding:"10px 0", fontSize:12, color:O_SUB,
                     background:"transparent", border:"none", cursor:"pointer" }}>
            ← 返回修改
          </button>
        )}
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

function HomeTab({ user, pet, onPetUpdate }) {
  // 子页面：null | 'expenses' | 'recipes' | 'health' | 'news'
  const [subPage, setSubPage] = useState(null);
  const [monthExpense, setMonthExpense] = useState(null);
  const [todayRecipe,  setTodayRecipe]  = useState(null);
  const [latestNews,   setLatestNews]   = useState(null);
  const [avatarOpen,   setAvatarOpen]   = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const avatarSrc = pet.pet_avatar_thumb_url || pet.ai_avatar_url || null;
  useEffect(() => { setAvatarBroken(false); setAvatarLoaded(false); }, [pet?.id, avatarSrc]);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    getMonthlyTotal(user.id).then((v) => { if (alive) setMonthExpense(v); }).catch(() => {});
    getTodayRecipe().then((r) => { if (alive) setTodayRecipe(r); }).catch(() => {});
    getLatestNews().then((n) => { if (alive) setLatestNews(n); }).catch(() => {});
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

  const [bt, setBt]         = useState("08:00");
  const [dt, setDt]         = useState("18:00");
  const [editFeed, setEdit] = useState(false);
  const [uplType, setUpl]   = useState(null);
  const [loading, setLoad]  = useState(false);
  const [result, setResult] = useState(null);
  const [feedError, setFeedError]     = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const hungry = isHungry(bt, dt);

  const handleSaveFeed = async () => {
    if (editFeed) {
      try {
        await saveFeedingRecord({ pet_id: pet.id, breakfast: bt, dinner: dt });
        setFeedError(null);
      } catch (err) {
        setFeedError(err.message);
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

  if (subPage === "expenses") {
    return <ExpensePage user={user} pets={pet ? [pet] : []} onBack={() => setSubPage(null)} />;
  }
  if (subPage === "recipes") {
    return <RecipePage onBack={() => setSubPage(null)} />;
  }
  if (subPage === "health") {
    return <HealthPage user={user} pet={pet} onPetUpdate={onPetUpdate} onBack={() => setSubPage(null)} />;
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
      <div style={{ background:H_BG, borderBottom:`1px solid ${H_BORDER}`, padding:"52px 20px 24px",
                    position:"relative", overflow:"hidden" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
            <Logo size={32} />
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
          <div style={{ position:"relative", padding:"4px 10px" }}>
            {avatarSrc && !avatarBroken ? (
              <div style={{ width:140, height:140, borderRadius:"50%", overflow:"hidden", flexShrink:0,
                            background:H_SURFACE,
                            boxShadow:"0 8px 22px rgba(230,134,69,0.22)",
                            animation:"float 3s ease-in-out infinite" }}>
                <img src={avatarSrc} alt={pet.name}
                  fetchPriority="high"
                  onLoad={() => setAvatarLoaded(true)}
                  onError={() => setAvatarBroken(true)}
                  style={{ width:"100%", height:"100%", objectFit:"cover", display:"block",
                           opacity: avatarLoaded ? 1 : 0,
                           transition:"opacity 0.45s ease" }} />
              </div>
            ) : (
              <div style={{ fontSize:120, lineHeight:1,
                            animation:"float 3s ease-in-out infinite",
                            filter:"drop-shadow(0 6px 12px rgba(230,134,69,0.18))" }}>
                🐶
              </div>
            )}
            <button onClick={() => setAvatarOpen(true)}
              title="生成 AI 专属头像"
              style={{ position:"absolute", bottom:6, right:6,
                       width:34, height:34, borderRadius:"50%",
                       background:C.pri, border:"2.5px solid white",
                       color:"white", fontSize:16, cursor:"pointer",
                       boxShadow:"0 3px 10px rgba(230,134,69,0.4)",
                       display:"flex", alignItems:"center", justifyContent:"center",
                       padding:0, lineHeight:1 }}>
              ✨
            </button>
            {hungry && (
              <div style={{ position:"absolute", top:0, right:-4, background:C.accent, borderRadius:20,
                            padding:"3px 9px", fontSize:10, fontWeight:700, color:"white",
                            boxShadow:"0 2px 10px rgba(230,134,69,0.35)" }}>
                😋 饿了
              </div>
            )}
          </div>
          <div style={{ marginTop:12, fontSize:20, fontWeight:800, color:C.text }}>{pet.name}</div>
          <div style={{ fontSize:12, color:H_SUB, marginTop:3 }}>
            {pet.breed} · {ageLabel} · {pet.weight}kg · {pet.gender === "male" ? "男孩" : "女孩"}
          </div>
          {(birthdayLabel || pet.personality) && (
            <div style={{ fontSize:11, color:H_SUB, marginTop:4 }}>
              {birthdayLabel && <span>🎂 {birthdayLabel}</span>}
              {birthdayLabel && pet.personality && <span style={{ margin:"0 6px" }}>·</span>}
              {pet.personality && <span>✨ {pet.personality}</span>}
            </div>
          )}
          {hungry && (
            <div style={{ marginTop:12, background:H_SURFACE, border:`1px solid ${H_BORDER}`,
                          borderRadius:20, padding:"8px 18px", fontSize:13, color:C.accent, fontWeight:600 }}>
              🍖 我有点饿啦，记得喂我哦！
            </div>
          )}
        </div>
      </div>

      <div style={{ padding:"14px 14px 90px" }}>
        {/* 3 个入口卡：记账 / 食谱 / 健康 */}
        <div style={{ display:"flex", gap:10, marginBottom:12 }}>
          <HomeNavCard
            icon="💰" label="宠物记账"
            value={monthExpense == null ? "—" : `¥${Number(monthExpense).toFixed(0)}`}
            sub="本月"
            onClick={() => setSubPage("expenses")}
            H_BORDER={H_BORDER} H_SHADOW={H_SHADOW} H_SUB={H_SUB} tint={C.tint} text={C.text} />
          <HomeNavCard
            icon="🍱" label="宠物食谱"
            value={todayRecipe?.title || "看看推荐"}
            sub="今日推荐"
            single
            onClick={() => setSubPage("recipes")}
            H_BORDER={H_BORDER} H_SHADOW={H_SHADOW} H_SUB={H_SUB} tint={C.tint} text={C.text} />
          <HomeNavCard
            icon="🏥" label="宠物健康"
            value={(pet?.neutered ? "已绝育" : "未绝育")}
            sub={pet?.vaccinated ? "疫苗齐全" : "疫苗待补"}
            onClick={() => setSubPage("health")}
            H_BORDER={H_BORDER} H_SHADOW={H_SHADOW} H_SUB={H_SUB} tint={C.tint} text={C.text} />
        </div>

        {/* Feeding */}
        <div style={{ background:"white", border:`1px solid ${H_BORDER}`, borderRadius:20,
                      padding:16, marginBottom:12, boxShadow:H_SHADOW }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18 }}>🍽️</span>
              <span style={{ fontSize:14, fontWeight:700, color:C.text }}>喂食计划</span>
            </div>
            <button onClick={handleSaveFeed}
              style={{ fontSize:11, background:H_SURFACE, color:C.accent,
                       border:`1px solid ${H_BORDER}`, borderRadius:20,
                       padding:"4px 13px", cursor:"pointer", fontWeight:600 }}>
              {editFeed ? "完成 ✓" : "设置"}
            </button>
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:12 }}>
            {[["🌅","早饭",bt,setBt],["🌆","晚饭",dt,setDt]].map(([em, lbl, val, setter]) => (
              <div key={lbl} style={{ flex:1, background:H_SURFACE, border:`1px solid ${H_BORDER}`,
                                       borderRadius:14, padding:12 }}>
                <div style={{ fontSize:11, color:H_SUB, marginBottom:5 }}>{em} {lbl}</div>
                {editFeed
                  ? <input type="time" value={val} onChange={(e) => setter(e.target.value)}
                      style={{ fontSize:16, fontWeight:700, color:C.text, background:"transparent",
                               border:"none", outline:"none", width:"100%" }}/>
                  : <div style={{ fontSize:16, fontWeight:700, color:C.text }}>{val}</div>}
              </div>
            ))}
          </div>
          <div style={{ background:C.tint, border:`1px solid ${H_BORDER}`,
                        borderLeft:`3px solid ${C.accent}`, borderRadius:14, padding:12 }}>
            <div style={{ fontSize:11, color:H_SUB }}>推荐喂食量（每次）</div>
            <div style={{ fontSize:17, fontWeight:800, color:C.accent, marginTop:3 }}>{feedAmt(pet.weight)}</div>
            <div style={{ fontSize:10, color:H_SUB, marginTop:4 }}>基于体重 {pet.weight}kg 估算 · 仅供参考</div>
          </div>
          <ErrBox msg={feedError} />
        </div>

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
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HOME NAV CARD — 首页 3 个入口的统一样式
══════════════════════════════════════════════════════════════ */
function HomeNavCard({ icon, label, value, sub, single, onClick, H_BORDER, H_SHADOW, H_SUB, tint, text }) {
  return (
    <button onClick={onClick}
      style={{ flex:1, background:"white", border:`1px solid ${H_BORDER}`,
               borderRadius:16, padding:"12px 8px",
               boxShadow:H_SHADOW, cursor:"pointer",
               display:"flex", flexDirection:"column", alignItems:"center",
               gap:6, minWidth:0 }}>
      <div style={{ width:34, height:34, borderRadius:"50%", background:tint,
                    display:"inline-flex", alignItems:"center", justifyContent:"center",
                    fontSize:18, lineHeight:1 }}>{icon}</div>
      <div style={{ fontSize:10, color:H_SUB }}>{label}</div>
      <div style={{ fontSize: single ? 11 : 12, fontWeight:700, color:text, marginTop:1,
                    maxWidth:"100%", overflow:"hidden", textOverflow:"ellipsis",
                    whiteSpace:"nowrap", padding:"0 2px" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize:9, color:H_SUB }}>{sub}</div>
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
   SOCIAL TAB
══════════════════════════════════════════════════════════════ */
function SocialTab() {
  const [inv, setInv] = useState(new Set());

  return (
    <div style={{ height:"100%", overflowY:"auto", background:C.bg }}>
      <div style={{ background:"white", padding:"52px 18px 16px" }}>
        <div style={{ fontSize:20, fontWeight:800, color:C.text, display:"flex", alignItems:"center", gap:8 }}>
          <PawIcon size={20} color="#E68645" /> 附近狗狗
        </div>
        <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>找到附近的狗友，一起遛弯</div>
      </div>
      <div style={{ margin:"12px 14px 0", background:C.tint, border:`1px solid #E5E7EB`,
                    borderRadius:16, padding:"10px 14px", display:"flex", gap:8 }}>
        <span style={{ fontSize:14 }}>ℹ️</span>
        <div style={{ fontSize:11, color:C.sub, lineHeight:1.65 }}>
          正式功能上线后需上传<span style={{ color:C.accent, fontWeight:600 }}>疫苗证明</span>和
          <span style={{ color:C.accent, fontWeight:600 }}>狗证</span>，当前为 Demo 展示阶段。
        </div>
      </div>
      <div style={{ padding:"12px 14px 88px" }}>
        {DOGS.map((dog) => (
          <div key={dog.id} style={{ ...cardStyle }}>
            <div style={{ display:"flex", gap:12 }}>
              <div style={{ width:60, height:60, borderRadius:18,
                            background:`linear-gradient(135deg,${C.tint},#CDE9EE)`,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:32, flexShrink:0 }}>
                {dog.av}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{dog.name}</div>
                  <div style={{ fontSize:11, color:C.sub }}>📍 {dog.km}km</div>
                </div>
                <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>{dog.breed} · {dog.age} · 主人：{dog.owner}</div>
                <div style={{ fontSize:11, color:C.accent, fontWeight:600, marginTop:4 }}>⏰ {dog.walk} 遛弯</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:6, marginTop:12, flexWrap:"wrap" }}>
              {[
                { lbl:dog.neut ? "已绝育" : "未绝育", ok:dog.neut },
                { lbl:dog.vacc ? "疫苗齐全" : "疫苗未齐", ok:dog.vacc },
              ].map((b) => (
                <span key={b.lbl} style={{ fontSize:11, background:b.ok?"#F0FFF4":"#FFF5F5",
                                           color:b.ok?"#4CAF50":"#F44336", padding:"4px 10px",
                                           borderRadius:20, fontWeight:600 }}>
                  {b.ok ? "✓" : "✗"} {b.lbl}
                </span>
              ))}
              <span style={{ fontSize:11, background:C.tint, color:C.accent, padding:"4px 10px", borderRadius:20 }}>
                💝 {dog.likes}
              </span>
            </div>
            <div style={{ fontSize:12, color:C.sub, marginTop:8 }}>🎭 性格：{dog.char}</div>
            {inv.has(dog.id)
              ? <div style={{ marginTop:12, padding:"11px 0", background:"#F0FFF4", borderRadius:14,
                              textAlign:"center", fontSize:13, color:"#4CAF50", fontWeight:600 }}>
                  ✅ 邀请已发送，等待对方主人同意
                </div>
              : <button onClick={() => setInv((p) => new Set([...p, dog.id]))}
                  style={{ marginTop:12, width:"100%", padding:"12px 0", borderRadius:14,
                           background:C.grad, color:"white", fontSize:13, fontWeight:700,
                           border:"none", cursor:"pointer",
                           display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <PawIcon size={16} color="#FFFFFF" /> 邀请一起散步
                </button>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   APP SHELL
   状态机：loading → login → onboarding → app
   user_id 持久化至 localStorage("tailme_user_id")
══════════════════════════════════════════════════════════════ */
const TABS = [
  { icon:"🐾", label:"狗友" },
  { icon:"🗺️", label:"地图" },
  { home:true, label:"首页" },
  { icon:"💬", label:"社群" },
  { icon:"👤", label:"我的" },
];

// 状态：loading | login | onboarding | app
const S = { LOADING:"loading", LOGIN:"login", ONBOARDING:"onboarding", USERNAME:"username", APP:"app" };
const LS_KEY = "tailme_user_id";

export default function AppRoot() {
  const [screen, setScreen] = useState(S.LOADING);
  const [user, setUser]     = useState(null);   // 完整 user 对象（含 username/role）
  const [pet, setPet]       = useState(null);
  const [tab, setTab]       = useState(2);   // 默认中间的首页

  const userId = user?.id ?? null;

  /* 状态分发：拿到 user + pets 之后决定下一步 */
  const routeAfterLoad = (loadedUser, pets) => {
    setUser(loadedUser);
    if (!pets || pets.length === 0) { setScreen(S.ONBOARDING); return; }
    setPet(pets[0]);
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

  /* 宠物创建成功 → 检查 username 是否已设 */
  const handlePetCreated = (newPet) => {
    setPet(newPet);
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
    setUser(null);
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
  if (screen === S.ONBOARDING) return shell(<Onboarding userId={userId} onComplete={handlePetCreated} />, true);
  if (screen === S.USERNAME)   return shell(<UsernameSetup userId={userId} onComplete={handleUsernameSet} />, false);

  // S.APP
  return shell(
    <>
      <div style={{ position:"absolute", top:0, left:0, right:0, bottom:60, overflow:"hidden" }}>
        {tab === 0 && <SocialTab />}
        {tab === 1 && <MapTab />}
        {tab === 2 && <HomeTab user={user} pet={pet} onPetUpdate={setPet} />}
        {tab === 3 && <CommunityTab user={user} pet={pet} />}
        {tab === 4 && <ProfileTab user={user} pet={pet} onLogout={handleLogout} />}
      </div>
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:60,
                    background:"white", borderTop:`1px solid ${C.border}`, display:"flex", zIndex:100 }}>
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
              <div style={{ fontSize:20, lineHeight:1, height:20, display:"flex", alignItems:"center",
                            filter: t.label === "狗友" ? "none" : (tab===i ? "none" : "grayscale(1) opacity(0.5)") }}>
                {t.label === "狗友"
                  ? <PawIcon size={20} color={tab===i ? "#E68645" : "#C5C8CE"} />
                  : t.icon}
              </div>
            )}
            <div style={{ fontSize:10, fontWeight:tab===i ? 700 : 500,
                          color:tab===i ? C.pri : "#8A8074", transition:"color .15s",
                          marginTop:t.home ? 2 : 0 }}>{t.label}</div>
            {tab === i && !t.home && <div style={{ width:18, height:2.5, borderRadius:4, background:C.grad, marginTop:1 }}/>}
          </button>
        ))}
      </div>
    </>
  );
}
