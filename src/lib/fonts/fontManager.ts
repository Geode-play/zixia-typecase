import type { FontFormat, UploadedFont } from "../../types";
import { escapeCssString } from "../shared/text";

const formatByExtension: Record<string, FontFormat> = {
  ttf: "truetype",
  otf: "opentype",
  woff: "woff",
  woff2: "woff2",
};

const extensionPattern = /\.([^.]+)$/;

export async function createUploadedFonts(files: File[]): Promise<UploadedFont[]> {
  const supportedFiles = files.filter((file) => getFontFormat(file.name));

  return Promise.all(
    supportedFiles.map(async (file, index) => {
      const format = getFontFormat(file.name)!;
      const family = createFontFamily(file.name, index);
      const dataUrl = await readFileAsDataUrl(file);

      return {
        id: `${Date.now()}-${index}-${file.name}`,
        name: file.name,
        family,
        file,
        url: URL.createObjectURL(file),
        dataUrl,
        format,
        kind: "uploaded",
        sourceLabel: "上傳字体",
      };
    }),
  );
}

export function buildFontFaceCss(fonts: UploadedFont[]): string {
  return fonts
    .map((font) => {
      if (font.cssText) {
        return font.cssText;
      }

      const source = font.dataUrl || font.url;

      if (!source || !font.format) {
        return "";
      }

      return [
        "@font-face {",
        `  font-family: "${escapeCssString(font.family)}";`,
        `  src: url("${source}") format("${font.format}");`,
        "  font-display: block;",
        "}",
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

export function releaseUploadedFonts(fonts: UploadedFont[]): void {
  fonts.forEach((font) => {
    releaseUploadedFont(font);
  });
}

export function releaseUploadedFont(font: UploadedFont): void {
  if (font.kind === "uploaded" && font.url) {
    URL.revokeObjectURL(font.url);
  }
}

function getFontFormat(fileName: string): FontFormat | null {
  const extension = fileName.match(extensionPattern)?.[1]?.toLowerCase();

  if (!extension) {
    return null;
  }

  return formatByExtension[extension] ?? null;
}

function createFontFamily(fileName: string, index: number): string {
  const baseName = fileName.replace(extensionPattern, "").trim() || "Uploaded Font";
  const safeName = baseName.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "");

  return `UploadedFont-${safeName || "Font"}-${index + 1}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`无法讀取字体文件：${file.name}`));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
