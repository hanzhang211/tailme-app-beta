/**
 * services/toastTheme.js
 * 全站 toast / 提示统一配色（TailMe 奶油橙）。
 * 只统一颜色，不改各处弹出逻辑/位置/动画。
 *
 *  success / info → 主橙底白字（成功 & 中性确认）
 *  warn           → 浅橙底深橙字
 *  error          → 红橙底白字（与成功区分）
 */
export const TOAST_COLORS = {
  success: { bg: "#E68645", color: "#FFFFFF" },
  info:    { bg: "#E68645", color: "#FFFFFF" },
  warn:    { bg: "#FBE6D4", color: "#C0612A" },
  error:   { bg: "#D9542B", color: "#FFFFFF" },
};

// 接受 level / type / tone 任意命名；未知值按中性(info)处理
export function toastColors(level) {
  return TOAST_COLORS[level] || TOAST_COLORS.info;
}
