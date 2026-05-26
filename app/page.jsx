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
  saveFeedingRecord,
  saveHealthUpload,
} from "@/services/supabaseService";
import MapTab from "@/components/map/MapTab";

/* ══════════════════════════════════════════════════════════════
   未来接入真实服务的 stub（聊天 / AI）
   地图已迁移至 components/map/MapTab.jsx（高德 JS API）
══════════════════════════════════════════════════════════════ */
const chatService = {
  sendMessage: async () => {},
};
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

const CHATS = {
  "腊肠犬群": { count:1243, msgs:[
    { id:1, u:"Lucy妈咪",   av:"🐾", t:"14:32", m:"我家腊肠最近有点挑食，你们也会这样吗？" },
    { id:2, u:"热狗老爸",   av:"🌭", t:"14:35", m:"可以试试少量鸡胸肉拌粮，我家豆豆超爱！" },
    { id:3, u:"小饺子主人", av:"🥟", t:"14:38", m:"周末有人一起去梧桐树下那家咖啡吗？！" },
    { id:4, u:"Lucy妈咪",   av:"🐾", t:"14:40", m:"我要去！贝贝最近需要多出门社交 🐕" },
    { id:5, u:"小香肠爸",   av:"🍖", t:"14:45", m:"腊肠背部要注意，不要让他们跳高台阶哦" },
  ]},
  "柴犬群": { count:2341, msgs:[
    { id:1, u:"柴警察局",   av:"🚔", t:"13:10", m:"我家柴犬今天换了新粮，满地打滚不吃 😂" },
    { id:2, u:"橘子皮皮",   av:"🍊", t:"13:15", m:"太正常了！新旧粮要慢慢混合过渡～" },
    { id:3, u:"小花椒",     av:"🌶️", t:"13:22", m:"大家推荐浦东哪里遛柴犬吗？" },
    { id:4, u:"阿福主人",   av:"🦊", t:"13:30", m:"世纪公园超棒！早上7点前基本可以不牵绳 🌳" },
  ]},
  "柯基群": { count:1876, msgs:[
    { id:1, u:"屁股观察员", av:"🍑", t:"12:05", m:"柯基的小屁股真的治愈一切烦恼 ✨" },
    { id:2, u:"面包超人",   av:"🍞", t:"12:08", m:"同意！每天看他走路就心情好" },
    { id:3, u:"可乐柯基妈", av:"🥤", t:"12:15", m:"我家可乐今天学会接飞盘了！激动！" },
    { id:4, u:"屁股观察员", av:"🍑", t:"12:20", m:"好厉害！我家那个只会追不会接 😂" },
  ]},
  "金毛群": { count:3241, msgs:[
    { id:1, u:"阳光团长",   av:"☀️", t:"11:30", m:"金毛真的太粘人了，上厕所都要跟着 😂" },
    { id:2, u:"小黄人爸",   av:"💛", t:"11:35", m:"这不是优点吗！我超爱被粘" },
    { id:3, u:"黄油面包",   av:"🧈", t:"11:42", m:"大家金毛一天喂几顿？我家喂两次感觉总是很饿" },
    { id:4, u:"阳光团长",   av:"☀️", t:"11:50", m:"金毛这品种本来就很馋，两次够了哈哈" },
  ]},
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
  pri:"#FF7A5A", grad:"linear-gradient(135deg,#FF7A5A 0%,#FFB347 100%)",
  bg:"#FFFBF4", card:"#FFFFFF", text:"#1A1006", sub:"#9B8B76",
  light:"#FFF8ED", border:"#F0E8D8",
};
const cardStyle = { background:C.card, borderRadius:20, padding:16, marginBottom:12, boxShadow:"0 2px 14px rgba(0,0,0,0.05)" };
const btnStyle  = (active) => ({
  background: active ? C.grad : C.light, color: active ? "#fff" : "#5A4A35",
  border:`1.5px solid ${active ? C.pri : C.border}`, borderRadius:16,
  padding:"10px 0", fontSize:13, fontWeight:600, cursor:"pointer", flex:1, transition:"all .2s",
});

/* ══════════════════════════════════════════════════════════════
   SHARED WIDGETS
══════════════════════════════════════════════════════════════ */
const Label = ({ children, style }) => (
  <div style={{ fontSize:12, fontWeight:600, color:"#5A4A35", marginBottom:8, ...style }}>{children}</div>
);
const Inp = (props) => (
  <input {...props} style={{ width:"100%", borderRadius:16, padding:"12px 14px", fontSize:14,
    border:`1.5px solid ${C.border}`, background:C.light, color:C.text, outline:"none",
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
                  justifyContent:"center", background:"linear-gradient(160deg,#FFF8ED 0%,#FFE4B5 50%,#FFDAB9 100%)" }}>
      <div style={{ fontSize:52, marginBottom:16, animation:"float 3s ease-in-out infinite" }}>🐾</div>
      <div style={{ fontSize:20, fontWeight:800, color:C.text }}>爪爪日记</div>
      <div style={{ fontSize:12, color:C.sub, marginTop:6 }}>正在加载...</div>
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

  return (
    <div style={{ height:"100%", background:"linear-gradient(160deg,#FFF8ED 0%,#FFE4B5 50%,#FFDAB9 100%)",
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 28px" }}>
      <div style={{ fontSize:52, marginBottom:12 }}>🐾</div>
      <div style={{ fontSize:26, fontWeight:800, color:C.text, marginBottom:4 }}>爪爪日记</div>
      <div style={{ fontSize:12, color:C.sub, marginBottom:36 }}>TailMe · 让陪伴更懂你</div>

      <div style={{ width:"100%", background:"white", borderRadius:28, padding:"28px 24px",
                    boxShadow:"0 6px 30px rgba(255,122,90,0.12)" }}>
        {step === 1 ? (
          <>
            <div style={{ fontSize:18, fontWeight:700, color:C.text, marginBottom:4 }}>手机号登录</div>
            <div style={{ fontSize:12, color:C.sub, marginBottom:22 }}>
              新用户自动注册，老用户直接进入
            </div>
            <Label>手机号</Label>
            <div style={{ display:"flex", gap:10, marginBottom:4 }}>
              <div style={{ background:C.light, borderRadius:16, padding:"12px 14px", fontSize:14,
                            color:C.sub, border:`1.5px solid ${C.border}`, whiteSpace:"nowrap" }}>
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
                       fontWeight:700, background:isValidPhone ? C.grad : "#F0E8D8",
                       color:isValidPhone ? "white" : "#C0A890", border:"none",
                       cursor:isValidPhone ? "pointer" : "default", transition:"all .2s" }}>
              获取验证码
            </button>
          </>
        ) : (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <button onClick={() => { setStep(1); setCode(""); setError(null); }}
                style={{ background:"transparent", border:"none", fontSize:18, cursor:"pointer", color:C.sub }}>
                ←
              </button>
              <div style={{ fontSize:18, fontWeight:700, color:C.text }}>输入验证码</div>
            </div>
            <div style={{ fontSize:12, color:C.sub, marginBottom:22 }}>
              已发送至 +86 {phone}
              <span style={{ marginLeft:8, color:C.pri, fontWeight:600, fontSize:11 }}>
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
                       fontWeight:700, background:!loading && code.length >= 6 ? C.grad : "#F0E8D8",
                       color:!loading && code.length >= 6 ? "white" : "#C0A890",
                       border:"none", cursor:!loading && code.length >= 6 ? "pointer" : "default",
                       transition:"all .2s" }}>
              {loading ? "验证中..." : "登录 / 注册"}
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop:20, fontSize:11, color:"#C0A890", textAlign:"center", lineHeight:1.7 }}>
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
  const [f, setF]           = useState({ name:"", breed:"", age:"", weight:"", gender:"", neutered:"", vaccinated:"" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const ok  = [f.name && f.breed, f.age && f.weight && f.gender, f.neutered && f.vaccinated][step - 1];

  const next = async () => {
    if (step < 3) { setStep((s) => s + 1); return; }
    setSaving(true);
    setError(null);
    try {
      // 真实 INSERT，绑定 userId，service 层处理 boolean 转换
      const savedPet = await savePetProfile(f, userId);
      onComplete(savedPet);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight:"100%", background:"linear-gradient(160deg,#FFF8ED 0%,#FFE4B5 50%,#FFDAB9 100%)",
                  display:"flex", flexDirection:"column" }}>
      <div style={{ paddingTop:56, paddingBottom:20, textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:8 }}>🐾</div>
        <div style={{ fontSize:26, fontWeight:800, color:C.text, letterSpacing:-0.5 }}>爪爪日记</div>
        <div style={{ fontSize:12, color:C.sub, marginTop:3 }}>告诉我们你的毛孩子</div>
      </div>
      <div style={{ padding:"0 28px", marginBottom:20 }}>
        <div style={{ display:"flex", gap:6, marginBottom:4 }}>
          {[1,2,3].map((i) => (
            <div key={i} style={{ flex:1, height:4, borderRadius:4, transition:"background .3s",
                                   background: i <= step ? C.pri : "#FFD9C8" }} />
          ))}
        </div>
        <div style={{ textAlign:"center", fontSize:11, color:C.sub }}>第 {step} / 3 步</div>
      </div>

      <div style={{ flex:1, padding:"0 18px 20px" }}>
        <div style={{ background:"white", borderRadius:28, padding:"22px 20px",
                      boxShadow:"0 6px 30px rgba(255,122,90,0.1)" }}>
          {step === 1 && <>
            <div style={{ fontSize:19, fontWeight:700, color:C.text, marginBottom:3 }}>你的毛孩子叫什么？</div>
            <div style={{ fontSize:12, color:C.sub, marginBottom:20 }}>先来认识一下 🐶</div>
            <Label>宠物名字</Label>
            <Inp value={f.name} onChange={(e) => upd("name", e.target.value)} placeholder="比如：豆豆、可乐、花花..." />
            <Label style={{ marginTop:16 }}>狗狗品种</Label>
            <div style={{ position:"relative" }}>
              <select value={f.breed} onChange={(e) => upd("breed", e.target.value)}
                style={{ width:"100%", borderRadius:16, padding:"12px 16px", fontSize:14,
                         border:`1.5px solid ${C.border}`, background:C.light,
                         color:f.breed ? C.text : C.sub, outline:"none", appearance:"none", boxSizing:"border-box" }}>
                <option value="">选择品种</option>
                {BREEDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
                             color:C.sub, pointerEvents:"none", fontSize:12 }}>▾</span>
            </div>
          </>}

          {step === 2 && <>
            <div style={{ fontSize:19, fontWeight:700, color:C.text, marginBottom:3 }}>{f.name || "它"} 的基本情况？</div>
            <div style={{ fontSize:12, color:C.sub, marginBottom:20 }}>帮助我们更好地了解 💛</div>
            <div style={{ display:"flex", gap:12, marginBottom:16 }}>
              <div style={{ flex:1 }}>
                <Label>年龄（岁）</Label>
                <Inp value={f.age} onChange={(e) => upd("age", e.target.value)} type="number" min="0" max="20" placeholder="2" />
              </div>
              <div style={{ flex:1 }}>
                <Label>体重（kg）</Label>
                <Inp value={f.weight} onChange={(e) => upd("weight", e.target.value)} type="number" min="0" max="80" step="0.1" placeholder="8.5" />
              </div>
            </div>
            <Label>性别</Label>
            <div style={{ display:"flex", gap:10 }}>
              <button style={btnStyle(f.gender === "male")}   onClick={() => upd("gender","male")}>男孩 🐶</button>
              <button style={btnStyle(f.gender === "female")} onClick={() => upd("gender","female")}>女孩 🎀</button>
            </div>
          </>}

          {step === 3 && <>
            <div style={{ fontSize:19, fontWeight:700, color:C.text, marginBottom:3 }}>最后两个问题 🌟</div>
            <div style={{ fontSize:12, color:C.sub, marginBottom:20 }}>社交和健康分析会用到</div>
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
                   background:ok && !saving ? C.grad : "#F0E8D8", color:ok && !saving ? "white" : "#C0A890",
                   border:"none", cursor:ok && !saving ? "pointer" : "default", transition:"all .2s" }}>
          {saving ? "保存中..." : step < 3 ? "继续 →" : `开始和 ${f.name || "它"} 的旅程 🐾`}
        </button>
        <ErrBox msg={error} />
        {step > 1 && (
          <button onClick={() => setStep((s) => s - 1)}
            style={{ width:"100%", marginTop:8, padding:"10px 0", fontSize:12, color:C.sub,
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
   HOME TAB
══════════════════════════════════════════════════════════════ */
function HomeTab({ pet }) {
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
  const H_BG       = "#FFFFFF";
  const H_SURFACE  = "#F7F8FA";  // 浅灰填充（替代原 C.light 暖黄）
  const H_BORDER   = "#ECEEF2";  // 冷调描边（替代原 C.border 米黄）
  const H_SUB      = "#8A8F98";  // 次级文字（替代暖灰 C.sub）

  return (
    <div style={{ height:"100%", overflowY:"auto", background:H_BG }}>
      <div style={{ background:H_BG, borderBottom:`1px solid ${H_BORDER}`, padding:"52px 20px 24px",
                    position:"relative", overflow:"hidden" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
          <div>
            <div style={{ fontSize:10, color:H_SUB, marginBottom:2, letterSpacing:0.5 }}>爪爪日记 TailMe</div>
            <div style={{ fontSize:20, fontWeight:800, color:C.text }}>嗨，{pet.name} 👋</div>
          </div>
          <a href="/admin" style={{ width:38, height:38, borderRadius:"50%", background:H_SURFACE,
                                    border:`1px solid ${H_BORDER}`,
                                    display:"flex", alignItems:"center", justifyContent:"center",
                                    fontSize:16, textDecoration:"none" }}>🔔</a>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
          <div style={{ position:"relative" }}>
            <div style={{ width:108, height:108, borderRadius:"50%",
                          background:C.grad,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:60, animation:"float 3s ease-in-out infinite",
                          boxShadow:"0 8px 24px rgba(255,122,90,0.25)" }}>
              🐶
            </div>
            {hungry && (
              <div style={{ position:"absolute", top:-6, right:-6, background:C.pri, borderRadius:20,
                            padding:"3px 9px", fontSize:10, fontWeight:700, color:"white",
                            boxShadow:"0 2px 10px rgba(255,122,90,0.35)" }}>
                😋 饿了
              </div>
            )}
          </div>
          <div style={{ marginTop:12, fontSize:20, fontWeight:800, color:C.text }}>{pet.name}</div>
          <div style={{ fontSize:12, color:H_SUB, marginTop:3 }}>
            {pet.breed} · {pet.age}岁 · {pet.weight}kg · {pet.gender === "male" ? "男孩" : "女孩"}
          </div>
          {hungry && (
            <div style={{ marginTop:12, background:H_SURFACE, border:`1px solid ${H_BORDER}`,
                          borderRadius:20, padding:"8px 18px", fontSize:13, color:C.pri, fontWeight:600 }}>
              🍖 我有点饿啦，记得喂我哦！
            </div>
          )}
        </div>
      </div>

      <div style={{ padding:"14px 14px 90px" }}>
        {/* Quick stats */}
        <div style={{ display:"flex", gap:10, marginBottom:12 }}>
          {[
            ["💪","今日状态","活力满满"],
            ["💉","疫苗", pet.vaccinated ? "已齐全" : "未完成"],
            [pet.neutered ? "✅" : "⭕","绝育", pet.neutered ? "已绝育" : "未绝育"],
          ].map(([ico, lbl, val], i) => (
            <div key={i} style={{ flex:1, background:"white", border:`1px solid ${H_BORDER}`,
                                   borderRadius:16, padding:"12px 6px", textAlign:"center" }}>
              <div style={{ fontSize:18 }}>{ico}</div>
              <div style={{ fontSize:10, color:H_SUB, marginTop:4 }}>{lbl}</div>
              <div style={{ fontSize:11, fontWeight:700, color:C.text, marginTop:2 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Feeding */}
        <div style={{ background:"white", border:`1px solid ${H_BORDER}`, borderRadius:20,
                      padding:16, marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18 }}>🍽️</span>
              <span style={{ fontSize:14, fontWeight:700, color:C.text }}>喂食计划</span>
            </div>
            <button onClick={handleSaveFeed}
              style={{ fontSize:11, background:H_SURFACE, color:C.pri,
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
          <div style={{ background:H_SURFACE, border:`1px solid ${H_BORDER}`,
                        borderLeft:`3px solid ${C.pri}`, borderRadius:14, padding:12 }}>
            <div style={{ fontSize:11, color:H_SUB }}>推荐喂食量（每次）</div>
            <div style={{ fontSize:17, fontWeight:800, color:C.pri, marginTop:3 }}>{feedAmt(pet.weight)}</div>
            <div style={{ fontSize:10, color:H_SUB, marginTop:4 }}>基于体重 {pet.weight}kg 估算 · 仅供参考</div>
          </div>
          <ErrBox msg={feedError} />
        </div>

        {/* AI Upload */}
        <div style={{ background:"white", border:`1px solid ${H_BORDER}`, borderRadius:20,
                      padding:16, marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ fontSize:18 }}>🔬</span>
            <span style={{ fontSize:14, fontWeight:700, color:C.text }}>AI 健康分析</span>
            <span style={{ marginLeft:"auto", fontSize:10, background:H_SURFACE, color:C.pri,
                           border:`1px solid ${H_BORDER}`,
                           padding:"2px 9px", borderRadius:20, fontWeight:600 }}>Beta</span>
          </div>
          <div style={{ fontSize:11, color:H_SUB, marginBottom:14 }}>上传照片，AI 帮你初步分析健康状况</div>
          <div style={{ display:"flex", gap:8 }}>
            {[["food","🥩","食物照片"],["poop","💩","便便照片"],["other","🔍","分泌物"]].map(([key, em, lbl]) => (
              <button key={key} onClick={() => handleUpload(key)}
                style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
                         padding:"12px 6px", borderRadius:16,
                         background:uplType === key ? "#FFF3E0" : H_SURFACE,
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
            <div style={{ marginTop:14, borderRadius:16, padding:16, background:H_SURFACE, border:`1px solid ${H_BORDER}` }}>
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
   MAP TAB — 已迁移至 components/map/MapTab.jsx
   使用高德 JS API，动态加载，无 SSR 报错。
   import MapTab from "@/components/map/MapTab" (顶部已导入)
══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   COMMUNITY TAB
══════════════════════════════════════════════════════════════ */
function CommunityTab({ pet }) {
  const groups  = Object.keys(CHATS);
  const defG    = pet?.breed && CHATS[`${pet.breed}群`] ? `${pet.breed}群` : groups[0];
  const [ag, setAg]     = useState(defG);
  const [msgs, setMsgs] = useState(() => {
    const m = {};
    groups.forEach((g) => { m[g] = [...CHATS[g].msgs]; });
    return m;
  });
  const [inp, setInp] = useState("");
  const chatRef = useRef();

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [msgs, ag]);

  const send = async () => {
    if (!inp.trim()) return;
    const newMsg = {
      id: Date.now(), u:`${pet?.name || "我"}的主人`, av:"😊",
      t: new Date().toLocaleTimeString("zh", { hour:"2-digit", minute:"2-digit" }),
      m: inp.trim(), own: true,
    };
    setMsgs((p) => ({ ...p, [ag]: [...p[ag], newMsg] }));
    await chatService.sendMessage(ag, inp.trim());
    setInp("");
  };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:C.bg }}>
      <div style={{ background:"white", padding:"52px 18px 0", flexShrink:0 }}>
        <div style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:2 }}>💬 宠物社群</div>
        <div style={{ fontSize:12, color:C.sub, marginBottom:12 }}>同品种交流，找到你的狗友</div>
        <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:12, scrollbarWidth:"none" }}>
          {groups.map((g) => (
            <button key={g} onClick={() => setAg(g)}
              style={{ flexShrink:0, padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600,
                       cursor:"pointer", transition:"all .2s",
                       background:ag===g ? C.grad : C.light, color:ag===g ? "white" : "#5A4A35",
                       border:`1.5px solid ${ag===g ? "transparent" : C.border}` }}>
              {g}
            </button>
          ))}
        </div>
      </div>
      <div style={{ background:"#FFF8ED", padding:"7px 18px", borderBottom:`1px solid ${C.border}`,
                    flexShrink:0, display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:13, fontWeight:700, color:C.text }}>🐕 {ag}</span>
        <span style={{ fontSize:11, color:C.sub }}>{CHATS[ag]?.count.toLocaleString()} 人在群里</span>
      </div>
      <div ref={chatRef} style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
        {(msgs[ag] || []).map((msg) => (
          <div key={msg.id} style={{ display:"flex", gap:10, marginBottom:14,
                                     flexDirection:msg.own ? "row-reverse" : "row" }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background:"#FFF3E0",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:16, flexShrink:0 }}>
              {msg.av}
            </div>
            <div style={{ maxWidth:"72%", display:"flex", flexDirection:"column",
                          alignItems:msg.own ? "flex-end" : "flex-start" }}>
              {!msg.own && <div style={{ fontSize:11, color:C.sub, marginBottom:3, paddingLeft:4 }}>{msg.u}</div>}
              <div style={{ padding:"10px 14px", fontSize:13, lineHeight:1.55,
                            borderRadius:msg.own ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                            background:msg.own ? C.grad : "white", color:msg.own ? "white" : C.text,
                            boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
                {msg.m}
              </div>
              <div style={{ fontSize:10, color:"#C0A890", marginTop:3, paddingLeft:4, paddingRight:4 }}>{msg.t}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background:"white", borderTop:`1px solid ${C.border}`, padding:"10px 14px 18px",
                    display:"flex", gap:10, flexShrink:0 }}>
        <input value={inp} onChange={(e) => setInp(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={`和 ${ag} 的朋友聊聊...`}
          style={{ flex:1, borderRadius:22, padding:"10px 16px", fontSize:13,
                   border:`1.5px solid ${C.border}`, background:"#FAFAFA", color:C.text, outline:"none" }}/>
        <button onClick={send}
          style={{ width:40, height:40, borderRadius:"50%", background:C.grad, border:"none",
                   cursor:"pointer", color:"white", fontSize:16, flexShrink:0,
                   display:"flex", alignItems:"center", justifyContent:"center" }}>
          ➤
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SOCIAL TAB
══════════════════════════════════════════════════════════════ */
function SocialTab() {
  const [inv, setInv] = useState(new Set());

  return (
    <div style={{ height:"100%", overflowY:"auto", background:C.bg }}>
      <div style={{ background:"white", padding:"52px 18px 16px" }}>
        <div style={{ fontSize:20, fontWeight:800, color:C.text }}>🐾 附近狗狗</div>
        <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>找到附近的狗友，一起遛弯</div>
      </div>
      <div style={{ margin:"12px 14px 0", background:C.light, border:`1px solid #FFE4B5`,
                    borderRadius:16, padding:"10px 14px", display:"flex", gap:8 }}>
        <span style={{ fontSize:14 }}>ℹ️</span>
        <div style={{ fontSize:11, color:C.sub, lineHeight:1.65 }}>
          正式功能上线后需上传<span style={{ color:C.pri, fontWeight:600 }}>疫苗证明</span>和
          <span style={{ color:C.pri, fontWeight:600 }}>狗证</span>，当前为 Demo 展示阶段。
        </div>
      </div>
      <div style={{ padding:"12px 14px 88px" }}>
        {DOGS.map((dog) => (
          <div key={dog.id} style={{ ...cardStyle }}>
            <div style={{ display:"flex", gap:12 }}>
              <div style={{ width:60, height:60, borderRadius:18,
                            background:"linear-gradient(135deg,#FFF3E0,#FFE4B5)",
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
                <div style={{ fontSize:11, color:C.pri, fontWeight:600, marginTop:4 }}>⏰ {dog.walk} 遛弯</div>
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
              <span style={{ fontSize:11, background:"#FFF8ED", color:C.pri, padding:"4px 10px", borderRadius:20 }}>
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
                           border:"none", cursor:"pointer" }}>
                  🐾 邀请一起散步
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
  { icon:"🏠", label:"首页" },
  { icon:"🗺️", label:"地图" },
  { icon:"💬", label:"社群" },
  { icon:"🐾", label:"狗友" },
];

// 状态：loading | login | onboarding | app
const S = { LOADING:"loading", LOGIN:"login", ONBOARDING:"onboarding", APP:"app" };
const LS_KEY = "tailme_user_id";

export default function AppRoot() {
  const [screen, setScreen] = useState(S.LOADING);
  const [userId, setUserId] = useState(null);
  const [pet, setPet]       = useState(null);
  const [tab, setTab]       = useState(0);

  /* 启动时：读取 localStorage → 验证 userId → 查询宠物 */
  useEffect(() => {
    const storedId = localStorage.getItem(LS_KEY);
    if (!storedId) { setScreen(S.LOGIN); return; }

    // 验证 user 在 DB 中确实存在（防止 DB 重置后本地残留 id）
    getUserById(storedId)
      .then(() => loadPets(storedId))
      .catch(() => {
        // user 不存在 → 清除本地缓存，重新登录
        localStorage.removeItem(LS_KEY);
        setScreen(S.LOGIN);
      });
  }, []);

  const loadPets = async (uid) => {
    try {
      const pets = await getUserPets(uid);
      setUserId(uid);
      if (pets && pets.length > 0) {
        setPet(pets[0]);
        setScreen(S.APP);
      } else {
        setScreen(S.ONBOARDING);
      }
    } catch {
      // 查询宠物失败也进入 onboarding，让用户重新创建
      setUserId(uid);
      setScreen(S.ONBOARDING);
    }
  };

  /* 登录成功 → 保存 userId → 查询宠物 */
  const handleLogin = (uid) => {
    localStorage.setItem(LS_KEY, uid);
    setUserId(uid);
    setScreen(S.LOADING);
    loadPets(uid);
  };

  /* 宠物创建成功 → 进入主页 */
  const handlePetCreated = (newPet) => {
    setPet(newPet);
    setScreen(S.APP);
  };

  const shell = (content, scroll = false) => (
    <div style={{ background:"linear-gradient(155deg,#FFE8D4 0%,#FFD6E8 100%)", minHeight:"100vh",
                  display:"flex", justifyContent:"center", alignItems:"flex-start" }}>
      <div style={{ width:"100%", maxWidth:430, height:"100vh", position:"relative",
                    background:C.bg, overflow:"hidden", boxShadow:"0 0 80px rgba(255,122,90,0.18)" }}>
        {scroll
          ? <div style={{ height:"100%", overflowY:"auto" }}>{content}</div>
          : content}
      </div>
    </div>
  );

  if (screen === S.LOADING)    return shell(<LoadingScreen />, false);
  if (screen === S.LOGIN)      return shell(<PhoneLogin onLogin={handleLogin} />, false);
  if (screen === S.ONBOARDING) return shell(<Onboarding userId={userId} onComplete={handlePetCreated} />, true);

  // S.APP
  return shell(
    <>
      <div style={{ position:"absolute", top:0, left:0, right:0, bottom:60, overflow:"hidden" }}>
        {tab === 0 && <HomeTab pet={pet} />}
        {tab === 1 && <MapTab />}
        {tab === 2 && <CommunityTab pet={pet} />}
        {tab === 3 && <SocialTab />}
      </div>
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:60,
                    background:"white", borderTop:`1px solid ${C.border}`, display:"flex", zIndex:100 }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
                     justifyContent:"center", gap:2, border:"none", background:"transparent",
                     cursor:"pointer", transition:"all .15s", paddingTop:4 }}>
            <div style={{ fontSize:20, lineHeight:1, filter:tab===i ? "none" : "grayscale(1) opacity(0.5)" }}>{t.icon}</div>
            <div style={{ fontSize:10, fontWeight:tab===i ? 700 : 500,
                          color:tab===i ? C.pri : "#C0A890", transition:"color .15s" }}>{t.label}</div>
            {tab === i && <div style={{ width:18, height:2.5, borderRadius:4, background:C.grad, marginTop:1 }}/>}
          </button>
        ))}
      </div>
    </>
  );
}
