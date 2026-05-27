/**
 * services/imageCompress.js
 *
 * 浏览器端图片压缩，零依赖。
 * 主流程：File → createImageBitmap → canvas downscale → toBlob(jpeg)
 *
 * 不会读 EXIF；保留原始内容，仅按比例 resize + 重编码 JPEG。
 */

const DEFAULT_MAX_DIM = 1600;   // 最长边
const DEFAULT_QUALITY = 0.82;

/**
 * 压缩一张图片。失败时回退到原始 File。
 * @param {File} file
 * @param {{ maxDim?: number, quality?: number }} opts
 * @returns {Promise<File>}
 */
export async function compressImage(file, opts = {}) {
  if (!file || !file.type?.startsWith("image/")) return file;
  // gif / webp 动画不压缩，避免拆帧
  if (file.type === "image/gif") return file;

  const maxDim  = opts.maxDim  ?? DEFAULT_MAX_DIM;
  const quality = opts.quality ?? DEFAULT_QUALITY;

  try {
    const bitmap = await createImageBitmap(file);
    const { width: w0, height: h0 } = bitmap;
    const ratio = Math.min(1, maxDim / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * ratio));
    const h = Math.max(1, Math.round(h0 * ratio));

    const canvas = document.createElement("canvas");
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob) return file;

    // 如果压缩后更大（极少数情况），用原图
    if (blob.size >= file.size) return file;

    const baseName = (file.name || "photo").replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch (e) {
    console.warn("[imageCompress] 压缩失败，回退原图:", e?.message);
    return file;
  }
}
