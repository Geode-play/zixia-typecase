import type { CanvasVersion, UploadedFont } from "../types";

type CanvasVersionControlsProps = {
  activeCanvasId: string;
  canvases: CanvasVersion[];
  fonts: UploadedFont[];
  onAddCanvas: () => void;
  onDuplicateCanvas: (canvasId: string) => void;
  onRemoveCanvas: (canvasId: string) => void;
  onSelectCanvas: (canvasId: string) => void;
};

export function CanvasVersionControls({
  activeCanvasId,
  canvases,
  fonts,
  onAddCanvas,
  onDuplicateCanvas,
  onRemoveCanvas,
  onSelectCanvas,
}: CanvasVersionControlsProps) {
  return (
    <div className="control-group">
      <div className="control-group__title">画布版本</div>
      <button className="secondary-action" type="button" onClick={onAddCanvas}>
        添加画布
      </button>
      <div className="canvas-version-list" aria-live="polite">
        {canvases.map((canvas) => (
          <div
            className={
              canvas.id === activeCanvasId
                ? "canvas-version-row is-active"
                : "canvas-version-row"
            }
            key={canvas.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectCanvas(canvas.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectCanvas(canvas.id);
              }
            }}
          >
            <div className="canvas-version-row__info">
              <strong>{canvas.name}</strong>
              <span>
                中：{getFontName(fonts, canvas.selectedChineseFontFamily)} / 英：
                {getFontName(fonts, canvas.selectedEnglishFontFamily)}
              </span>
              <small>
                {canvas.settings.width}×{canvas.settings.height} · {canvas.settings.backgroundColor}
              </small>
            </div>
            <div className="canvas-version-row__actions">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDuplicateCanvas(canvas.id);
                }}
              >
                复制
              </button>
              <button
                disabled={canvases.length <= 1}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveCanvas(canvas.id);
                }}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getFontName(fonts: UploadedFont[], fontFamily: string): string {
  if (!fontFamily) {
    return "原字体";
  }

  return fonts.find((font) => font.family === fontFamily)?.name ?? fontFamily;
}
