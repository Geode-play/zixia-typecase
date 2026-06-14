import type { BuiltInFontDefinition, FontCategory, UploadedFont } from "../types";

type LoadBuiltInFontOptions = {
  selectCategory?: FontCategory;
};

type FontControlsProps = {
  fonts: UploadedFont[];
  builtInFonts: BuiltInFontDefinition[];
  loadingBuiltInFontId: string;
  selectedChineseFontFamily: string;
  selectedEnglishFontFamily: string;
  onLoadBuiltInFont: (fontId: string, options?: LoadBuiltInFontOptions) => void;
  onRemoveFont: (fontId: string) => void;
  onSelectChineseFont: (fontFamily: string) => void;
  onSelectEnglishFont: (fontFamily: string) => void;
};

type FontOption = {
  builtInId?: string;
  family: string;
  label: string;
  loaded: boolean;
};

export function FontControls({
  fonts,
  builtInFonts,
  loadingBuiltInFontId,
  selectedChineseFontFamily,
  selectedEnglishFontFamily,
  onLoadBuiltInFont,
  onRemoveFont,
  onSelectChineseFont,
  onSelectEnglishFont,
}: FontControlsProps) {
  return (
    <div className="control-group">
      <div className="control-group__title">当前画布字体</div>

      <FontSelect
        builtInFonts={builtInFonts}
        category="zh"
        fonts={fonts}
        loadingBuiltInFontId={loadingBuiltInFontId}
        selectedFontFamily={selectedChineseFontFamily}
        title="中文字体"
        onLoadBuiltInFont={onLoadBuiltInFont}
        onSelectFont={onSelectChineseFont}
      />

      <FontSelect
        builtInFonts={builtInFonts}
        category="en"
        fonts={fonts}
        loadingBuiltInFontId={loadingBuiltInFontId}
        selectedFontFamily={selectedEnglishFontFamily}
        title="英文字体"
        onLoadBuiltInFont={onLoadBuiltInFont}
        onSelectFont={onSelectEnglishFont}
      />

      <div className="font-manager">
        <div className="mini-title">已加载字体</div>
        {fonts.length === 0 ? (
          <span className="empty-line">还没有加载字体</span>
        ) : (
          fonts.map((font) => (
            <div className="font-row" key={font.id}>
              <span className="font-row__name">{font.name}</span>
              <span>{font.sourceLabel ?? getFontKindLabel(font)}</span>
              <button type="button" onClick={() => onRemoveFont(font.id)}>
                移除
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

type FontSelectProps = {
  builtInFonts: BuiltInFontDefinition[];
  category: FontCategory;
  fonts: UploadedFont[];
  loadingBuiltInFontId: string;
  selectedFontFamily: string;
  title: string;
  onLoadBuiltInFont: (fontId: string, options?: LoadBuiltInFontOptions) => void;
  onSelectFont: (fontFamily: string) => void;
};

function FontSelect({
  builtInFonts,
  category,
  fonts,
  loadingBuiltInFontId,
  selectedFontFamily,
  title,
  onLoadBuiltInFont,
  onSelectFont,
}: FontSelectProps) {
  const options = createFontOptions(fonts, builtInFonts, category, loadingBuiltInFontId);

  return (
    <label className="font-select-field">
      <span>{title}</span>
      <select
        value={selectedFontFamily}
        onChange={(event) => {
          const fontFamily = event.target.value;

          if (!fontFamily) {
            onSelectFont("");
            return;
          }

          const option = options.find((item) => item.family === fontFamily);

          if (option?.loaded) {
            onSelectFont(fontFamily);
            return;
          }

          if (option?.builtInId) {
            onLoadBuiltInFont(option.builtInId, { selectCategory: category });
          }
        }}
      >
        <option value="">保留 SVG 原字体</option>
        {options.map((option) => (
          <option key={`${category}-${option.family}`} value={option.family}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function createFontOptions(
  fonts: UploadedFont[],
  builtInFonts: BuiltInFontDefinition[],
  category: FontCategory,
  loadingBuiltInFontId: string,
): FontOption[] {
  const loadedOptions: FontOption[] = fonts
    .filter((font) => !font.category || font.category === category)
    .map((font) => ({
      family: font.family,
      label: `${font.name} · ${font.sourceLabel ?? getFontKindLabel(font)}`,
      loaded: true,
    }));

  const builtInOptions: FontOption[] = builtInFonts
    .filter((font) => font.category === category)
    .map((font) => {
      const loaded = fonts.some((item) => item.family === font.family);
      const status = font.id === loadingBuiltInFontId ? "加载中" : loaded ? "可用" : "点击加载";

      return {
        builtInId: font.id,
        family: font.family,
        label: `${font.name} · ${font.language} · ${font.license} · ${status}`,
        loaded,
      };
    });

  return [...builtInOptions, ...loadedOptions];
}

function getFontKindLabel(font: UploadedFont): string {
  if (font.kind === "built-in") {
    return "内置字体";
  }

  if (font.kind === "remote") {
    return "远程字体";
  }

  return "上传字体";
}
