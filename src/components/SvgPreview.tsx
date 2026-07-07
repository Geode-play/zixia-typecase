import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type WheelEvent,
} from "react";
import { ChevronLeft, ChevronRight, Grid3X3, X } from "lucide-react";
import rough from "roughjs/bin/rough";
import { isTransparentColor } from "../lib/shared/text";
import type { AppCopy } from "../i18n";
import type { PreviewMode, PreviewZoom, SvgTextKind, SvgTextNodeReport, TextOverride } from "../types";
import {
  WiredButton,
  WiredInput,
  WiredSlider,
} from "./wired/WiredElements";

export type PreviewVariant = {
  backgroundColor: string;
  id: string;
  label: string;
  width: number;
  height: number;
  svg: string;
};

export type PreviewFontOption = {
  family: string;
  kind: "uploaded" | "system";
  label: string;
  searchText: string;
};

export type TextSelectionAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TextNodeSelection = {
  canvasId: string;
  id: string;
  anchor: TextSelectionAnchor;
};

type SvgPreviewProps = {
  activeVariantId?: string;
  svg: string;
  width: number;
  height: number;
  backgroundColor: string;
  variants?: PreviewVariant[];
  canRemoveVariant?: boolean;
  copy: AppCopy["preview"];
  fontOptions?: PreviewFontOption[];
  mode?: PreviewMode;
  selectedTextAnchor?: TextSelectionAnchor | null;
  selectedTextNode?: SvgTextNodeReport;
  selectedTextOverride?: TextOverride;
  zoom?: PreviewZoom;
  onClearTextSelection?: () => void;
  onExitFocus?: () => void;
  onFocusVariant?: (variantId: string, fitZoom?: PreviewZoom) => void;
  onChangeTextContent?: (textContent: string) => void;
  onChangeTextFontSizePercent?: (fontSizePercent: number) => void;
  onRemoveVariant?: (variantId: string) => void;
  onResetTextOverride?: () => void;
  onSelectTextNode?: (selection: TextNodeSelection) => void;
  onSelectTextOverride?: (fontFamily: string) => void;
  onSelectVariant?: (variantId: string) => void;
  onUploadSvgFiles?: (files: File[]) => void;
  onWheelZoom?: (deltaY: number) => void;
};

export function SvgPreview({
  activeVariantId,
  svg,
  width,
  height,
  backgroundColor,
  canRemoveVariant = false,
  copy,
  fontOptions = [],
  variants = [],
  mode = "grid",
  selectedTextAnchor,
  selectedTextNode,
  selectedTextOverride,
  zoom = 100,
  onClearTextSelection,
  onExitFocus,
  onFocusVariant,
  onChangeTextContent,
  onChangeTextFontSizePercent,
  onRemoveVariant,
  onResetTextOverride,
  onSelectTextNode,
  onSelectTextOverride,
  onSelectVariant,
  onUploadSvgFiles,
  onWheelZoom,
}: SvgPreviewProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const railItemsRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const lastWheelSwitchAtRef = useRef(0);

  const allItems =
    variants.length > 0
      ? variants
      : [{ backgroundColor, id: activeVariantId ?? "current", label: copy.currentCanvas, width, height, svg }];
  const activeItem = allItems.find((item) => item.id === activeVariantId) ?? allItems[0];
  const activeIndex = Math.max(
    allItems.findIndex((item) => item.id === activeItem.id),
    0,
  );
  const canEditText = allItems.length <= 1 || mode === "focusFit";
  const viewportStyle = {
    ["--workspace-zoom" as string]: getZoomScale(zoom),
  };

  useEffect(() => {
    if (mode !== "focusFit") {
      return;
    }

    const railItems = railItemsRef.current;
    const activeRailItem = railItems?.querySelector<HTMLElement>(".focus-rail__item.is-active");

    if (!railItems || !activeRailItem) {
      return;
    }

    railItems.scrollTo({
      behavior: "smooth",
      left: Math.max(
        activeRailItem.offsetLeft - railItems.clientWidth / 2 + activeRailItem.offsetWidth / 2,
        0,
      ),
    });
  }, [activeItem.id, mode]);

  if (!svg) {
    return (
      <div className="preview-shell preview-shell--empty">
        <RoughPreviewGrid />
        <div className="empty-state">
          <strong>{copy.uploadSvg}</strong>
          <span>{copy.emptyHint}</span>
          <div className="empty-state__upload">
            <input
              ref={uploadInputRef}
              accept=".svg,image/svg+xml"
              multiple
              type="file"
              onChange={(event) => {
                onUploadSvgFiles?.(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
            <WiredButton onClick={() => uploadInputRef.current?.click()}>{copy.chooseSvg}</WiredButton>
          </div>
        </div>
      </div>
    );
  }

  function selectByOffset(offset: number) {
    if (allItems.length === 0) {
      return;
    }

    selectFocusedCanvas(Math.min(Math.max(activeIndex + offset, 0), allItems.length - 1));
  }

  function selectFocusedCanvas(index: number) {
    const nextItem = allItems[index];

    if (!nextItem || nextItem.id === activeItem.id) {
      return;
    }

    onFocusVariant?.(nextItem.id, calculateFitZoom(viewportRef.current, nextItem.width, nextItem.height));
  }

  function focusItem(item: PreviewVariant) {
    onFocusVariant?.(item.id, calculateFitZoom(viewportRef.current, item.width, item.height));
  }

  function handleTextClick(event: MouseEvent<HTMLDivElement>, variantId: string) {
    if (!canEditText) {
      return;
    }

    event.stopPropagation();

    const textElement = findTextElementFromEvent(event);
    const textNodeId = textElement?.getAttribute("data-svg-font-switcher-text-id");

    if (!textElement || !textNodeId) {
      onClearTextSelection?.();
      return;
    }

    const shellRect = shellRef.current?.getBoundingClientRect();
    const textRect = textElement.getBoundingClientRect();
    const anchor =
      shellRect && textRect.width > 0 && textRect.height > 0
        ? {
            x: textRect.left - shellRect.left,
            y: textRect.top - shellRect.top,
            width: textRect.width,
            height: textRect.height,
          }
        : {
            x: shellRect ? event.clientX - shellRect.left : event.clientX,
            y: shellRect ? event.clientY - shellRect.top : event.clientY,
            width: 1,
            height: 1,
          };

    onSelectTextNode?.({ canvasId: variantId, id: textNodeId, anchor });
  }

  function handleViewportWheel(event: WheelEvent<HTMLDivElement>) {
    if (onWheelZoom && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onWheelZoom(event.deltaY);
      return;
    }

    if (mode !== "focusFit" || allItems.length <= 1) {
      return;
    }

    event.preventDefault();

    const now = window.performance.now();
    if (now - lastWheelSwitchAtRef.current < 320 || Math.abs(event.deltaY) < 4) {
      return;
    }

    lastWheelSwitchAtRef.current = now;
    selectByOffset(event.deltaY > 0 ? 1 : -1);
  }

  const shellClassName = mode === "focusFit" ? "preview-shell preview-shell--focus" : "preview-shell";

  return (
    <div className={shellClassName} ref={shellRef}>
      <RoughPreviewGrid />
      <div className="focus-header">
        <h2>{copy.canvas}</h2>
        {mode === "focusFit" ? (
          <div className="focus-header__tools">
            <span>
              {activeItem.label} {activeItem.width} x {activeItem.height}
            </span>
            <WiredButton
              ariaLabel={copy.backToOverview}
              className="focus-grid-button"
              title={copy.backToOverview}
              onClick={onExitFocus}
            >
              <Grid3X3 size={15} />
            </WiredButton>
          </div>
        ) : null}
      </div>

      <div
        className={createPreviewViewportClass(mode, allItems.length)}
        ref={viewportRef}
        style={viewportStyle}
        onWheel={handleViewportWheel}
      >
        {mode === "focusFit" ? (
          <div className="preview-focus-stage">
            <PreviewItem
              activeVariantId={activeVariantId}
              canRemoveVariant={canRemoveVariant}
              copy={copy}
              item={activeItem}
              mode={mode}
              onClearTextSelection={onClearTextSelection}
              onFocusItem={focusItem}
              onRemoveVariant={onRemoveVariant}
              onSelectVariant={onSelectVariant}
              onTextClick={handleTextClick}
              zoom={zoom}
            />
          </div>
        ) : (
          <div className={createPreviewStageClass(mode, allItems.length)}>
            {allItems.map((item) => (
              <PreviewItem
                activeVariantId={activeVariantId}
                canRemoveVariant={canRemoveVariant}
                copy={copy}
                item={item}
                key={item.id}
                mode={mode}
                onClearTextSelection={onClearTextSelection}
                onFocusItem={focusItem}
                onRemoveVariant={onRemoveVariant}
                onSelectVariant={onSelectVariant}
                onTextClick={handleTextClick}
                zoom={zoom}
              />
            ))}
          </div>
        )}
      </div>

      {canEditText && selectedTextNode && selectedTextAnchor ? (
        <TextContextPopover
          anchor={selectedTextAnchor}
          fontOptions={fontOptions}
          selectedOverride={selectedTextOverride}
          textNode={selectedTextNode}
          copy={copy}
          onClose={onClearTextSelection}
          onChangeTextContent={onChangeTextContent}
          onChangeTextFontSizePercent={onChangeTextFontSizePercent}
          onResetTextOverride={onResetTextOverride}
          onSelectTextOverride={onSelectTextOverride}
        />
      ) : null}

      {mode === "focusFit" ? (
        <div className="focus-rail" aria-label={copy.canvasSwitcher}>
          <button
            aria-label={copy.previousCanvas}
            className="focus-rail__arrow"
            disabled={activeIndex === 0}
            type="button"
            onClick={() => selectByOffset(-1)}
          >
            <ChevronLeft size={15} />
          </button>
          <div className="focus-rail__items" ref={railItemsRef}>
            {allItems.map((item, index) => (
              <button
                aria-current={item.id === activeItem.id ? "true" : undefined}
                className={item.id === activeItem.id ? "focus-rail__item is-active" : "focus-rail__item"}
                key={item.id}
                type="button"
                onClick={() => selectFocusedCanvas(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <button
            aria-label={copy.nextCanvas}
            className="focus-rail__arrow"
            disabled={activeIndex >= allItems.length - 1}
            type="button"
            onClick={() => selectByOffset(1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function RoughPreviewGrid() {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const container = svg?.parentElement;

    if (!svg || !container) {
      return;
    }

    const draw = () => {
      const width = Math.max(Math.round(container.clientWidth), 1);
      const height = Math.max(Math.round(container.clientHeight), 1);
      const grid = rough.svg(svg);
      const spacing = 34;
      const stroke = getComputedStyle(container).getPropertyValue("--grid-line").trim() || "rgba(61, 71, 71, 0.12)";

      svg.replaceChildren();
      svg.setAttribute("width", `${width}`);
      svg.setAttribute("height", `${height}`);
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

      let column = 0;
      for (let x = -spacing; x <= width + spacing; x += spacing + Math.sin(column * 1.71) * 4 + Math.cos(column * 0.63) * 2) {
        const jitter = Math.sin(x * 0.037 + column) * 5;
        svg.appendChild(
          grid.line(x + jitter, -6, x - jitter * 0.45, height + 6, {
            bowing: 0.5,
            roughness: 2,
            stroke,
            strokeWidth: 0.8,
          }),
        );
        column += 1;
      }

      let row = 0;
      for (let y = -spacing; y <= height + spacing; y += spacing + Math.cos(row * 1.37) * 4 + Math.sin(row * 0.71) * 2) {
        const jitter = Math.cos(y * 0.041 + row) * 5;
        svg.appendChild(
          grid.line(-6, y + jitter, width + 6, y - jitter * 0.45, {
            bowing: 0.5,
            roughness: 2,
            stroke,
            strokeWidth: 0.8,
          }),
        );
        row += 1;
      }
    };

    draw();
    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(draw) : undefined;
    resizeObserver?.observe(container);

    return () => {
      resizeObserver?.disconnect();
    };
  }, []);

  return <svg className="preview-grid-sketch" ref={svgRef} aria-hidden="true" focusable="false" />;
}

function PreviewItem({
  activeVariantId,
  canRemoveVariant,
  copy,
  item,
  mode,
  onClearTextSelection,
  onFocusItem,
  onRemoveVariant,
  onSelectVariant,
  onTextClick,
  zoom,
}: {
  activeVariantId?: string;
  canRemoveVariant: boolean;
  copy: AppCopy["preview"];
  item: PreviewVariant;
  mode: PreviewMode;
  onClearTextSelection?: () => void;
  onFocusItem?: (item: PreviewVariant) => void;
  onRemoveVariant?: (variantId: string) => void;
  onSelectVariant?: (variantId: string) => void;
  onTextClick: (event: MouseEvent<HTMLDivElement>, variantId: string) => void;
  zoom: PreviewZoom;
}) {
  const isActive = item.id === activeVariantId;
  const focusScale = getZoomScale(zoom);
  const backgroundColor = item.backgroundColor;
  const safeWidth = Math.max(item.width, 1);
  const safeHeight = Math.max(item.height, 1);
  const baseFrameStyle: CSSProperties = {
    aspectRatio: `${safeWidth} / ${safeHeight}`,
    backgroundColor: isTransparentColor(backgroundColor) ? undefined : backgroundColor,
  };
  const frameStyle =
    mode === "focusFit"
      ? {
          ...baseFrameStyle,
          width: `${Math.max(Math.round(safeWidth * focusScale), 1)}px`,
          height: `${Math.max(Math.round(safeHeight * focusScale), 1)}px`,
        }
      : {
          ...baseFrameStyle,
        };

  return (
    <div
      className={createPreviewItemClass(isActive, mode)}
      data-preview-variant-id={item.id}
      role="button"
      tabIndex={0}
      onClick={() => {
        onSelectVariant?.(item.id);
        if (!isActive) {
          onClearTextSelection?.();
        }
      }}
      onDoubleClick={() => onFocusItem?.(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectVariant?.(item.id);
        }
      }}
    >
      {mode !== "focusFit" && isActive ? (
        <WiredButton
          ariaLabel={copy.deleteCurrentCanvas}
          className="preview-item__remove"
          disabled={!canRemoveVariant}
          onClick={(event) => {
            event.stopPropagation();
            onRemoveVariant?.(item.id);
          }}
        >
          x
        </WiredButton>
      ) : null}
      {mode !== "focusFit" ? <div className="preview-item__label">{item.label}</div> : null}
      <div
        className={isTransparentColor(backgroundColor) ? "svg-frame is-transparent" : "svg-frame"}
        dangerouslySetInnerHTML={{ __html: item.svg }}
        style={frameStyle}
        onClick={(event) => onTextClick(event, item.id)}
      />
    </div>
  );
}

function findTextElementFromEvent(event: MouseEvent<HTMLDivElement>): Element | null {
  const target = event.target instanceof Element ? event.target : null;
  const targetTextElement = target?.closest("[data-svg-font-switcher-text-id]");

  if (targetTextElement) {
    return targetTextElement;
  }

  const pathTextElement = event.nativeEvent
    .composedPath()
    .find((node): node is Element =>
      node instanceof Element && node.hasAttribute("data-svg-font-switcher-text-id"),
    );

  if (pathTextElement) {
    return pathTextElement;
  }

  return (
    document
      .elementsFromPoint(event.clientX, event.clientY)
      .map((element) => element.closest("[data-svg-font-switcher-text-id]"))
      .find((element): element is Element => Boolean(element)) ?? null
  );
}

function TextContextPopover({
  anchor,
  copy,
  fontOptions,
  selectedOverride,
  textNode,
  onClose,
  onChangeTextContent,
  onChangeTextFontSizePercent,
  onResetTextOverride,
  onSelectTextOverride,
}: {
  anchor: TextSelectionAnchor;
  copy: AppCopy["preview"];
  fontOptions: PreviewFontOption[];
  selectedOverride?: TextOverride;
  textNode: SvgTextNodeReport;
  onClose?: () => void;
  onChangeTextContent?: (textContent: string) => void;
  onChangeTextFontSizePercent?: (fontSizePercent: number) => void;
  onResetTextOverride?: () => void;
  onSelectTextOverride?: (fontFamily: string) => void;
}) {
  const [fontQuery, setFontQuery] = useState("");
  const normalizedQuery = normalizeFontSearchToken(fontQuery.trim());
  const selectedFontFamily = selectedOverride?.fontFamily ?? "";
  const selectedFontSizePercent = selectedOverride?.fontSizePercent ?? 100;
  const selectedTextContent = selectedOverride?.textContent ?? textNode.text;
  const textContentFontFamily = createTextContentFontFamily(
    textNode.effectiveFontFamily || textNode.originalFontFamily,
  );
  const filteredFontOptions = useMemo(
    () =>
      normalizedQuery
        ? fontOptions.filter((option) => option.searchText.includes(normalizedQuery))
        : fontOptions,
    [fontOptions, normalizedQuery],
  );
  const hasSystemFonts = fontOptions.some((option) => option.kind === "system");
  const style = {
    left: `clamp(12px, ${anchor.x + anchor.width / 2}px, calc(100% - 292px))`,
    top: `clamp(58px, ${anchor.y + anchor.height + 10}px, calc(100% - 430px))`,
  };

  return (
    <div className="text-context-popover" style={style}>
      <div className="text-context-popover__header">
        <span className={`text-kind text-kind--${textNode.kind}`}>{formatKind(textNode.kind, copy.kindLabels)}</span>
        <WiredButton ariaLabel={copy.closeLocalFontSettings} onClick={onClose}>
          <X size={14} />
        </WiredButton>
      </div>
      <label className="text-content-field">
        <span>{copy.localText}</span>
        <textarea
          style={{ fontFamily: textContentFontFamily }}
          value={selectedTextContent}
          onChange={(event) => onChangeTextContent?.(event.target.value)}
        />
      </label>
      <label className="font-select-field">
        <span>{copy.localFont}</span>
        <input
          className="font-search-input"
          placeholder={copy.searchFonts}
          value={fontQuery}
          onChange={(event) => setFontQuery(event.target.value)}
        />
        <div className="font-result-list" role="listbox" aria-label={copy.localFont}>
          {filteredFontOptions.map((option) => (
            <button
              aria-selected={option.family === selectedFontFamily ? "true" : undefined}
              className={createFontResultClassName(option.family === selectedFontFamily)}
              key={option.family}
              type="button"
              onClick={() => onSelectTextOverride?.(option.family)}
            >
              <span>{option.label}</span>
              <small>{option.kind === "system" ? copy.system : copy.uploaded}</small>
            </button>
          ))}
          {filteredFontOptions.length === 0 ? (
            <span className="text-context-popover__hint">{copy.noMatchingFonts}</span>
          ) : null}
        </div>
      </label>
      <label className="font-size-field">
        <span>{copy.fontSize}</span>
        <div className="font-size-field__controls">
          <WiredSlider
            ariaLabel={copy.fontSize}
            min={20}
            max={300}
            step={5}
            value={selectedFontSizePercent}
            onValueChange={(value) => onChangeTextFontSizePercent?.(clampTextFontSize(value))}
          />
          <WiredInput
            ariaLabel={copy.fontSize}
            min="20"
            max="300"
            step="5"
            type="number"
            value={selectedFontSizePercent}
            onValueChange={(value) =>
              onChangeTextFontSizePercent?.(clampTextFontSize(Number.parseInt(value, 10)))
            }
          />
          <strong>%</strong>
        </div>
      </label>
      {!hasSystemFonts ? (
        <span className="text-context-popover__hint">{copy.loadSystemFontsHint}</span>
      ) : null}
      <WiredButton
        className="text-context-popover__reset"
        disabled={!textNode.hasOverride}
        onClick={onResetTextOverride}
      >
        {copy.restoreGlobalRule}
      </WiredButton>
    </div>
  );
}

function clampTextFontSize(value: number): number {
  if (!Number.isFinite(value)) {
    return 100;
  }

  return Math.min(Math.max(Math.round(value / 5) * 5, 20), 300);
}

function createPreviewViewportClass(mode: PreviewMode, itemCount: number): string {
  const classNames = ["preview-viewport"];

  if (itemCount > 1 && mode !== "focusFit") {
    classNames.push("preview-viewport--grid");
  }

  if (mode === "focusFit") {
    classNames.push("preview-viewport--focus");
  }

  return classNames.join(" ");
}

function createPreviewStageClass(mode: PreviewMode, itemCount: number): string {
  const classNames = ["preview-stage"];

  if (itemCount > 1) {
    classNames.push("preview-stage--grid");
  }

  return classNames.join(" ");
}

function createPreviewItemClass(isActive: boolean, mode: PreviewMode): string {
  const classNames = ["preview-item"];

  if (isActive) {
    classNames.push("is-active");
  }

  if (mode === "focusFit") {
    classNames.push("is-focused");
  }

  return classNames.join(" ");
}

function createFontResultClassName(isActive: boolean): string {
  return isActive ? "font-result-button is-active" : "font-result-button";
}

function getZoomScale(zoom: PreviewZoom): number {
  return zoom / 100;
}

function calculateFitZoom(viewport: HTMLElement | null, canvasWidth: number, canvasHeight: number): PreviewZoom {
  if (!viewport || canvasWidth <= 0 || canvasHeight <= 0) {
    return 100;
  }

  const bounds = viewport.getBoundingClientRect();
  const availableWidth = Math.max(bounds.width - 72, 120);
  const availableHeight = Math.max(bounds.height - 132, 120);
  const fitScale = Math.min(availableWidth / canvasWidth, availableHeight / canvasHeight);

  return Math.min(Math.max(Math.round((fitScale * 100) / 5) * 5, 20), 200);
}

function formatKind(kind: SvgTextKind, labels: Record<SvgTextKind, string>): string {
  return labels[kind];
}

function normalizeFontSearchToken(value: string): string {
  return value.toLowerCase().replace(/[\s\-_.,/\\()]+/g, "");
}

function createTextContentFontFamily(fontFamily: string): string {
  const systemFallback = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const normalizedFontFamily = fontFamily.trim();

  if (!normalizedFontFamily) {
    return systemFallback;
  }

  return `${quoteFontFamilyForCss(normalizedFontFamily)}, ${systemFallback}`;
}

function quoteFontFamilyForCss(fontFamily: string): string {
  if (fontFamily.includes(",") || /^["']/.test(fontFamily)) {
    return fontFamily;
  }

  return `"${fontFamily.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
