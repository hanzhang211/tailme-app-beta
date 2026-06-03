"use client";

/**
 * components/icons/BreedIcon.jsx
 *
 * 品种专属图标（纯 inline SVG，无图片、无外部依赖）。
 *   <BreedIcon breed="哈士奇" petType="dog" size={32} isMyBreed />
 *
 * 思路：共享一张「扁平可爱猫/狗脸」，按品种配置不同的
 *   毛色 fur / 耳型 ear / 花纹 pat / 装饰 accent / 眼睛 eye / 双色耳 ear2，
 *   组合出每个品种各不相同的样子（TailMe 暖色扁平风）。
 * 找不到品种时按 petType 回退默认狗/猫脸；都没有时回退爪印。
 *
 * 只负责画「脸」（透明背景），外层圆形浅米底由调用处提供。
 * isMyBreed=true 时右上角叠一个小皇冠 badge。
 */

const T = { tint:"#F2E5DA", pri:"#E68645", dark:"#2A2520", gray:"#8A8178" };

const FUR = {
  orange:"#E2923F", deepOrange:"#C9742B", cream:"#E9D6B5", lightcream:"#F1E5CD",
  white:"#F2EDE5", offwhite:"#E7DED1", black:"#3C3631", darkgray:"#5C574F",
  gray:"#9AA0A4", bluegray:"#8A959D", silver:"#C6C2BB", blue:"#7C8891",
  brown:"#9A6A3D", chocolate:"#74462A", tan:"#CFA570", gold:"#E6B158",
  ginger:"#E0852F", pink:"#E7C7BC",
};
const col = (k, fb) => FUR[k] || k || fb;

/* ── 耳朵 ── */
function Ears(style, c, c2) {
  switch (style) {
    case "up":
      return (<g><path d="M11 18 L8 4 L20 13 Z" fill={c}/><path d="M37 18 L40 4 L28 13 Z" fill={c2}/></g>);
    case "big":
      return (<g><path d="M11 19 L4 3 L21 12 Z" fill={c}/><path d="M37 19 L44 3 L27 12 Z" fill={c2}/></g>);
    case "down":
      return (<g><path d="M13 14 q-9 2 -9 13 q0 4 5 3 q5 -1 6 -9 Z" fill={c}/>
                 <path d="M35 14 q9 2 9 13 q0 4 -5 3 q-5 -1 -6 -9 Z" fill={c2}/></g>);
    case "round":
      return (<g><circle cx="12" cy="13" r="5" fill={c}/><circle cx="36" cy="13" r="5" fill={c2}/></g>);
    case "bat":
      return (<g><path d="M14 16 q-8 -9 -2 -13 q6 -1 6 10 Z" fill={c}/>
                 <path d="M34 16 q8 -9 2 -13 q-6 -1 -6 10 Z" fill={c2}/></g>);
    case "tuft":
      return (<g><path d="M12 18 L7 2 L21 12 Z" fill={c}/><path d="M10 6 L13 15 L16 9 Z" fill="#FFFFFF" opacity=".45"/>
                 <path d="M36 18 L41 2 L27 12 Z" fill={c2}/><path d="M38 6 L35 15 L32 9 Z" fill="#FFFFFF" opacity=".45"/></g>);
    case "catUp":
      return (<g><path d="M13 15 L9 1 L21 12 Z" fill={c}/><path d="M14 12 L11 5 L18 11 Z" fill={T.pri} opacity=".30"/>
                 <path d="M35 15 L39 1 L27 12 Z" fill={c2}/><path d="M34 12 L37 5 L30 11 Z" fill={T.pri} opacity=".30"/></g>);
    case "fold":
      return (<g><path d="M11 10 q4 -5 10 1 q-5 -1 -7 4 q-2 -2 -3 -5 Z" fill={c}/>
                 <path d="M37 10 q-4 -5 -10 1 q5 -1 7 4 q2 -2 3 -5 Z" fill={c2}/></g>);
    case "curl":
      return (<g><path d="M12 14 L7 3 q6 0 6 7 q2 2 -1 4 Z" fill={c}/>
                 <path d="M36 14 L41 3 q-6 0 -6 7 q-2 2 1 4 Z" fill={c2}/></g>);
    default:
      return (<g><path d="M13 15 L9 1 L21 12 Z" fill={c}/><path d="M35 15 L39 1 L27 12 Z" fill={c2}/></g>);
  }
}

/* ── 花纹 ── */
function Pattern(pat, pc) {
  switch (pat) {
    case "mask":
      return (<g fill={pc} opacity=".42"><ellipse cx="18" cy="23" rx="4.2" ry="4.4"/><ellipse cx="30" cy="23" rx="4.2" ry="4.4"/></g>);
    case "tabby":
      return (<path d="M24 12 v7 M20 14 v5 M28 14 v5" stroke={pc} strokeWidth="1.6" strokeLinecap="round" fill="none"/>);
    case "spots":
      return (<g fill={pc} opacity=".5"><circle cx="16" cy="22" r="1.6"/><circle cx="32" cy="22" r="1.6"/>
              <circle cx="15" cy="30" r="1.4"/><circle cx="33" cy="30" r="1.4"/><circle cx="24" cy="20" r="1.3"/></g>);
    case "point":
      return (<ellipse cx="24" cy="32" rx="8" ry="5" fill={pc} opacity=".40"/>);
    case "tux":
      return (<ellipse cx="24" cy="33" rx="6.6" ry="4.6" fill="#F4EFE6"/>);
    case "snow":
      return (<g><ellipse cx="24" cy="32" rx="7.2" ry="5.2" fill="#F2EDE5"/>
              <circle cx="19" cy="20" r="1.5" fill="#F2EDE5"/><circle cx="29" cy="20" r="1.5" fill="#F2EDE5"/></g>);
    case "dobie":
      return (<g><circle cx="19" cy="20" r="1.7" fill={pc}/><circle cx="29" cy="20" r="1.7" fill={pc}/>
              <ellipse cx="24" cy="32" rx="5" ry="4" fill={pc} opacity=".85"/></g>);
    case "blaze":
      return (<g><path d="M24 12 q-2.5 8 0 15 q2.5 -7 0 -15" fill="#F2EDE5"/>
              <circle cx="18.5" cy="20" r="1.5" fill={pc}/><circle cx="29.5" cy="20" r="1.5" fill={pc}/></g>);
    case "sparkle":
      return (<path d="M33 17 l.9 2 2 .9 -2 .9 -.9 2 -.9 -2 -2 -.9 2 -.9Z" fill={T.pri}/>);
    default:
      return null;
  }
}

/* ── 装饰 ── */
function Accent(accent) {
  switch (accent) {
    case "tongue":
      return (<path d="M22 31 q2 5 4 0 Z" fill="#E8788A"/>);
    case "beard":
      return (<path d="M18 32 q6 8 12 0 q-1 5 -6 5 q-5 0 -6 -5Z" fill="#DCD0BC"/>);
    case "bow":
      return (<g><path d="M20 8 l4 3 -4 3Z" fill={T.pri}/><path d="M28 8 l-4 3 4 3Z" fill={T.pri}/>
              <circle cx="24" cy="11" r="1.6" fill="#C9742B"/></g>);
    default:
      return null;
  }
}

/* ── 一张脸 ── */
function Face({ isCat, cfg }) {
  const fur  = col(cfg.fur, isCat ? FUR.gray : FUR.tan);
  const earC = cfg.patch ? col(cfg.patch) : fur;
  const earC2 = cfg.ear2 ? col(cfg.ear2) : earC;
  const eyeC = cfg.eye === "blue" ? "#6FA8C7" : cfg.eye === "green" ? "#6BA06A" : T.dark;
  const earStyle = cfg.ear || (isCat ? "catUp" : "up");

  return (
    <svg width="100%" height="100%" viewBox="-3 -2 54 54" aria-hidden="true">
      {Ears(earStyle, earC, earC2)}
      {/* 头 */}
      <ellipse cx="24" cy="26" rx="13" ry="12" fill={fur} />
      {/* 花纹 */}
      {Pattern(cfg.pat, col(cfg.patColor, T.dark))}
      {/* 口鼻浅色块 */}
      <ellipse cx="24" cy="31" rx="6.6" ry="5" fill="#FFFFFF" opacity="0.45" />
      {/* 眼睛 */}
      <circle cx="19" cy="24" r="1.9" fill={eyeC} />
      <circle cx="29" cy="24" r="1.9" fill={eyeC} />
      {/* 鼻子 */}
      {isCat
        ? <path d="M24 28 l-1.8 2 h3.6 Z" fill={T.pri} />
        : <ellipse cx="24" cy="29" rx="2.2" ry="1.7" fill={T.dark} />}
      {/* 猫胡须 */}
      {isCat && (
        <g stroke="#CABBA8" strokeWidth="0.8" strokeLinecap="round">
          <path d="M16 30 L8 29 M16 31.5 L8 32" /><path d="M32 30 L40 29 M32 31.5 L40 32" />
        </g>
      )}
      {/* 装饰 */}
      {Accent(cfg.accent)}
    </svg>
  );
}

/* ── 狗狗品种配置 ── */
const DOG_CFG = {
  "腊肠犬":  { fur:"chocolate", ear:"down" },
  "柴犬":    { fur:"orange", ear:"up", pat:"tux" },
  "柯基":    { fur:"orange", ear:"big", pat:"tux" },
  "金毛":    { fur:"gold", ear:"down", accent:"tongue" },
  "拉布拉多":{ fur:"cream", ear:"down" },
  "边牧":    { fur:"white", patch:"black", ear:"up", pat:"mask", patColor:"black" },
  "法斗":    { fur:"tan", ear:"bat", pat:"spots", patColor:"chocolate" },
  "比熊":    { fur:"white", ear:"round" },
  "贵宾":    { fur:"cream", ear:"down" },
  "泰迪":    { fur:"chocolate", ear:"down" },
  "阿拉斯加":{ fur:"darkgray", ear:"up", pat:"snow" },
  "哈士奇":  { fur:"darkgray", ear:"up", pat:"snow", eye:"blue" },
  "德牧":    { fur:"tan", patch:"black", ear:"up", pat:"point", patColor:"black" },
  "博美":    { fur:"orange", ear:"tuft" },
  "马尔济斯":{ fur:"white", ear:"down" },
  "巴哥":    { fur:"cream", ear:"round", pat:"point", patColor:"black" },
  "吉娃娃":  { fur:"tan", ear:"big" },
  "秋田":    { fur:"orange", ear:"up", pat:"tux" },
  "雪纳瑞":  { fur:"gray", ear:"down", accent:"beard" },
  "约克夏":  { fur:"darkgray", ear:"up", accent:"bow" },
  "杜宾":    { fur:"black", ear:"up", pat:"dobie", patColor:"tan" },
  "萨摩耶":  { fur:"white", ear:"up", accent:"tongue" },
  "罗威纳":  { fur:"black", ear:"down", pat:"dobie", patColor:"tan" },
  "伯恩山":  { fur:"black", patch:"black", ear:"down", pat:"blaze", patColor:"tan" },
  "斗牛犬":  { fur:"cream", ear:"round", pat:"spots", patColor:"chocolate" },
  "灵缇":    { fur:"silver", ear:"round" },
  "纽芬兰":  { fur:"black", ear:"down" },
  "牛头梗":  { fur:"white", ear:"up", egg:true },
  "可卡":    { fur:"ginger", ear:"down" },
  "其他":    { fur:"tan", ear:"up" },
};

/* ── 猫咪品种配置 ── */
const CAT_CFG = {
  "英短":      { fur:"bluegray", ear:"catUp" },
  "美短":      { fur:"silver", ear:"catUp", pat:"tabby", patColor:"darkgray" },
  "布偶":      { fur:"cream", patch:"chocolate", ear:"catUp", pat:"point", patColor:"chocolate", eye:"blue" },
  "缅因":      { fur:"brown", ear:"tuft", pat:"tabby", patColor:"chocolate" },
  "暹罗":      { fur:"lightcream", patch:"chocolate", ear:"catUp", pat:"point", patColor:"chocolate", eye:"blue" },
  "金渐层":    { fur:"gold", ear:"catUp", accent:null, pat:"sparkle" },
  "银渐层":    { fur:"silver", ear:"catUp", pat:"sparkle" },
  "蓝猫":      { fur:"blue", ear:"catUp" },
  "橘猫":      { fur:"ginger", ear:"catUp", pat:"tabby", patColor:"deepOrange" },
  "狸花猫":    { fur:"tan", ear:"catUp", pat:"tabby", patColor:"brown" },
  "奶牛猫":    { fur:"white", patch:"black", ear:"catUp", pat:"mask", patColor:"black" },
  "波斯猫":    { fur:"cream", ear:"round" },
  "异国短毛":  { fur:"cream", ear:"round" },
  "无毛猫":    { fur:"pink", ear:"big" },
  "斯芬克斯":  { fur:"pink", ear:"big" },
  "德文卷毛":  { fur:"tan", ear:"curl" },
  "挪威森林":  { fur:"brown", ear:"tuft", pat:"tabby", patColor:"chocolate" },
  "孟加拉豹猫":{ fur:"gold", ear:"catUp", pat:"spots", patColor:"chocolate" },
  "苏格兰折耳":{ fur:"silver", ear:"fold" },
  "曼赤肯":    { fur:"cream", ear:"catUp" },
  "阿比西尼亚":{ fur:"ginger", ear:"catUp", pat:"sparkle" },
  "俄罗斯蓝猫":{ fur:"blue", ear:"catUp", eye:"green" },
  "英国长毛":  { fur:"bluegray", ear:"tuft" },
  "美国卷耳":  { fur:"cream", ear:"curl" },
  "伯曼猫":    { fur:"lightcream", patch:"chocolate", ear:"catUp", pat:"point", patColor:"chocolate", eye:"blue" },
  "巴厘猫":    { fur:"lightcream", patch:"chocolate", ear:"tuft", pat:"point", patColor:"chocolate", eye:"blue" },
  "东方短毛":  { fur:"darkgray", ear:"big" },
  "加菲":      { fur:"orange", ear:"round" },
  "虎斑":      { fur:"tan", ear:"catUp", pat:"tabby", patColor:"brown" },
  "三花":      { fur:"white", patch:"ginger", ear2:"darkgray", ear:"catUp", pat:"spots", patColor:"ginger" },
  "玳瑁":      { fur:"chocolate", patch:"ginger", ear2:"black", ear:"catUp", pat:"spots", patColor:"ginger" },
  "重点色":    { fur:"lightcream", patch:"darkgray", ear:"catUp", pat:"point", patColor:"darkgray", eye:"blue" },
  "长毛混血":  { fur:"tan", ear:"tuft" },
  "短毛混血":  { fur:"gray", ear:"catUp" },
  "中华田园猫":{ fur:"ginger", ear:"catUp", pat:"tabby", patColor:"deepOrange" },
  "土猫":      { fur:"tan", ear:"catUp", pat:"tabby", patColor:"brown" },
  "其他":      { fur:"gray", ear:"catUp" },
};

const CAT_SET = new Set(Object.keys(CAT_CFG));

export default function BreedIcon({ breed, petType = "dog", size = 32, isMyBreed = false, className, style }) {
  const isCat = petType === "cat" || (CAT_SET.has(breed) && petType !== "dog");
  const cfg = (isCat ? CAT_CFG[breed] : DOG_CFG[breed]) ||
              (isCat ? CAT_CFG["其他"] : DOG_CFG["其他"]);

  return (
    <span className={className}
      style={{ position:"relative", display:"inline-flex", width:size, height:size,
               alignItems:"center", justifyContent:"center", ...style }}>
      <Face isCat={isCat} cfg={cfg} />
      {isMyBreed && (
        <span style={{ position:"absolute", top:-3, right:-3, fontSize:size * 0.34, lineHeight:1,
                       filter:"drop-shadow(0 1px 1px rgba(0,0,0,0.2))" }}>👑</span>
      )}
    </span>
  );
}
