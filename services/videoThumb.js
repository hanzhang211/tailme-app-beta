/**
 * services/videoThumb.js
 *
 * 前端用 <video> + <canvas> 抽取视频第一帧作为缩略图（不依赖 ffmpeg）。
 * 返回 { thumbFile, duration, width, height }；失败时 reject，调用方回退默认封面。
 */
export async function captureVideoThumbnail(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("没有视频文件"));
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const cleanup = () => { try { URL.revokeObjectURL(url); } catch {} };
    let done = false;
    const fail = (msg) => { if (done) return; done = true; cleanup(); reject(new Error(msg || "缩略图生成失败")); };

    const grab = () => {
      if (done) return;
      try {
        const w = video.videoWidth, h = video.videoHeight;
        if (!w || !h) return fail("无法读取视频尺寸");
        const maxDim = 720;
        const ratio = Math.min(1, maxDim / Math.max(w, h));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w * ratio));
        canvas.height = Math.max(1, Math.round(h * ratio));
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) return fail();
          done = true;
          cleanup();
          resolve({
            thumbFile: new File([blob], "thumb.jpg", { type: "image/jpeg" }),
            duration: Math.round(video.duration || 0),
            width: canvas.width,
            height: canvas.height,
          });
        }, "image/jpeg", 0.8);
      } catch (e) { fail(e?.message); }
    };

    video.onloadedmetadata = () => {
      const seekTo = Math.min(0.5, (video.duration || 1) / 2);
      video.onseeked = grab;
      try { video.currentTime = seekTo; }
      catch { grab(); }
    };
    video.onerror = () => fail("无法读取视频");
    // 兜底超时
    setTimeout(() => fail("视频读取超时"), 10000);
  });
}

/** 秒数 → mm:ss */
export function fmtDuration(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
