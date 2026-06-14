import type { BuiltInFontDefinition, FontCategory, UploadedFont } from "../../types";

const fontsourceCdnBase = "https://cdn.jsdelivr.net/npm";

export const builtInFontCatalog: BuiltInFontDefinition[] = [
  {
    id: "noto-sans-sc",
    name: "Noto Sans SC",
    family: "Noto Sans SC Variable",
    license: "SIL OFL 1.1",
    language: "中文 / English",
    category: "zh",
    cssUrl: `${fontsourceCdnBase}/@fontsource-variable/noto-sans-sc@5.2.10/index.css`,
  },
  {
    id: "noto-serif-sc",
    name: "Noto Serif SC",
    family: "Noto Serif SC Variable",
    license: "SIL OFL 1.1",
    language: "中文 / English",
    category: "zh",
    cssUrl: `${fontsourceCdnBase}/@fontsource-variable/noto-serif-sc@5.2.10/index.css`,
  },
  {
    id: "inter",
    name: "Inter",
    family: "Inter Variable",
    license: "SIL OFL 1.1",
    language: "English / Latin",
    category: "en",
    cssUrl: `${fontsourceCdnBase}/@fontsource-variable/inter@5.2.8/index.css`,
  },
  {
    id: "roboto-mono",
    name: "Roboto Mono",
    family: "Roboto Mono Variable",
    license: "Apache 2.0 / OFL",
    language: "English / Code",
    category: "en",
    cssUrl: `${fontsourceCdnBase}/@fontsource-variable/roboto-mono@5.2.9/index.css`,
  },
];

const loadedBuiltInFonts = new Map<string, UploadedFont>();

export async function loadBuiltInFont(fontId: string): Promise<UploadedFont> {
  const cachedFont = loadedBuiltInFonts.get(fontId);

  if (cachedFont) {
    return cachedFont;
  }

  const definition = builtInFontCatalog.find((font) => font.id === fontId);

  if (!definition) {
    throw new Error("未找到该内置字体。");
  }

  const cssText = await fetchCssText(definition.cssUrl, `内置字体加载失败：${definition.name}`);
  const font: UploadedFont = {
    id: `built-in-${definition.id}`,
    name: definition.name,
    family: definition.family,
    kind: "built-in",
    license: definition.license,
    cssUrl: definition.cssUrl,
    cssText: absolutizeCssUrls(cssText, definition.cssUrl),
    sourceLabel: "内置远程字体",
    category: definition.category,
  };

  loadedBuiltInFonts.set(fontId, font);

  return font;
}

export async function loadRemoteCssFont(input: {
  name: string;
  family: string;
  cssUrl: string;
  category: FontCategory;
}): Promise<UploadedFont> {
  const cssUrl = input.cssUrl.trim();
  const family = input.family.trim();
  const name = input.name.trim() || family;

  if (!family) {
    throw new Error("请填写远程字体的 font-family。");
  }

  if (!/^https?:\/\//i.test(cssUrl)) {
    throw new Error("远程 CSS 地址必须以 http:// 或 https:// 开头。");
  }

  const cssText = await fetchCssText(cssUrl, "远程字体 CSS 加载失败");

  return {
    id: `remote-${Date.now()}-${family}`,
    name,
    family,
    kind: "remote",
    cssUrl,
    cssText: absolutizeCssUrls(cssText, cssUrl),
    sourceLabel: "远程 CSS",
    category: input.category,
  };
}

async function fetchCssText(cssUrl: string, errorPrefix: string): Promise<string> {
  const response = await fetch(cssUrl);

  if (!response.ok) {
    throw new Error(`${errorPrefix}：${response.status}`);
  }

  return response.text();
}

function absolutizeCssUrls(cssText: string, cssUrl: string): string {
  const absoluteCssUrl = new URL(cssUrl, window.location.href).href;

  return cssText.replace(/url\((['"]?)([^'")]+)\1\)/g, (_match, _quote, rawUrl: string) => {
    return `url("${new URL(rawUrl, absoluteCssUrl).href}")`;
  });
}
