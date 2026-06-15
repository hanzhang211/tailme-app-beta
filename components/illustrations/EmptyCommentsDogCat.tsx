"use client";

/**
 * components/illustrations/EmptyCommentsDogCat.tsx
 *
 * 帖子详情「还没有评论」占位插画：一狗一猫窝在温暖小窝里（/tiezizhanwei.png，已扣成透明 PNG）。
 * 仅作占位用，无业务逻辑。
 *
 * 用法：<EmptyCommentsDogCat className="w-48 h-auto mx-auto" />
 *  - 宽度固定 230px 居中（补偿图片上下留白，让图案够大）；className 仍透传。
 */

type Props = {
  className?: string;
};

export default function EmptyCommentsDogCat({ className }: Props) {
  return (
    <img
      src="/tiezizhanwei.png"
      alt="还没有评论，快来抢个小窝"
      className={className}
      style={{ width: 230, height: "auto", display: "block", margin: "0 auto" }}
    />
  );
}
