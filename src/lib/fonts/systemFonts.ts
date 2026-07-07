import type { UploadedFont } from "../../types";

type LocalFontData = {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
};

type LocalFontWindow = Window & {
  queryLocalFonts?: () => Promise<LocalFontData[]>;
};

export function isSystemFontAccessSupported(): boolean {
  return typeof (window as LocalFontWindow).queryLocalFonts === "function";
}

export async function loadSystemFonts(): Promise<UploadedFont[]> {
  const queryLocalFonts = (window as LocalFontWindow).queryLocalFonts;

  if (!queryLocalFonts) {
    throw new Error("当前瀏覽器不支持讀取系統字体。");
  }

  const localFonts = await queryLocalFonts();
  const fontsByFamily = new Map<string, UploadedFont>();

  localFonts.forEach((font) => {
    const family = font.family.trim();

    if (!family || fontsByFamily.has(family)) {
      return;
    }

    fontsByFamily.set(family, {
      id: `system-${family}`,
      name: family,
      family,
      kind: "system",
      sourceLabel: "系統字体",
      systemFont: {
        fullName: font.fullName,
        postscriptName: font.postscriptName,
        style: font.style,
      },
    });
  });

  return Array.from(fontsByFamily.values()).sort((first, second) =>
    first.name.localeCompare(second.name),
  );
}
