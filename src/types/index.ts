export type FontFormat = "truetype" | "opentype" | "woff" | "woff2";
export type FontKind = "uploaded" | "system";
export type PreviewZoom = number;
export type PreviewMode = "grid" | "focusFit";
export type SvgTextKind = "cjk" | "latin" | "mixed" | "empty" | "other";

export type FontRules = {
  cjkFontFamily: string;
  latinFontFamily: string;
  mixedTextPolicy: "preserve";
};

export type TextOverride = {
  fontFamily?: string;
  fontSizePercent?: number;
  textContent?: string;
};

export type TextOverrides = Record<string, TextOverride>;

export type UploadedFont = {
  id: string;
  name: string;
  family: string;
  file?: File;
  url?: string;
  dataUrl?: string;
  format?: FontFormat;
  kind?: FontKind;
  license?: string;
  cssText?: string;
  cssUrl?: string;
  sourceLabel?: string;
  systemFont?: {
    fullName: string;
    postscriptName: string;
    style: string;
  };
};

export type CanvasSettings = {
  width: number;
  height: number;
  backgroundColor: string;
};

export type CanvasVersion = {
  id: string;
  name: string;
  settings: CanvasSettings;
  svgSource?: string;
  svgFileName?: string;
  selectedFontFamily?: string;
  fontRules?: FontRules;
  textOverrides?: TextOverrides;
};

export type ExportScale = 1 | 2 | 3 | 4;

export type SvgProcessingReport = {
  textElementCount: number;
  changedTextElementCount: number;
  pureCjkTextElementCount: number;
  pureLatinTextElementCount: number;
  mixedTextElementCount: number;
  emptyTextElementCount: number;
  removedScriptCount: number;
  removedEventAttributeCount: number;
  injectedBackground: boolean;
  hasViewBox: boolean;
  textNodes: SvgTextNodeReport[];
};

export type SvgTextNodeReport = {
  id: string;
  text: string;
  originalText: string;
  kind: SvgTextKind;
  elementType: "text" | "tspan" | "textPath";
  originalFontFamily: string;
  effectiveFontFamily: string;
  effectiveFontSizePercent?: number;
  hasTextOverride: boolean;
  hasOverride: boolean;
};

export type SvgProcessingResult = {
  svg: string;
  report: SvgProcessingReport;
};
