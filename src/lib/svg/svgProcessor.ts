import type { CanvasSettings, SvgProcessingReport, SvgProcessingResult, UploadedFont } from "../../types";
import { buildFontFaceCss } from "../fonts/fontManager";
import { escapeCssString, isTransparentColor } from "../shared/text";

type ApplySvgPresentationOptions = {
  fonts: UploadedFont[];
  selectedChineseFontFamily: string;
  selectedEnglishFontFamily: string;
  settings: CanvasSettings;
};

const svgNamespace = "http://www.w3.org/2000/svg";
const injectedStyleSelector = "style[data-svg-font-switcher]";
const injectedBackgroundSelector = "rect[data-svg-font-switcher-background]";

export function applySvgPresentation(svg: string, options: ApplySvgPresentationOptions): string {
  return processSvgPresentation(svg, options).svg;
}

export function processSvgPresentation(
  svg: string,
  options: ApplySvgPresentationOptions,
): SvgProcessingResult {
  const parser = new DOMParser();
  const document = parser.parseFromString(svg, "image/svg+xml");
  const parserError = document.querySelector("parsererror");

  if (parserError) {
    throw new Error("SVG 文件无法解析，请确认文件内容有效。");
  }

  const svgElement = document.documentElement;

  if (svgElement.nodeName.toLowerCase() !== "svg") {
    throw new Error("上传文件不是有效的 SVG。");
  }

  const sanitizeReport = sanitizeSvg(svgElement);
  const hasViewBox = Boolean(svgElement.getAttribute("viewBox"));
  configureCanvas(svgElement, options.settings);
  const injectedBackground = injectBackground(svgElement, options.settings);
  const textReport = injectFontStyle(
    svgElement,
    options.fonts,
    options.selectedChineseFontFamily,
    options.selectedEnglishFontFamily,
  );

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
  svgElement.setAttribute("preserveAspectRatio", svgElement.getAttribute("preserveAspectRatio") ?? "xMidYMid meet");

  if (!svgElement.getAttribute("viewBox")) {
    svgElement.setAttribute("viewBox", `0 0 ${settings.width} ${settings.height}`);
  }
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

function injectFontStyle(
  svgElement: Element,
  fonts: UploadedFont[],
  selectedChineseFontFamily: string,
  selectedEnglishFontFamily: string,
): Pick<
  SvgProcessingReport,
  "textElementCount" | "changedTextElementCount" | "cjkTextElementCount" | "latinTextElementCount"
> {
  svgElement.querySelector(injectedStyleSelector)?.remove();

  const selectedFontFamilies = new Set(
    [selectedChineseFontFamily, selectedEnglishFontFamily].filter(Boolean),
  );
  const selectedFonts = fonts.filter((font) => selectedFontFamilies.has(font.family));
  const fontFaceCss = buildFontFaceCss(selectedFonts);

  if (fontFaceCss) {
    const style = svgElement.ownerDocument.createElementNS(svgNamespace, "style");
    style.setAttribute("data-svg-font-switcher", "true");
    style.textContent = fontFaceCss;
    svgElement.insertBefore(style, svgElement.firstChild);
  }

  return applyFontFamilyToTextElements(
    svgElement,
    selectedChineseFontFamily,
    selectedEnglishFontFamily,
  );
}

function applyFontFamilyToTextElements(
  svgElement: Element,
  selectedChineseFontFamily: string,
  selectedEnglishFontFamily: string,
): Pick<
  SvgProcessingReport,
  "textElementCount" | "changedTextElementCount" | "cjkTextElementCount" | "latinTextElementCount"
> {
  const textElements = Array.from(svgElement.querySelectorAll("text, tspan, textPath"));
  let changedTextElementCount = 0;
  let cjkTextElementCount = 0;
  let latinTextElementCount = 0;

  textElements.forEach((element) => {
    const text = element.textContent ?? "";
    const hasCjk = hasCjkText(text);
    const hasLatin = hasLatinText(text);
    const fontStack = createFontStack(hasCjk, selectedChineseFontFamily, selectedEnglishFontFamily);

    if (hasCjk) {
      cjkTextElementCount += 1;
    }

    if (hasLatin) {
      latinTextElementCount += 1;
    }

    if (fontStack) {
      changedTextElementCount += 1;
      element.setAttribute("style", upsertFontFamily(element.getAttribute("style"), fontStack));
    }
  });

  return {
    textElementCount: textElements.length,
    changedTextElementCount,
    cjkTextElementCount,
    latinTextElementCount,
  };
}

function createFontStack(
  hasCjk: boolean,
  selectedChineseFontFamily: string,
  selectedEnglishFontFamily: string,
): string {
  const families = hasCjk
    ? [selectedChineseFontFamily, selectedEnglishFontFamily]
    : [selectedEnglishFontFamily, selectedChineseFontFamily];

  return families.filter(Boolean).map((family) => `"${escapeCssString(family)}"`).join(", ");
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

      if (attributeName.startsWith("on") || attributeName === "href" && /^\s*javascript:/i.test(attribute.value)) {
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

function hasCjkText(value: string): boolean {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(value);
}

function hasLatinText(value: string): boolean {
  return /[a-z]/i.test(value);
}
