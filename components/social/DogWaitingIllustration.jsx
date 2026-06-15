"use client";

/**
 * components/social/DogWaitingIllustration.jsx
 *
 * 遛弯页空状态插画：两只牵绳一起遛弯的小狗（/liuwanzhanwei.png，已扣成透明 PNG）。
 * 仅用于空状态占位；不含任何业务逻辑。
 *
 * props:
 *  - size:      基准宽度(px)，默认 150；实际显示放大 1.5×，补偿图片上下留白、让狗图案够大
 *  - className: 透传
 *  - style:     透传（如 margin 居中）
 */
export default function DogWaitingIllustration({ size = 150, className, style }) {
  return (
    <img
      src="/liuwanzhanwei.png"
      alt="一起遛弯的小狗"
      className={className}
      style={{ width: Math.round(size * 1.5), height: "auto", display: "block", ...style }}
    />
  );
}
