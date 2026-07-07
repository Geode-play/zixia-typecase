import { useRef, useState } from "react";
import { Copy, FilePlus2, CircleHelp, Plus, RotateCcw, Undo2, Upload } from "lucide-react";
import { CanvasControls } from "./CanvasControls";
import { WiredButton, WiredSelect, WiredSlider, type WiredSelectOption } from "./wired/WiredElements";
import type { AppCopy } from "../i18n";
import type { CanvasSettings, ExportScale, PreviewZoom } from "../types";

type CanvasToolbarProps = {
  copy: AppCopy["canvasToolbar"];
  canvasCopy: AppCopy["canvasControls"];
  helpCopy: AppCopy["help"];
  batchDisabled: boolean;
  disabled: boolean;
  exportScale: ExportScale;
  exportStatus: string;
  isExporting: boolean;
  previewZoom: PreviewZoom;
  canvasSettings: CanvasSettings;
  canAddCanvas: boolean;
  canReset: boolean;
  canUndo: boolean;
  languageToggleLabel: string;
  languageToggleTitle: string;
  onAddCanvas: () => void;
  onImportSvgFiles: (files: File[]) => void;
  onBatchExport: () => void;
  onBatchExportSvg: () => void;
  onChangeCanvasSettings: (settings: CanvasSettings) => void;
  onChangeExportScale: (scale: ExportScale) => void;
  onChangePreviewZoom: (zoom: PreviewZoom) => void;
  onExport: () => void;
  onExportSvg: () => void;
  onReset: () => void;
  onToggleLanguage: () => void;
  onUndo: () => void;
};

const exportScales: ExportScale[] = [1, 2, 3, 4];
const exportScaleOptions: WiredSelectOption[] = exportScales.map((value) => ({
  label: `${value}x`,
  value: String(value),
}));

export function CanvasToolbar({
  copy,
  canvasCopy,
  helpCopy,
  batchDisabled,
  disabled,
  exportScale,
  exportStatus,
  isExporting,
  previewZoom,
  canvasSettings,
  canAddCanvas,
  canReset,
  canUndo,
  languageToggleLabel,
  languageToggleTitle,
  onAddCanvas,
  onImportSvgFiles,
  onBatchExport,
  onBatchExportSvg,
  onChangeCanvasSettings,
  onChangeExportScale,
  onChangePreviewZoom,
  onExport,
  onExportSvg,
  onReset,
  onToggleLanguage,
  onUndo,
}: CanvasToolbarProps) {
  const svgInputRef = useRef<HTMLInputElement | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div className="canvas-toolbar">
      <WiredButton
        ariaLabel={languageToggleTitle}
        className="toolbar-button language-toggle-button"
        title={languageToggleTitle}
        onClick={onToggleLanguage}
      >
        {languageToggleLabel}
      </WiredButton>
      <div className="toolbar-popover-host">
        <input
          ref={svgInputRef}
          accept=".svg,image/svg+xml"
          className="toolbar-hidden-input"
          multiple
          type="file"
          onChange={(event) => {
            onImportSvgFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
            setIsAddOpen(false);
          }}
        />
        <WiredButton
          ariaLabel={copy.addCanvas}
          className="toolbar-button toolbar-icon-button"
          disabled={!canAddCanvas}
          title={copy.addCanvas}
          onClick={() => setIsAddOpen((current) => !current)}
        >
          <Plus size={15} />
        </WiredButton>
        {isAddOpen ? (
          <div className="toolbar-popover add-popover">
            <div className="add-actions">
              <WiredButton onClick={() => svgInputRef.current?.click()}>
                <FilePlus2 size={15} />
                <span>{copy.importSvg}</span>
              </WiredButton>
              <WiredButton
                onClick={() => {
                  onAddCanvas();
                  setIsAddOpen(false);
                }}
              >
                <Copy size={15} />
                <span>{copy.duplicateCanvas}</span>
              </WiredButton>
            </div>
          </div>
        ) : null}
      </div>
      <WiredButton
        ariaLabel={copy.undo}
        className="toolbar-button toolbar-icon-button"
        disabled={!canUndo}
        title={copy.undo}
        onClick={onUndo}
      >
        <Undo2 size={15} />
      </WiredButton>
      <WiredButton
        ariaLabel={copy.reset}
        className="toolbar-button toolbar-icon-button"
        disabled={!canReset}
        title={copy.reset}
        onClick={onReset}
      >
        <RotateCcw size={15} />
      </WiredButton>

      <div className="toolbar-popover-host">
        <WiredButton
          ariaLabel={copy.helpTitle}
          className="toolbar-button toolbar-icon-button"
          title={copy.helpTitle}
          onClick={() => setIsHelpOpen((current) => !current)}
        >
          <CircleHelp size={15} />
        </WiredButton>
        {isHelpOpen ? (
          <div className="toolbar-popover help-popover">
            <h2>{helpCopy.title}</h2>
            <ul>
              {helpCopy.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <label className="toolbar-zoom" title={`${copy.previewZoom} ${previewZoom}%`}>
        <span>{copy.previewZoom}</span>
        <WiredSlider
          ariaLabel={copy.previewZoom}
          className="toolbar-zoom__slider"
          min={20}
          max={200}
          step={5}
          value={previewZoom}
          onValueChange={(value) => onChangePreviewZoom(value as PreviewZoom)}
        />
        <strong>{previewZoom}%</strong>
      </label>

      <div className="toolbar-popover-host">
        <WiredButton
          ariaLabel={copy.export}
          className="toolbar-button toolbar-export-button toolbar-button--primary"
          disabled={disabled}
          title={copy.export}
          onClick={() => setIsExportOpen((current) => !current)}
        >
          <Upload size={15} />
        </WiredButton>
        {isExportOpen ? (
          <div className="toolbar-popover export-popover">
            <CanvasControls
              copy={canvasCopy}
              settings={canvasSettings}
              showTitle={false}
              onChange={onChangeCanvasSettings}
            />
            <label className="field">
              <span>{copy.exportScale}</span>
              <WiredSelect
                ariaLabel={copy.exportScale}
                className="wired-field-control"
                options={exportScaleOptions}
                placeholder={`${exportScale}x`}
                popupPlacement="top"
                value={String(exportScale)}
                onValueChange={(value) => onChangeExportScale(Number(value) as ExportScale)}
              />
            </label>
            <div className="export-actions">
              <WiredButton disabled={disabled || isExporting} onClick={onExport}>
                {copy.exportPng}
              </WiredButton>
              <WiredButton disabled={batchDisabled || isExporting} onClick={onBatchExport}>
                {copy.batchPng}
              </WiredButton>
              <WiredButton disabled={disabled || isExporting} onClick={onExportSvg}>
                {copy.exportSvg}
              </WiredButton>
              <WiredButton disabled={batchDisabled || isExporting} onClick={onBatchExportSvg}>
                {copy.batchSvg}
              </WiredButton>
            </div>
            {exportStatus ? <span className="export-status">{exportStatus}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
