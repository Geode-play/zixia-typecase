export type FontFormat = "truetype" | "opentype" | "woff" | "woff2";
export type FontCategory = "zh" | "en";
export type FontKind = "uploaded" | "built-in" | "remote";

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
  category?: FontCategory;
};

export type BuiltInFontDefinition = {
  id: string;
  name: string;
  family: string;
  license: string;
  language: string;
  category: FontCategory;
  cssUrl: string;
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
  selectedChineseFontFamily: string;
  selectedEnglishFontFamily: string;
};

export type ExportScale = 1 | 2 | 3 | 4;

export type SvgProcessingReport = {
  textElementCount: number;
  changedTextElementCount: number;
  cjkTextElementCount: number;
  latinTextElementCount: number;
  removedScriptCount: number;
  removedEventAttributeCount: number;
  injectedBackground: boolean;
  hasViewBox: boolean;
};

export type SvgProcessingResult = {
  svg: string;
  report: SvgProcessingReport;
};
