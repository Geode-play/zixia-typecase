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

  if (!context) {
    throw new Error("当前浏览器无法创建 Canvas 渲染上下文。");
  }

  canvas.width = settings.width * scale;
  canvas.height = settings.height * scale;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  if (!isTransparentColor(settings.backgroundColor)) {
    context.fillStyle = settings.backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG 导出失败，请重试。"));
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
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadTextFile(content: string, fileName: string, type: string): void {
  downloadBlob(new Blob([content], { type }), fileName);
}

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = async () => {
      try {
        await image.decode?.();
      } catch {
        // Some browsers resolve onload after decode already completed.
      }

      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG 无法渲染为图片，请检查文件内容。"));
    };
    image.src = url;
  });
}
