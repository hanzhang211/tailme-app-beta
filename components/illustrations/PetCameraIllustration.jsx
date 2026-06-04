"use client";

/**
 * components/illustrations/PetCameraIllustration.jsx
 *
 * TailMe 风格「宠物相机」轻插画（纯 SVG，无外部图片/字体）：
 *  奶油色相机 + 镜头里的橙色爪印 + 后面插着一狗一猫两张照片 + 小星星/爱心。
 * 仅作 AI 头像上传区占位用，无业务逻辑。
 *
 * props: size(宽度 px，默认 160) / className / style
 */
export default function PetCameraIllustration({ size = 160, className, style }) {
  const cream  = "#FBEAD0";   // 相机主体
  const creamL = "#FFF3E1";   // 高光/镜片
  const peach  = "#F2C7A5";   // 浅橙描边/暗部
  const pri    = "#E68645";   // 主橙
  const line   = "#2A2520";   // 深色
  return (
    <svg className={className} style={style} width={size} viewBox="0 0 200 172"
      fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="宠物相机插画">
      {/* 阴影 */}
      <ellipse cx="100" cy="156" rx="58" ry="8" fill={line} opacity="0.06" />

      {/* 小装饰：星星 + 爱心 */}
      <g fill={pri} opacity="0.9">
        <path d="M40 40l2.4 5 5 2.4-5 2.4L40 55l-2.4-5.2-5-2.4 5-2.4L40 40z" opacity="0.85" />
        <path d="M168 60l1.8 3.8 3.8 1.8-3.8 1.8L168 71l-1.8-3.8-3.8-1.8 3.8-1.8L168 60z" opacity="0.7" />
      </g>
      <path d="M158 36c-2.6-2.6-6.6-.8-6.6 2.6 0 3 3.4 4.8 6.6 7.4 3.2-2.6 6.6-4.4 6.6-7.4 0-3.4-4-5.2-6.6-2.6z"
            fill={peach} />

      {/* 后面两张照片（左狗 / 右猫，向上探出） */}
      {/* 左：小狗照片 */}
      <g transform="rotate(-13 78 64)">
        <rect x="56" y="34" width="44" height="56" rx="6" fill="#FFFFFF" stroke={peach} strokeWidth="2" />
        <rect x="60" y="38" width="36" height="40" rx="4" fill="#FCEFDD" />
        {/* 小狗脸 */}
        <ellipse cx="78" cy="60" rx="13" ry="12" fill="#E8C39A" />
        <path d="M67 52q-5-3-6 4 5 3 8 1z" fill="#C98A52" />
        <path d="M89 52q5-3 6 4-5 3-8 1z" fill="#C98A52" />
        <circle cx="74" cy="59" r="1.7" fill={line} />
        <circle cx="82" cy="59" r="1.7" fill={line} />
        <ellipse cx="78" cy="64" rx="2.4" ry="1.8" fill={line} />
      </g>
      {/* 右：小猫照片 */}
      <g transform="rotate(11 124 60)">
        <rect x="104" y="30" width="44" height="56" rx="6" fill="#FFFFFF" stroke={peach} strokeWidth="2" />
        <rect x="108" y="34" width="36" height="40" rx="4" fill="#FCEFDD" />
        {/* 小猫脸 */}
        <path d="M114 50l-2-8 7 4h10l7-4-2 8a11 10 0 1 1-20 0z" fill="#F2C089" />
        <circle cx="122" cy="55" r="1.7" fill={line} />
        <circle cx="130" cy="55" r="1.7" fill={line} />
        <path d="M125 59q1 1.4 2 0" stroke={line} strokeWidth="1.2" strokeLinecap="round" />
      </g>

      {/* 相机机身 */}
      <rect x="38" y="80" width="124" height="72" rx="18" fill={cream} stroke={peach} strokeWidth="2.5" />
      {/* 取景器凸起 */}
      <path d="M70 80l4-9c.5-1.1 1.6-1.8 2.8-1.8h16.4c1.2 0 2.3.7 2.8 1.8l4 9z"
            fill={cream} stroke={peach} strokeWidth="2.5" strokeLinejoin="round" />
      {/* 快门按钮 */}
      <rect x="128" y="72" width="20" height="10" rx="5" fill={pri} />
      {/* 闪光小灯 */}
      <circle cx="54" cy="94" r="3.2" fill={peach} />

      {/* 镜头 + 爪印 */}
      <circle cx="100" cy="118" r="28" fill={creamL} stroke={peach} strokeWidth="3" />
      <circle cx="100" cy="118" r="20" fill="#FCE7CE" />
      <g fill={pri}>
        <ellipse cx="92" cy="112" rx="2.6" ry="3.4" />
        <ellipse cx="100" cy="109.5" rx="2.8" ry="3.6" />
        <ellipse cx="108" cy="112" rx="2.6" ry="3.4" />
        <path d="M91 122c0-3.4 4-5.4 9-5.4s9 2 9 5.4c0 2.6-4 3.8-9 3.8s-9-1.2-9-3.8z" />
      </g>
    </svg>
  );
}
