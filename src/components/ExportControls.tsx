import type { ExportScale } from "../types";

const scales: ExportScale[] = [1, 2, 3, 4];

type ExportControlsProps = {
  scale: ExportScale;
  disabled: boolean;
  batchDisabled: boolean;
  isExporting: boolean;
  status: string;
  onChangeScale: (scale: ExportScale) => void;
  onExport: () => void;
  onBatchExport: () => void;
  onExportSvg: () => void;
  onBatchExportSvg: () => void;
};

export function ExportControls({
  scale,
  disabled,
  batchDisabled,
  isExporting,
  status,
  onChangeScale,
  onExport,
  onBatchExport,
  onExportSvg,
  onBatchExportSvg,
}: ExportControlsProps) {
  return (
    <div className="control-group">
      <div className="control-group__title">导出</div>
      <div className="segmented" role="radiogroup" aria-label="导出倍率">
        {scales.map((item) => (
          <button
            aria-checked={scale === item}
            className={scale === item ? "is-active" : ""}
            key={item}
            onClick={() => onChangeScale(item)}
            role="radio"
            type="button"
          >
            {item}x
          </button>
        ))}
      </div>
      <button className="primary-action" disabled={disabled || isExporting} onClick={onExport}>
        {isExporting ? "正在导出..." : "导出 PNG"}
      </button>
      <div className="export-actions">
        <button disabled={batchDisabled || isExporting} onClick={onBatchExport} type="button">
          批量导出 PNG
        </button>
        <button disabled={disabled || isExporting} onClick={onExportSvg} type="button">
          导出 SVG
        </button>
        <button disabled={batchDisabled || isExporting} onClick={onBatchExportSvg} type="button">
          批量导出 SVG
        </button>
      </div>
      {status ? <div className="export-status">{status}</div> : null}
    </div>
  );
}
