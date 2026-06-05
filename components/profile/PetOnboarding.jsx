"use client";

/**
 * components/profile/PetOnboarding.jsx
 *
 * 多步骤「添加宠物」引导流程（手机号验证后 & 「我的宠物」右上角添加 共用）。
 * 7 步：①名字+性别 ②类型+品种 ③生日 ④体重 ⑤绝育+疫苗 ⑥性格(多选) ⑦AI专属形象
 * 仅 UI / 交互；数据与提交逻辑全部沿用现有：
 *  - 品种：DOG_BREEDS / CAT_BREEDS（services/breedAvatar）
 *  - 性格：PERSONALITIES（services/petAge），多选后以「、」拼接存入现有 personality 文本字段
 *  - 提交：savePetProfile（首次创建）/ updatePet（返回再前进时更新同一只）
 *  - AI 形象：复用现有 AvatarGenerator（此时宠物已创建、已知猫/狗，prompt 正确）
 *
 * props:
 *  - userId
 *  - onComplete(savedPet)  完成（使用 AI 形象 / 跳过）后回调
 *  - onClose?()            可选；第 1 步点返回时调用（用于「我的宠物」里取消添加）
 */

import { useState } from "react";
import { savePetProfile, updatePet } from "@/services/supabaseService";
import { formatPetAge, PERSONALITIES } from "@/services/petAge";
import { DOG_BREEDS, CAT_BREEDS } from "@/services/breedAvatar";
import { Mars, Venus } from "lucide-react";
import AvatarGenerator from "@/components/home/AvatarGenerator";
import BreedIcon from "@/components/icons/BreedIcon";
import BackButton from "@/components/icons/BackButton";
import WheelDatePicker from "@/components/ui/WheelDatePicker";

const OB = {
  bg:"#EEE9E1", card:"#FFFFFF", tint:"#F2E5DA", pri:"#E68645",
  text:"#2A2520", sub:"#8A8074", soft:"#EADFD0", peach:"#F2C7A5",
  track:"#E6DCCD",
};
const TOTAL_OB_STEPS = 7;

const Label = ({ children, style }) => (
  <div style={{ fontSize:12, fontWeight:600, color:"#3B4252", marginBottom:8, ...style }}>{children}</div>
);
const Inp = (props) => (
  <input {...props} style={{ width:"100%", borderRadius:16, padding:"12px 14px", fontSize:14,
    border:"1.5px solid #7A6F62", background:"#FFFFFF", color:OB.text, outline:"none",
    boxSizing:"border-box", ...props.style }} />
);
const ErrBox = ({ msg }) =>
  msg ? (
    <div style={{ marginTop:10, padding:"10px 14px", background:"#FFF0F0", borderRadius:14,
                  fontSize:12, color:"#D94040", lineHeight:1.5 }}>
      ❌ {msg}
    </div>
  ) : null;

export default function PetOnboarding({ userId, onComplete, onClose }) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({
    pet_type:"dog", name:"", gender:"", breed:"",
    birthday:"", weight:"5.0", neutered:"", vaccinated:"",
  });
  const [personalities, setPersonalities] = useState([]);
  const [breedQ, setBreedQ]   = useState("");
  const [savedPet, setSavedPet] = useState(null);
  const [showGen, setShowGen] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  const upd     = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setType = (t) => setF((p) => ({ ...p, pet_type: t, breed: "" }));
  const togglePer = (p) =>
    setPersonalities((arr) =>
      arr.includes(p) ? arr.filter((x) => x !== p) : (arr.length >= 6 ? arr : [...arr, p]));

  const breedList = (f.pet_type === "cat" ? CAT_BREEDS : DOG_BREEDS)
    .filter((b) => !breedQ.trim() || b.includes(breedQ.trim()));

  const canNext = {
    1: !!(f.name.trim() && f.gender),
    2: !!(f.pet_type && f.breed),
    3: !!f.birthday,
    4: !!f.weight,
    5: !!(f.neutered && f.vaccinated),
    6: personalities.length > 0,
  }[step];

  // 把多选性格拼成现有单字段；update 用映射后的字段
  const mapFields = () => ({
    name: f.name.trim(), breed: f.breed || null, birthday: f.birthday || null,
    personality: personalities.join("、") || null,
    weight: f.weight ? parseFloat(f.weight) : null,
    gender: f.gender || null,
    neutered: f.neutered === "yes", vaccinated: f.vaccinated === "yes",
  });

  const onNext = async () => {
    if (step < 6) { setStep((s) => s + 1); return; }
    // step6 → 创建/更新宠物 → 进入 AI 形象步骤
    setSaving(true); setError(null);
    try {
      const p = savedPet?.id
        ? await updatePet(savedPet.id, mapFields())
        : await savePetProfile({ ...f, personality: personalities.join("、") }, userId);
      setSavedPet(p);
      setStep(7);
      setShowGen(true);
    } catch (err) {
      setError(err.message || "保存失败，请重试");
    } finally { setSaving(false); }
  };

  const back = () => {
    if (step > 1) { setShowGen(false); setStep((s) => s - 1); }
    else onClose?.();
  };
  const canBack = step > 1 || !!onClose;

  const ageHint = (() => { try { return f.birthday ? formatPetAge(f.birthday) : ""; } catch { return ""; } })();

  // 选项卡片样式
  const opt = (on) => ({
    borderRadius:16, cursor:"pointer", transition:"all .15s", color:OB.text,
    fontWeight: on ? 700 : 600,
    border:`2px solid ${on ? OB.pri : OB.soft}`,
    background: on ? "#FCEEE1" : "#fff",
    boxShadow: on ? "0 4px 14px rgba(230,134,69,.18)" : "0 1px 4px rgba(0,0,0,.04)",
  });
  const cta = (enabled) => ({
    width:"100%", padding:"15px 0", borderRadius:16, fontSize:15, fontWeight:800,
    background: enabled ? OB.pri : "#EADFCF", color: enabled ? "#fff" : OB.sub,
    border:"none", cursor: enabled ? "pointer" : "default", transition:"all .2s",
    boxShadow: enabled ? "0 6px 16px rgba(230,134,69,.3)" : "none",
  });
  const H  = { fontSize:20, fontWeight:800, color:OB.text, marginBottom:4, lineHeight:1.35 };
  const Sub = { fontSize:13, color:OB.sub, marginBottom:18, lineHeight:1.5 };
  const cardSty = { background:"#fff", borderRadius:24, padding:"22px 18px",
                    border:"1px solid #EFE6D8", boxShadow:"0 4px 20px rgba(0,0,0,.05)" };

  const renderStep = () => {
    switch (step) {
      case 1: return (<>
        <div style={H}>先认识一下你的毛孩子 🐾</div>
        <div style={Sub}>给 TA 起个名字，再选一下性别吧</div>
        <Label>宠物名字</Label>
        <Inp value={f.name} onChange={(e) => upd("name", e.target.value)}
             placeholder="比如：豆豆、可乐、花花…"
             style={{ border:`1.5px solid ${OB.soft}` }} />
        <Label style={{ marginTop:18 }}>性别</Label>
        <div style={{ display:"flex", gap:12 }}>
          {[["male","男孩",<Mars key="m" size={18} color="#6FA8DC" />],
            ["female","女孩",<Venus key="f" size={18} color="#E68F9E" />]].map(([g, label, icon]) => {
            const on = f.gender === g;
            return (
              <button key={g} className="ob-press" onClick={() => upd("gender", g)}
                style={{ ...opt(on), flex:1, padding:"16px 0", display:"flex",
                         flexDirection:"column", alignItems:"center", gap:6, fontSize:14 }}>
                {icon}<span>{label}</span>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize:11.5, color:OB.sub, marginTop:12, textAlign:"center" }}>之后也可以修改</div>
      </>);

      case 2: return (<>
        <div style={H}>它是什么小可爱？❤️</div>
        <div style={Sub}>先选类型，再挑一个品种</div>
        <div style={{ display:"flex", gap:12, marginBottom:18 }}>
          {[["dog","🐶 小狗"],["cat","🐱 小猫"]].map(([t, label]) => {
            const on = f.pet_type === t;
            return (
              <button key={t} className="ob-press" onClick={() => setType(t)}
                style={{ ...opt(on), flex:1, padding:"15px 0", fontSize:15 }}>{label}</button>
            );
          })}
        </div>
        <Label>选择品种</Label>
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"#fff",
                      border:`1.5px solid ${OB.soft}`, borderRadius:14, padding:"10px 14px", marginBottom:10 }}>
          <span style={{ fontSize:14, color:OB.sub }}>🔍</span>
          <input value={breedQ} onChange={(e) => setBreedQ(e.target.value)}
            placeholder={f.pet_type === "cat" ? "搜索猫种（如：英短、布偶）" : "搜索犬种（如：泰迪、金毛）"}
            style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:13, color:OB.text, minWidth:0 }} />
        </div>
        <div style={{ maxHeight:248, overflowY:"auto", display:"flex", flexDirection:"column", gap:8,
                      margin:"0 -2px", padding:"2px" }}>
          {breedList.length === 0 ? (
            <div style={{ textAlign:"center", color:OB.sub, fontSize:13, padding:"24px 0" }}>没找到这个品种，换个词试试～</div>
          ) : breedList.map((b) => {
            const on = f.breed === b;
            return (
              <button key={b} className="ob-press" onClick={() => upd("breed", b)}
                style={{ ...opt(on), display:"flex", alignItems:"center", gap:12, padding:"9px 12px", textAlign:"left" }}>
                <BreedIcon breed={b} petType={f.pet_type} size={34} />
                <span style={{ flex:1, fontSize:14 }}>{b}</span>
                <span style={{ width:20, height:20, borderRadius:"50%", flexShrink:0,
                               border:`2px solid ${on ? OB.pri : OB.soft}`, background: on ? OB.pri : "#fff",
                               color:"#fff", fontSize:12, fontWeight:900, lineHeight:"16px", textAlign:"center" }}>
                  {on ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </>);

      case 3: return (<>
        <div style={H}>🎂 它的生日是？</div>
        <div style={Sub}>我们会用它来计算年龄和提醒生日</div>
        <WheelDatePicker value={f.birthday}
                         onChange={(v) => upd("birthday", v)} />
        {ageHint && (
          <div style={{ textAlign:"center", marginTop:12, fontSize:13, color:OB.text }}>
            🐾 现在大约 <b style={{ color:OB.pri }}>{ageHint}</b>
          </div>
        )}
        <div style={{ display:"flex", gap:10, marginTop:18, background:OB.tint, borderRadius:16,
                      padding:"12px 14px", alignItems:"flex-start" }}>
          <span style={{ fontSize:16 }}>🐱</span>
          <div style={{ fontSize:12, color:"#7A6A58", lineHeight:1.6 }}>
            如果不确定准确生日，也可以挑一个对你有意义的纪念日，之后首页也会按这个日期记录成长。
          </div>
        </div>
      </>);

      case 4: { const w = parseFloat(f.weight || "0") || 0; return (<>
        <div style={H}>⚖️ 它现在多重？</div>
        <div style={Sub}>之后可以随时更新</div>
        <div style={{ textAlign:"center", margin:"10px 0 18px" }}>
          <span style={{ fontSize:46, fontWeight:900, color:OB.pri, letterSpacing:-1 }}>{w.toFixed(1)}</span>
          <span style={{ fontSize:18, fontWeight:700, color:OB.sub, marginLeft:6 }}>kg</span>
        </div>
        <input type="range" min="0" max="50" step="0.1" value={w}
          onChange={(e) => upd("weight", e.target.value)}
          style={{ width:"100%", accentColor:OB.pri, cursor:"pointer" }} />
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:OB.sub, marginTop:6 }}>
          {[0,10,20,30,40,50].map((t) => <span key={t}>{t}</span>)}
        </div>
        <div style={{ textAlign:"center", fontSize:11, color:OB.sub, marginTop:14 }}>拖动选择，单位 kg</div>
      </>); }

      case 5: return (<>
        <div style={H}>健康信息补充一下 🩺</div>
        <div style={Sub}>这些信息会帮助健康提醒更准确</div>
        <Label>🐱 是否绝育</Label>
        <div style={{ display:"flex", gap:12, marginBottom:18 }}>
          {[["yes","已绝育"],["no","未绝育"]].map(([v, label]) => {
            const on = f.neutered === v;
            return (
              <button key={v} className="ob-press" onClick={() => upd("neutered", v)}
                style={{ ...opt(on), flex:1, padding:"14px 0", fontSize:14,
                         display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                {on && <span style={{ color:OB.pri }}>✓</span>}{label}
              </button>
            );
          })}
        </div>
        <Label>🛡️ 疫苗是否齐全</Label>
        <div style={{ display:"flex", gap:12 }}>
          {[["yes","已完成"],["no","暂未完成"]].map(([v, label]) => {
            const on = f.vaccinated === v;
            return (
              <button key={v} className="ob-press" onClick={() => upd("vaccinated", v)}
                style={{ ...opt(on), flex:1, padding:"14px 0", fontSize:14,
                         display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                {on && <span style={{ color:OB.pri }}>✓</span>}{label}
              </button>
            );
          })}
        </div>
      </>);

      case 6: return (<>
        <div style={H}>🌟 它的性格像哪种？</div>
        <div style={Sub}>可多选，方便为你匹配内容和交友</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
          {PERSONALITIES.map((p) => {
            const on = personalities.includes(p);
            return (
              <button key={p} className="ob-press" onClick={() => togglePer(p)}
                style={{ ...opt(on), padding:"10px 16px", fontSize:14, borderRadius:999,
                         display:"flex", alignItems:"center", gap:6 }}>
                {on && <span style={{ color:OB.pri, fontWeight:900 }}>✓</span>}{p}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop:18, fontSize:12, color:OB.sub, lineHeight:1.6, textAlign:"center" }}>
          选几个最像它的，我们会据此让首页和社交体验更贴合你的毛孩子。
        </div>
      </>);

      case 7: return (
        <div style={{ textAlign:"center", padding:"6px 0" }}>
          <div style={{ fontSize:34, marginBottom:6 }}>🎉</div>
          <div style={H}>{f.name || "它"} 的小档案完成啦！</div>
          <div style={{ ...Sub, marginBottom:22 }}>
            上传一张清晰照片，AI 会帮 TA 生成一个专属宠物形象 ✨
          </div>
          <button className="ob-press" onClick={() => setShowGen(true)} style={{ ...cta(true), marginBottom:12 }}>
            ✨ 生成专属形象
          </button>
          <button onClick={() => onComplete(savedPet)}
            style={{ width:"100%", padding:"12px 0", borderRadius:16, fontSize:14, fontWeight:700,
                     background:"#fff", color:OB.sub, border:`1.5px solid ${OB.soft}`, cursor:"pointer" }}>
            先进去看看 TA 的家 →
          </button>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div style={{ minHeight:"100%", background:OB.bg, display:"flex", flexDirection:"column" }}>
      {/* 顶部导航 + 进度条 */}
      <div style={{ padding:"14px 16px 0" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", height:36 }}>
          {canBack
            ? <BackButton onClick={back} size={36} />
            : <div style={{ width:36, height:36 }} />}
          <div style={{ fontSize:16, fontWeight:800, color:OB.text }}>添加宠物</div>
          <div style={{ fontSize:13, fontWeight:700, color:OB.sub, minWidth:36, textAlign:"right" }}>{step}/{TOTAL_OB_STEPS}</div>
        </div>
        <div style={{ height:6, borderRadius:6, background:OB.track, marginTop:12, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${(step / TOTAL_OB_STEPS) * 100}%`, background:OB.pri,
                        borderRadius:6, transition:"width .35s cubic-bezier(.4,0,.2,1)" }} />
        </div>
      </div>

      {/* 主内容卡片（切换淡入 + 轻微位移） */}
      <div style={{ flex:1, overflowY:"auto", padding:"22px 18px 16px" }}>
        <div key={step} className="ob-step" style={cardSty}>
          {renderStep()}
        </div>
      </div>

      {/* 底部主按钮（第 1–6 步） */}
      {step < 7 && (
        <div style={{ padding:"0 18px calc(18px + env(safe-area-inset-bottom))" }}>
          <ErrBox msg={error} />
          <button className="ob-press" disabled={!canNext || saving} onClick={onNext}
            style={{ ...cta(canNext && !saving), marginTop:error ? 10 : 0 }}>
            {saving ? "保存中…" : "下一步"}
          </button>
        </div>
      )}

      {/* 第 7 步：复用现有 AI 生成（此时宠物已创建、已知猫/狗） */}
      {step === 7 && showGen && savedPet && (
        <AvatarGenerator
          user={{ id: userId }}
          pet={{ ...savedPet, pet_type: f.pet_type }}
          onSaved={(updated) => onComplete({ ...savedPet, ...(updated || {}), pet_type: f.pet_type })}
          onClose={() => setShowGen(false)} />
      )}

      <style>{`
        @keyframes obStepIn { from { opacity:0; transform: translateX(14px); } to { opacity:1; transform:none; } }
        .ob-step { animation: obStepIn .28s ease; }
        .ob-press { transition: transform .12s ease; }
        .ob-press:active { transform: scale(.97); }
      `}</style>
    </div>
  );
}
