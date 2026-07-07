import { X } from "lucide-react";
import { WiredButton, WiredSelect, type WiredSelectOption } from "./wired/WiredElements";
import type { AppCopy } from "../i18n";
import type { CanvasVersion, UploadedFont } from "../types";

type CanvasVersionControlsProps = {
  activeCanvasId: string;
  canvases: CanvasVersion[];
  copy: AppCopy["canvasVersion"];
  fonts: UploadedFont[];
  onRemoveCanvas: (canvasId: string) => void;
  onSelectCanvas: (canvasId: string) => void;
};

export function CanvasVersionControls({
  activeCanvasId,
  canvases,
  copy,
  fonts,
  onRemoveCanvas,
  onSelectCanvas,
}: CanvasVersionControlsProps) {
  const canRemoveCanvas = canvases.length > 1;
  const canvasOptions: WiredSelectOption[] = canvases.map((canvas) => ({
    label: canvas.name,
    meta: formatCanvasMeta(canvas, fonts, copy.originalFont),
    value: canvas.id,
  }));

  return (
    <div className="control-group">
      <div className="control-group__title">{copy.title}</div>
      <label className="canvas-select">
        <span className="canvas-select__label">{copy.currentCanvas}</span>
        <div className="canvas-select__row">
          <WiredSelect
            ariaLabel={copy.currentCanvas}
            className="wired-field-control"
            options={canvasOptions}
            placeholder={copy.currentCanvasFallback}
            value={activeCanvasId}
            onValueChange={onSelectCanvas}
          />
          {canRemoveCanvas ? (
            <WiredButton
              ariaLabel={copy.deleteCanvas(canvases.find((canvas) => canvas.id === activeCanvasId)?.name ?? "")}
              className="canvas-select__remove canvas-select__remove-current"
              title={copy.deleteCanvasTitle}
              onClick={(event) => {
                event.stopPropagation();
                onRemoveCanvas(activeCanvasId);
              }}
            >
              <X size={13} />
            </WiredButton>
          ) : null}
        </div>
      </label>
    </div>
  );
}

function formatCanvasMeta(canvas: CanvasVersion, fonts: UploadedFont[], originalFontLabel: string): string {
  return `${canvas.settings.width}x${canvas.settings.height} / ${getFontName(
    fonts,
    canvas.fontRules?.cjkFontFamily ||
      canvas.fontRules?.latinFontFamily ||
      canvas.selectedFontFamily ||
      "",
    originalFontLabel,
  )}`;
}

function getFontName(fonts: UploadedFont[], fontFamily: string, originalFontLabel: string): string {
  if (!fontFamily) {
    return originalFontLabel;
  }

  return fonts.find((font) => font.family === fontFamily)?.name ?? fontFamily;
}
