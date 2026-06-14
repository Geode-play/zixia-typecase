import { isTransparentColor } from "../lib/shared/text";

export type PreviewVariant = {
  id: string;
  label: string;
  svg: string;
};

type SvgPreviewProps = {
  activeVariantId?: string;
  svg: string;
  fileName: string;
  width: number;
  height: number;
  backgroundColor: string;
  variants?: PreviewVariant[];
  onSelectVariant?: (variantId: string) => void;
};

export function SvgPreview({
  activeVariantId,
  svg,
  fileName,
  width,
  height,
  backgroundColor,
  variants = [],
  onSelectVariant,
}: SvgPreviewProps) {
  if (!svg) {
    return (
      <div className="empty-state">
        <strong>上传 SVG 后开始预览</strong>
        <span>文本字体、画布尺寸和背景色都会在这里即时更新。</span>
      </div>
    );
  }

  const previewItems = variants.length > 0 ? variants : [{ id: "current", label: "当前画布", svg }];

  return (
    <div className="preview-shell">
      <div className="preview-meta">
        <span>{fileName}</span>
        <span>
          {width} × {height}
        </span>
      </div>
      <div
        className={previewItems.length > 1 ? "preview-stage preview-stage--grid" : "preview-stage"}
      >
        {previewItems.map((item) => (
          <button
            className={item.id === activeVariantId ? "preview-item is-active" : "preview-item"}
            disabled={!onSelectVariant}
            key={item.id}
            type="button"
            onClick={() => onSelectVariant?.(item.id)}
          >
            <div className="preview-item__label">{item.label}</div>
            <div
              className={
                isTransparentColor(backgroundColor) ? "svg-frame is-transparent" : "svg-frame"
              }
              dangerouslySetInnerHTML={{ __html: item.svg }}
              style={{
                backgroundColor: isTransparentColor(backgroundColor) ? undefined : backgroundColor,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
