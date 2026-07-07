import type { CanvasSettings, ExportScale } from "../../types";
import { isTransparentColor } from "../shared/text";

export async function exportSvgToPng(
  svg: string,
  settings: CanvasSettings,
  scale: ExportScale,
): Promise<Blob> {
  const image = await loadSvgImage(svg);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const width = Math.max(Math.round(settings.width * scale), 1);
  const height = Math.max(Math.round(settings.height * scale), 1);

  if (!context) {
    throw new Error("当前瀏覽器无法創建 Canvas 渲染上下文。");
  }

  canvas.width = width;
  canvas.height = height;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  if (!isTransparentColor(settings.backgroundColor)) {
    context.fillStyle = settings.backgroundColor;
    context.fillRect(0, 0, width, height);
  }

  context.drawImage(image, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG 導出失敗，請重試。"));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 60000);
}

export function downloadTextFile(content: string, fileName: string, type: string): void {
  downloadBlob(new Blob([content], { type }), fileName);
}

async function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  try {
    return await loadImageFromUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  } catch {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    try {
      return await loadImageFromUrl(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeoutId = window.setTimeout(() => {
      reject(new Error("SVG 渲染超時，請確認文件中是否包含外部圖片或過大的字体。"));
    }, 10000);

    image.onload = async () => {
      try {
        await image.decode?.();
      } catch {
        // Some browsers resolve onload after decode already completed.
      }

      window.clearTimeout(timeoutId);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timeoutId);
      reject(new Error("SVG 无法渲染爲圖片，請確認文件内容。"));
    };
    image.src = url;
  });
}
