"use client";

/**
 * components/PetAvatar.jsx
 *
 * 通用宠物头像：
 *  - pet.ai_avatar_url 存在 → 渲染圆形 <img>
 *  - 否则                  → fallback 到品种 emoji（带浅粉米底）
 *  - img onError → 自动切回 emoji
 *
 * 用在社群帖子作者、评论作者、聊天消息作者等所有"宠物身份"位置。
 */

import { useEffect, useState } from "react";
import { avatarForBreed } from "@/services/breedAvatar";

export default function PetAvatar({ pet, size = 34, bg = "#F2E5DA", blendMode }) {
  const url = pet?.pet_avatar_thumb_url || pet?.ai_avatar_url;
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [url]);

  // blendMode="multiply" 时：去圆形裁剪，contain，融入背景（用于 carousel ghost）
  const sticker = !!blendMode;

  if (url && !broken) {
    return (
      <img
        src={url}
        alt={pet?.name || ""}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        style={{
          width: size, height: size,
          borderRadius: sticker ? 0 : "50%",
          objectFit: sticker ? "contain" : "cover",
          display: "block", flexShrink: 0,
          background: sticker ? "transparent" : bg,
          mixBlendMode: blendMode || undefined,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: sticker ? 0 : "50%",
        background: sticker ? "transparent" : bg,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: Math.round(size * 0.5), lineHeight: 1, flexShrink: 0,
      }}
    >
      {avatarForBreed(pet?.breed, pet?.pet_type)}
    </div>
  );
}
