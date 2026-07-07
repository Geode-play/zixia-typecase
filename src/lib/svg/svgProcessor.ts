import type {
  CanvasSettings,
  FontRules,
  SvgProcessingReport,
  SvgProcessingResult,
  SvgTextKind,
  SvgTextNodeReport,
  TextOverrides,
  UploadedFont,
} from "../../types";
import { buildFontFaceCss } from "../fonts/fontManager";
import { escapeCssString, isTransparentColor } from "../shared/text";

type ApplySvgPresentationOptions = {
  fonts: UploadedFont[];
  selectedFontFamily?: string;
  fontRules?: FontRules;
  textOverrides?: TextOverrides;
  selectedTextNodeId?: string;
  includeEditorAttributes?: boolean;
  styleScopeId?: string;
  settings: CanvasSettings;
};

const svgNamespace = "http://www.w3.org/2000/svg";
const injectedStyleSelector = "style[data-svg-font-switcher]";
const injectedEditorStyleSelector = "style[data-svg-font-switcher-editor]";
const injectedBackgroundSelector = "rect[data-svg-font-switcher-background]";
const injectedMixedRunSelector = "tspan[data-svg-font-switcher-mixed-run]";
const scopedStyleAttribute = "data-svg-font-switcher-scoped-style";
const styleScopeAttribute = "data-svg-font-switcher-scope";
const editorTextIdAttribute = "data-svg-font-switcher-text-id";
const editorTextKindAttribute = "data-svg-font-switcher-text-kind";
const editorSelectedAttribute = "data-svg-font-switcher-selected";

export function applySvgPresentation(svg: string, options: ApplySvgPresentationOptions): string {
  return processSvgPresentation(svg, { ...options, includeEditorAttributes: false }).svg;
}

export function processSvgPresentation(
  svg: string,
  options: ApplySvgPresentationOptions,
): SvgProcessingResult {
  const parser = new DOMParser();
  const document = parser.parseFromString(svg, "image/svg+xml");
  const parserError = document.querySelector("parsererror");

  if (parserError) {
    throw new Error("SVG 文件无法解析，請確認文件内容有效。");
  }

  const svgElement = document.documentElement;

  if (svgElement.nodeName.toLowerCase() !== "svg") {
    throw new Error("上傳文件不是有效的 SVG。");
  }

  const sanitizeReport = sanitizeSvg(svgElement);
  const hasViewBox = Boolean(svgElement.getAttribute("viewBox"));
  configureCanvas(svgElement, options.settings);
  scopeEmbeddedStyles(svgElement, options.styleScopeId);
  const injectedBackground = injectBackground(svgElement, options.settings);
  cleanupEditorAttributes(svgElement);
  const textReport = injectFontPresentation(svgElement, options);

  return {
    svg: new XMLSerializer().serializeToString(svgElement),
    report: {
      ...sanitizeReport,
      ...textReport,
      injectedBackground,
      hasViewBox,
    },
  };
}

function configureCanvas(svgElement: Element, settings: CanvasSettings): void {
  svgElement.setAttribute("xmlns", svgNamespace);
  svgElement.setAttribute("width", String(settings.width));
  svgElement.setAttribute("height", String(settings.height));
  svgElement.setAttribute(
    "preserveAspectRatio",
    svgElement.getAttribute("preserveAspectRatio") ?? "xMidYMid meet",
  );

  if (!svgElement.getAttribute("viewBox")) {
    svgElement.setAttribute("viewBox", `0 0 ${settings.width} ${settings.height}`);
  }
}

function scopeEmbeddedStyles(svgElement: Element, styleScopeId?: string): void {
  const normalizedScopeId = normalizeStyleScopeId(styleScopeId);

  if (!normalizedScopeId) {
    svgElement.removeAttribute(styleScopeAttribute);
    return;
  }

  svgElement.setAttribute(styleScopeAttribute, normalizedScopeId);

  const scopeSelector = `[${styleScopeAttribute}="${escapeCssString(normalizedScopeId)}"]`;
  Array.from(svgElement.querySelectorAll("style")).forEach((styleElement) => {
    if (
      styleElement.matches(injectedStyleSelector) ||
      styleElement.matches(injectedEditorStyleSelector) ||
      styleElement.getAttribute(scopedStyleAttribute) === normalizedScopeId
    ) {
      return;
    }

    styleElement.textContent = scopeCssText(styleElement.textContent ?? "", scopeSelector);
    styleElement.setAttribute(scopedStyleAttribute, normalizedScopeId);
  });
}

function normalizeStyleScopeId(styleScopeId?: string): string {
  return (styleScopeId ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function scopeCssText(cssText: string, scopeSelector: string): string {
  return cssText.replace(/(^|[{}])([^{}@]+)\{/g, (_match, boundary: string, selectorText: string) => {
    const leadingWhitespace = selectorText.match(/^\s*/)?.[0] ?? "";
    const trailingWhitespace = selectorText.match(/\s*$/)?.[0] ?? "";
    const rawSelectors = selectorText.trim();

    if (!rawSelectors) {
      return `${boundary}${selectorText}{`;
    }

    const scopedSelectors = rawSelectors
      .split(",")
      .map((selector) => scopeCssSelector(selector, scopeSelector))
      .join(", ");

    return `${boundary}${leadingWhitespace}${scopedSelectors}${trailingWhitespace}{`;
  });
}

function scopeCssSelector(selector: string, scopeSelector: string): string {
  const trimmedSelector = selector.trim();

  if (!trimmedSelector || trimmedSelector.includes(scopeSelector)) {
    return trimmedSelector;
  }

  if (trimmedSelector === "svg" || trimmedSelector === ":root") {
    return scopeSelector;
  }

  if (trimmedSelector.startsWith("svg")) {
    return `${scopeSelector}${trimmedSelector.slice(3)}`;
  }

  if (/^[>+~]/.test(trimmedSelector)) {
    return `${scopeSelector} ${trimmedSelector}`;
  }

  return `${scopeSelector} ${trimmedSelector}`;
}

function injectBackground(svgElement: Element, settings: CanvasSettings): boolean {
  const previousBackground = svgElement.querySelector(injectedBackgroundSelector);
  previousBackground?.remove();

  if (isTransparentColor(settings.backgroundColor)) {
    return false;
  }

  const viewBox = parseViewBox(svgElement.getAttribute("viewBox"), settings);
  const background = svgElement.ownerDocument.createElementNS(svgNamespace, "rect");
  background.setAttribute("data-svg-font-switcher-background", "true");
  background.setAttribute("x", String(viewBox.x));
  background.setAttribute("y", String(viewBox.y));
  background.setAttribute("width", String(viewBox.width));
  background.setAttribute("height", String(viewBox.height));
  background.setAttribute("fill", settings.backgroundColor);
  background.setAttribute("style", `fill: ${settings.backgroundColor} !important;`);

  svgElement.insertBefore(background, svgElement.firstChild);
  return true;
}

function injectFontPresentation(
  svgElement: Element,
  options: ApplySvgPresentationOptions,
): Pick<
  SvgProcessingReport,
  | "textElementCount"
  | "changedTextElementCount"
  | "pureCjkTextElementCount"
  | "pureLatinTextElementCount"
  | "mixedTextElementCount"
  | "emptyTextElementCount"
  | "textNodes"
> {
  svgElement.querySelector(injectedStyleSelector)?.remove();
  svgElement.querySelector(injectedEditorStyleSelector)?.remove();

  const fontRules = normalizeFontRules(options.fontRules, options.selectedFontFamily);
  const textReport = applyFontRulesToTextElements(svgElement, {
    fontRules,
    includeEditorAttributes: options.includeEditorAttributes ?? false,
    selectedTextNodeId: options.selectedTextNodeId,
    textOverrides: options.textOverrides ?? {},
  });
  const usedFontFamilies = new Set(
    textReport.textNodes
      .map((node) => node.effectiveFontFamily)
      .filter((family): family is string => Boolean(family)),
  );

  if (textReport.mixedTextElementCount > 0) {
    [fontRules.cjkFontFamily, fontRules.latinFontFamily]
      .filter(Boolean)
      .forEach((family) => usedFontFamilies.add(family));
  }

  const usedFonts = options.fonts.filter((font) => usedFontFamilies.has(font.family));
  const fontFaceCss = usedFonts.length > 0 ? buildFontFaceCss(usedFonts) : "";

  if (fontFaceCss) {
    const style = svgElement.ownerDocument.createElementNS(svgNamespace, "style");
    style.setAttribute("data-svg-font-switcher", "true");
    style.textContent = fontFaceCss;
    svgElement.insertBefore(style, svgElement.firstChild);
  }

  if (options.includeEditorAttributes) {
    injectEditorStyle(svgElement);
  }

  return textReport;
}

function applyFontRulesToTextElements(
  svgElement: Element,
  options: {
    fontRules: FontRules;
    includeEditorAttributes: boolean;
    selectedTextNodeId?: string;
    textOverrides: TextOverrides;
  },
): Pick<
  SvgProcessingReport,
  | "textElementCount"
  | "changedTextElementCount"
  | "pureCjkTextElementCount"
  | "pureLatinTextElementCount"
  | "mixedTextElementCount"
  | "emptyTextElementCount"
 | "textNodes"
> {
  const textElements = Array.from(svgElement.querySelectorAll("text, tspan, textPath"));
  const textNodes: SvgTextNodeReport[] = [];
  let changedTextElementCount = 0;
  let pureCjkTextElementCount = 0;
  let pureLatinTextElementCount = 0;
  let mixedTextElementCount = 0;
  let emptyTextElementCount = 0;

  textElements.forEach((element, index) => {
    const id = createTextNodeId(element, index);
    const override = options.textOverrides[id] ?? {};
    const originalText = element.textContent ?? "";
    const hasTextOverride = hasOwnValue(override, "textContent");
    const text = hasTextOverride ? override.textContent ?? "" : originalText;
    const trimmedText = text.trim();
    const kind = classifyText(trimmedText);
    const originalFontFamily = readFontFamily(element);
    const overrideFontFamily = override.fontFamily ?? "";
    const overrideFontSizePercent = normalizeFontSizePercent(override.fontSizePercent);
    const mixedRunFonts =
      kind === "mixed" && !overrideFontFamily
        ? createMixedRunFonts(options.fontRules)
        : undefined;
    const shouldSplitMixedRuns =
      Boolean(mixedRunFonts) && !hasMixedRunChildElements(element);
    const effectiveFontFamily =
      overrideFontFamily ||
      (kind === "mixed" ? "" : getFontFamilyForKind(kind, options.fontRules)) ||
      "";

    if (hasTextOverride && text !== originalText) {
      element.textContent = text;
    }

    if (kind === "empty") {
      emptyTextElementCount += 1;
    } else if (kind === "mixed") {
      mixedTextElementCount += 1;
    } else if (kind === "cjk") {
      pureCjkTextElementCount += 1;
    } else if (kind === "latin") {
      pureLatinTextElementCount += 1;
    }

    const didSplitMixedRuns =
      shouldSplitMixedRuns && mixedRunFonts
        ? splitMixedTextElement(element, text, mixedRunFonts)
        : false;

    if (effectiveFontFamily || overrideFontSizePercent || didSplitMixedRuns || hasTextOverride) {
      changedTextElementCount += 1;
      let style = element.getAttribute("style");

      if (effectiveFontFamily && !didSplitMixedRuns) {
        style = upsertFontFamily(style, quoteFontFamily(effectiveFontFamily));
      }

      if (overrideFontSizePercent) {
        style = upsertFontSizePercent(style, overrideFontSizePercent);
      }

      element.setAttribute("style", style ?? "");
    }

    if (options.includeEditorAttributes) {
      element.setAttribute(editorTextIdAttribute, id);
      element.setAttribute(editorTextKindAttribute, kind);

      if (id === options.selectedTextNodeId) {
        element.setAttribute(editorSelectedAttribute, "true");
      }
    }

    textNodes.push({
      id,
      text,
      originalText,
      kind,
      elementType: element.nodeName.toLowerCase() as SvgTextNodeReport["elementType"],
      originalFontFamily,
      effectiveFontFamily,
      effectiveFontSizePercent: overrideFontSizePercent,
      hasTextOverride,
      hasOverride: Boolean(overrideFontFamily || overrideFontSizePercent || hasTextOverride),
    });
  });

  return {
    textElementCount: textElements.length,
    changedTextElementCount,
    pureCjkTextElementCount,
    pureLatinTextElementCount,
    mixedTextElementCount,
    emptyTextElementCount,
    textNodes,
  };
}

function injectEditorStyle(svgElement: Element): void {
  const style = svgElement.ownerDocument.createElementNS(svgNamespace, "style");
  style.setAttribute("data-svg-font-switcher-editor", "true");
  style.textContent = `
    [${editorTextIdAttribute}] { cursor: pointer; }
    [${editorTextIdAttribute}]:hover {
      paint-order: stroke fill;
      stroke: rgba(48, 106, 126, 0.74);
      stroke-linejoin: round;
      stroke-width: 2px;
      vector-effect: non-scaling-stroke;
    }
    [${editorSelectedAttribute}="true"] {
      paint-order: stroke fill;
      stroke: rgba(35, 122, 150, 0.92);
      stroke-linejoin: round;
      stroke-width: 3px;
      vector-effect: non-scaling-stroke;
    }
  `;
  svgElement.insertBefore(style, svgElement.firstChild);
}

function cleanupEditorAttributes(svgElement: Element): void {
  svgElement.querySelector(injectedEditorStyleSelector)?.remove();
  unwrapInjectedMixedRuns(svgElement);

  Array.from(svgElement.querySelectorAll(`[${editorTextIdAttribute}]`)).forEach((element) => {
    element.removeAttribute(editorTextIdAttribute);
    element.removeAttribute(editorTextKindAttribute);
    element.removeAttribute(editorSelectedAttribute);
  });
}

function createMixedRunFonts(
  fontRules: FontRules,
): { cjkFontFamily: string; latinFontFamily: string } | undefined {
  const cjkFontFamily = fontRules.cjkFontFamily;
  const latinFontFamily = fontRules.latinFontFamily;

  if (!cjkFontFamily && !latinFontFamily) {
    return undefined;
  }

  return { cjkFontFamily, latinFontFamily };
}

function hasMixedRunChildElements(element: Element): boolean {
  return Array.from(element.children).some((child) => !child.hasAttribute("data-svg-font-switcher-mixed-run"));
}

function splitMixedTextElement(
  element: Element,
  text: string,
  fonts: { cjkFontFamily: string; latinFontFamily: string },
): boolean {
  if (!text.trim() || hasMixedRunChildElements(element)) {
    return false;
  }

  const runs = createScriptRuns(element.textContent ?? "", fonts);

  if (runs.length <= 1) {
    return false;
  }

  element.textContent = "";

  runs.forEach((run) => {
    const tspan = element.ownerDocument.createElementNS(svgNamespace, "tspan");
    tspan.setAttribute("data-svg-font-switcher-mixed-run", "true");
    if (run.fontFamily) {
      tspan.setAttribute("style", `font-family: ${quoteFontFamily(run.fontFamily)}`);
    }
    tspan.textContent = run.text;
    element.appendChild(tspan);
  });

  return true;
}

function unwrapInjectedMixedRuns(svgElement: Element): void {
  Array.from(svgElement.querySelectorAll(injectedMixedRunSelector)).forEach((element) => {
    const parent = element.parentNode;

    if (!parent) {
      return;
    }

    parent.replaceChild(element.ownerDocument.createTextNode(element.textContent ?? ""), element);
    parent.normalize();
  });
}

function createScriptRuns(
  text: string,
  fonts: { cjkFontFamily: string; latinFontFamily: string },
): Array<{ text: string; fontFamily: string }> {
  const rawRuns = Array.from(text).map((character, index, characters) => ({
    text: character,
    fontFamily: getCharacterFontFamily(character, index, characters, fonts),
  }));
  const runs: Array<{ text: string; fontFamily: string }> = [];

  rawRuns.forEach((run) => {
    const previousRun = runs[runs.length - 1];

    if (previousRun?.fontFamily === run.fontFamily) {
      previousRun.text += run.text;
      return;
    }

    runs.push({ ...run });
  });

  return runs;
}

function getCharacterFontFamily(
  character: string,
  index: number,
  characters: string[],
  fonts: { cjkFontFamily: string; latinFontFamily: string },
): string {
  if (hasCjkText(character)) {
    return fonts.cjkFontFamily;
  }

  if (hasLatinText(character) || /[0-9]/.test(character)) {
    return fonts.latinFontFamily;
  }

  const previousCharacter = characters[index - 1] ?? "";
  const nextCharacter = characters[index + 1] ?? "";

  if (hasLatinText(previousCharacter) || /[0-9]/.test(previousCharacter)) {
    return fonts.latinFontFamily;
  }

  if (hasCjkText(previousCharacter)) {
    return fonts.cjkFontFamily;
  }

  if (hasLatinText(nextCharacter) || /[0-9]/.test(nextCharacter)) {
    return fonts.latinFontFamily;
  }

  return fonts.cjkFontFamily;
}

function sanitizeSvg(
  svgElement: Element,
): Pick<SvgProcessingReport, "removedScriptCount" | "removedEventAttributeCount"> {
  const scripts = svgElement.querySelectorAll("script");
  let removedEventAttributeCount = 0;

  scripts.forEach((script) => script.remove());

  const allElements = [svgElement, ...Array.from(svgElement.querySelectorAll("*"))];

  allElements.forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const attributeName = attribute.name.toLowerCase();

      if (
        attributeName.startsWith("on") ||
        (attributeName === "href" && /^\s*javascript:/i.test(attribute.value))
      ) {
        element.removeAttribute(attribute.name);
        removedEventAttributeCount += 1;
      }
    });
  });

  return {
    removedScriptCount: scripts.length,
    removedEventAttributeCount,
  };
}

function normalizeFontRules(fontRules?: FontRules, selectedFontFamily = ""): FontRules {
  if (fontRules) {
    return fontRules;
  }

  return {
    cjkFontFamily: selectedFontFamily,
    latinFontFamily: selectedFontFamily,
    mixedTextPolicy: "preserve",
  };
}

function getFontFamilyForKind(kind: SvgTextKind, fontRules: FontRules): string {
  if (kind === "cjk") {
    return fontRules.cjkFontFamily;
  }

  if (kind === "latin") {
    return fontRules.latinFontFamily;
  }

  if (kind === "mixed") {
    return fontRules.cjkFontFamily || fontRules.latinFontFamily;
  }

  return "";
}

function classifyText(text: string): SvgTextKind {
  if (!text) {
    return "empty";
  }

  const hasCjk = hasCjkText(text);
  const hasLatin = hasLatinText(text);

  if (hasCjk && hasLatin) {
    return "mixed";
  }

  if (hasCjk) {
    return "cjk";
  }

  if (hasLatin) {
    return "latin";
  }

  return "other";
}

function createTextNodeId(element: Element, index: number): string {
  const tagName = element.nodeName.toLowerCase();

  return `text-${index + 1}-${tagName}`;
}

function readFontFamily(element: Element): string {
  const directFontFamily = element.getAttribute("font-family");

  if (directFontFamily) {
    return directFontFamily;
  }

  const styleFontFamily = element
    .getAttribute("style")
    ?.split(";")
    .map((declaration) => declaration.trim())
    .find((declaration) => declaration.toLowerCase().startsWith("font-family:"));

  return styleFontFamily?.replace(/^font-family\s*:\s*/i, "").trim() ?? "";
}

function parseViewBox(
  viewBox: string | null,
  settings: CanvasSettings,
): { x: number; y: number; width: number; height: number } {
  const values = viewBox
    ?.trim()
    .split(/[\s,]+/)
    .map((value) => Number(value));

  if (values?.length === 4 && values.every(Number.isFinite)) {
    return {
      x: values[0],
      y: values[1],
      width: values[2],
      height: values[3],
    };
  }

  return {
    x: 0,
    y: 0,
    width: settings.width,
    height: settings.height,
  };
}

function upsertFontFamily(style: string | null, fontStack: string): string {
  const declarations = (style ?? "")
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .filter((declaration) => !declaration.toLowerCase().startsWith("font-family:"));

  declarations.push(`font-family: ${fontStack}`);

  return declarations.join("; ");
}

function upsertFontSizePercent(style: string | null, fontSizePercent: number): string {
  const declarations = (style ?? "")
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .filter((declaration) => !declaration.toLowerCase().startsWith("font-size:"));

  declarations.push(`font-size: ${fontSizePercent}%`);

  return declarations.join("; ");
}

function normalizeFontSizePercent(value?: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  const nextValue = Math.round(value);

  return nextValue >= 20 && nextValue <= 300 && nextValue !== 100 ? nextValue : undefined;
}

function hasOwnValue<T extends object>(target: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function quoteFontFamily(fontFamily: string): string {
  return `"${escapeCssString(fontFamily)}"`;
}

function hasCjkText(value: string): boolean {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(value);
}

function hasLatinText(value: string): boolean {
  return /[a-z]/i.test(value);
}
