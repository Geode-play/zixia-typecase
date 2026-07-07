import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasToolbar } from "./components/CanvasToolbar";
import { CanvasVersionControls } from "./components/CanvasVersionControls";
import { FontControls } from "./components/FontControls";
import { RoughFrameLayer } from "./components/rough/RoughFrameLayer";
import { RoughFrame } from "./components/rough/RoughFrame";
import { SvgPreview, type PreviewFontOption, type PreviewVariant, type TextNodeSelection } from "./components/SvgPreview";
import { downloadBlob, downloadTextFile, exportSvgToPng } from "./lib/export/pngExporter";
import { buildFontFaceCss, createUploadedFonts, releaseUploadedFont, releaseUploadedFonts } from "./lib/fonts/fontManager";
import { isSystemFontAccessSupported, loadSystemFonts } from "./lib/fonts/systemFonts";
import { sanitizeFileSegment } from "./lib/shared/text";
import { applySvgPresentation, processSvgPresentation } from "./lib/svg/svgProcessor";
import { appCopy, type AppCopy, type Language } from "./i18n";
import logoUrl from "./assets/brand/logo.png";
import type {
  CanvasSettings,
  CanvasVersion,
  ExportScale,
  FontRules,
  PreviewMode,
  PreviewZoom,
  TextOverrides,
  UploadedFont,
} from "./types";

const defaultSettings: CanvasSettings = {
  width: 1080,
  height: 1440,
  backgroundColor: "transparent",
};

type TextSelectionAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type EditingSnapshot = {
  canvases: CanvasVersion[];
  activeCanvasId: string;
  nextCanvasNumber: number;
};

function App() {
  const [language, setLanguage] = useState<Language>("zh");
  const [fonts, setFonts] = useState<UploadedFont[]>([]);
  const [canvases, setCanvases] = useState<CanvasVersion[]>(() => [
    createCanvasVersion(1, appCopy.zh.canvasNames),
  ]);
  const [activeCanvasId, setActiveCanvasId] = useState("canvas-1");
  const [nextCanvasNumber, setNextCanvasNumber] = useState(2);
  const [scale, setScale] = useState<ExportScale>(2);
  const [previewZoom, setPreviewZoom] = useState<PreviewZoom>(100);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("grid");
  const [selectedTextNodeId, setSelectedTextNodeId] = useState("");
  const [selectedTextCanvasId, setSelectedTextCanvasId] = useState("");
  const [selectedTextAnchor, setSelectedTextAnchor] = useState<TextSelectionAnchor | null>(null);
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isReadingFonts, setIsReadingFonts] = useState(false);
  const [isReadingSystemFonts, setIsReadingSystemFonts] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [fontStatus, setFontStatus] = useState("");
  const [editingHistory, setEditingHistory] = useState<EditingSnapshot[]>([]);
  const fontsRef = useRef<UploadedFont[]>([]);
  const gridPreviewZoomRef = useRef<PreviewZoom>(100);

  const copy = appCopy[language];
  const activeCanvas = canvases.find((canvas) => canvas.id === activeCanvasId) ?? canvases[0];
  const selectedTextCanvas = canvases.find((canvas) => canvas.id === selectedTextCanvasId);
  const activeSvgSource = activeCanvas?.svgSource ?? "";
  const activeSvgFileName = activeCanvas?.svgFileName ?? "未選擇 SVG";
  const exportableCanvases = canvases.filter((canvas) => Boolean(canvas.svgSource));
  const hasAnySvg = exportableCanvases.length > 0;
  const systemFontSupported = isSystemFontAccessSupported();

  useEffect(() => {
    fontsRef.current = fonts;
  }, [fonts]);

  useEffect(() => {
    const styleId = "svg-font-switcher-page-fonts";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    const cssText = buildFontFaceCss(fonts);

    if (!cssText) {
      style?.remove();
      return;
    }

    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }

    style.textContent = cssText;
  }, [fonts]);

  useEffect(
    () => () => {
      releaseUploadedFonts(fontsRef.current);
      document.getElementById("svg-font-switcher-page-fonts")?.remove();
    },
    [],
  );

  const svgProcessingResult = useMemo(() => {
    if (!activeSvgSource || !activeCanvas) {
      return { error: "", report: undefined, svg: "" };
    }

    try {
      const result = processSvgPresentation(activeSvgSource, {
        fonts,
        fontRules: getCanvasFontRules(activeCanvas),
        textOverrides: activeCanvas.textOverrides ?? {},
        selectedTextNodeId: activeCanvas.id === selectedTextCanvasId ? selectedTextNodeId : undefined,
        includeEditorAttributes: true,
        styleScopeId: activeCanvas.id,
        settings: activeCanvas.settings,
      });

      return {
        error: "",
        report: result.report,
        svg: result.svg,
      };
    } catch (caughtError) {
      return {
        error: caughtError instanceof Error ? caughtError.message : copy.errors.svgProcess,
        report: undefined,
        svg: "",
      };
    }
  }, [activeCanvas, activeSvgSource, copy.errors.svgProcess, fonts, selectedTextCanvasId, selectedTextNodeId]);

  const canvasPreviewVariants = useMemo<PreviewVariant[]>(() => {
    if (!hasAnySvg || canvases.length <= 1) {
      return [];
    }

    return canvases
      .map((canvas) => {
        if (!canvas.svgSource) {
          return null;
        }

        try {
          return {
            backgroundColor: canvas.settings.backgroundColor,
            id: canvas.id,
            label: canvas.name,
            width: canvas.settings.width,
            height: canvas.settings.height,
            svg: createCanvasSvg(canvas, canvas.svgSource, fonts, {
              includeEditorAttributes: true,
              selectedTextNodeId: canvas.id === selectedTextCanvasId ? selectedTextNodeId : undefined,
            }),
          };
        } catch {
          return null;
        }
      })
      .filter((variant): variant is PreviewVariant => Boolean(variant));
  }, [canvases, fonts, hasAnySvg, selectedTextCanvasId, selectedTextNodeId]);

  const selectedTextProcessingResult = useMemo(() => {
    const selectedSvgSource = selectedTextCanvas?.svgSource ?? "";

    if (!selectedSvgSource || !selectedTextCanvas) {
      return { error: "", report: undefined };
    }

    if (selectedTextCanvas.id === activeCanvas.id) {
      return {
        error: svgProcessingResult.error,
        report: svgProcessingResult.report,
      };
    }

    try {
      const result = processSvgPresentation(selectedSvgSource, {
        fonts,
        fontRules: getCanvasFontRules(selectedTextCanvas),
        textOverrides: selectedTextCanvas.textOverrides ?? {},
        selectedTextNodeId,
        includeEditorAttributes: true,
        styleScopeId: selectedTextCanvas.id,
        settings: selectedTextCanvas.settings,
      });

      return {
        error: "",
        report: result.report,
      };
    } catch (caughtError) {
      return {
        error: caughtError instanceof Error ? caughtError.message : copy.errors.svgProcess,
        report: undefined,
      };
    }
  }, [
    activeCanvas.id,
    copy.errors.svgProcess,
    fonts,
    selectedTextCanvas,
    selectedTextNodeId,
    svgProcessingResult.error,
    svgProcessingResult.report,
  ]);

  const processedSvg = svgProcessingResult.svg;
  const visibleError = error || svgProcessingResult.error;
  const selectedTextNode = selectedTextProcessingResult.report?.textNodes.find(
    (node) => node.id === selectedTextNodeId,
  );
  const selectedTextOverride = selectedTextNodeId
    ? selectedTextCanvas?.textOverrides?.[selectedTextNodeId]
    : undefined;
  const previewFontOptions = useMemo(
    () => createPreviewFontOptions(fonts),
    [fonts],
  );

  useEffect(() => {
    if (!selectedTextNodeId || !selectedTextProcessingResult.report) {
      return;
    }

    if (!selectedTextProcessingResult.report.textNodes.some((node) => node.id === selectedTextNodeId)) {
      setSelectedTextNodeId("");
      setSelectedTextCanvasId("");
      setSelectedTextAnchor(null);
    }
  }, [selectedTextNodeId, selectedTextProcessingResult.report]);

  async function handleSvgFiles(files: File[]) {
    const svgFiles = files.filter(isSvgFile);

    if (svgFiles.length === 0) {
      return;
    }

    try {
      const uploadedSvgs = await Promise.all(
        svgFiles.map(async (file) => ({
          fileName: file.name,
          source: await file.text(),
        })),
      );

      setFontStatus("");
      setExportStatus("");
      setError("");
      clearTextSelection();
      pushEditingHistory();

      const shouldFillInitialCanvas =
        !hasAnySvg && canvases.length === 1 && !canvases[0]?.svgSource;
      const [firstSvg, ...remainingSvgs] = uploadedSvgs;
      const nextCanvases = shouldFillInitialCanvas && firstSvg
        ? [
            {
              ...canvases[0],
              name: createCanvasName(firstSvg.fileName, copy.canvasNames.main),
              svgFileName: firstSvg.fileName,
              svgSource: firstSvg.source,
            },
          ]
        : [...canvases];
      let nextNumber = nextCanvasNumber;
      const svgsToAppend = shouldFillInitialCanvas ? remainingSvgs : uploadedSvgs;

      svgsToAppend.forEach((svg) => {
        const templateCanvas = activeCanvas ?? createCanvasVersion(1, copy.canvasNames);
        nextCanvases.push(
          createCanvasVersion(nextNumber, copy.canvasNames, {
            name: createCanvasName(svg.fileName, copy.canvasNames.numbered(nextNumber)),
            svgFileName: svg.fileName,
            svgSource: svg.source,
            template: templateCanvas,
          }),
        );
        nextNumber += 1;
      });

      const nextActiveCanvas = shouldFillInitialCanvas
        ? nextCanvases[0]
        : nextCanvases[nextCanvases.length - svgsToAppend.length] ?? nextCanvases[0];

      setCanvases(nextCanvases);
      setActiveCanvasId(nextActiveCanvas.id);
      setNextCanvasNumber(nextNumber);
      setPreviewMode("grid");
      setPreviewZoom(gridPreviewZoomRef.current);
    } catch {
      setError(copy.errors.readSvg);
    }
  }

  async function handleFontFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }

    setIsReadingFonts(true);

    try {
      setError("");
      const nextFonts = await createUploadedFonts(files);
      const uniqueFonts = dedupeFonts(nextFonts, fonts);

      nextFonts
        .filter((font) => !uniqueFonts.includes(font))
        .forEach((font) => releaseUploadedFont(font));
      setFonts((currentFonts) => [...currentFonts, ...dedupeFonts(uniqueFonts, currentFonts)]);

      if (uniqueFonts[0]) {
        handleSelectFont(uniqueFonts[0].family, { onlyIfEmpty: true });
      }
    } catch {
      setError(copy.errors.readFont);
    } finally {
      setIsReadingFonts(false);
    }
  }

  async function handleLoadSystemFonts() {
    setIsReadingSystemFonts(true);

    try {
      setError("");
      const systemFonts = await loadSystemFonts();

      setFonts((currentFonts) => [...currentFonts, ...dedupeFonts(systemFonts, currentFonts)]);
      setFontStatus(copy.status.systemFontsLoaded(systemFonts.length));
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : copy.errors.systemFont;

      setFontStatus(`${message} ${copy.fontControls.systemFontFallback}`);
    } finally {
      setIsReadingSystemFonts(false);
    }
  }

  function handleDroppedFiles(files: File[]) {
    const svgFiles = files.filter(isSvgFile);
    const fontFiles = files.filter(isFontFile);

    if (svgFiles.length > 0) {
      void handleSvgFiles(svgFiles);
    }

    if (fontFiles.length > 0) {
      void handleFontFiles(fontFiles);
    }
  }

  function handleAddCanvas() {
    if (!activeSvgSource || !activeCanvas) {
      return;
    }

    pushEditingHistory();
    const sourceCanvas = activeCanvas;
    const nextCanvas = {
      ...sourceCanvas,
      id: `canvas-${nextCanvasNumber}`,
      name: copy.canvasNames.numbered(nextCanvasNumber),
      settings: { ...sourceCanvas.settings },
      fontRules: { ...getCanvasFontRules(sourceCanvas) },
      textOverrides: cloneTextOverrides(sourceCanvas.textOverrides ?? {}),
    };

    setCanvases((currentCanvases) => [...currentCanvases, nextCanvas]);
    setActiveCanvasId(nextCanvas.id);
    setPreviewMode("grid");
    clearTextSelection();
    setNextCanvasNumber((currentNumber) => currentNumber + 1);
  }

  function handleRemoveCanvas(canvasId: string) {
    if (canvases.length <= 1) {
      return;
    }

    pushEditingHistory();
    if (canvasId === selectedTextCanvasId) {
      clearTextSelection();
    }
    setCanvases((currentCanvases) => {
      if (currentCanvases.length <= 1) {
        return currentCanvases;
      }

      const nextCanvases = currentCanvases.filter((canvas) => canvas.id !== canvasId);

      if (canvasId === activeCanvasId) {
        setActiveCanvasId(nextCanvases[0].id);
      }

      if (nextCanvases.length <= 1) {
        setPreviewMode("grid");
      }

      return nextCanvases;
    });
  }

  function handleClearCanvas() {
    releaseUploadedFonts(fonts);
    setFonts([]);
    setError("");
    setExportStatus("");
    setFontStatus("");
    setEditingHistory([]);
    setCanvases([createCanvasVersion(1, copy.canvasNames)]);
    setActiveCanvasId("canvas-1");
    setNextCanvasNumber(2);
    setPreviewZoom(100);
    setPreviewMode("grid");
    clearTextSelection();
  }

  function handleUndo() {
    const previousSnapshot = editingHistory[editingHistory.length - 1];

    if (!previousSnapshot) {
      return;
    }

    setCanvases(cloneCanvases(previousSnapshot.canvases));
    setActiveCanvasId(previousSnapshot.activeCanvasId);
    setNextCanvasNumber(previousSnapshot.nextCanvasNumber);
    setPreviewMode("grid");
    clearTextSelection();
    setExportStatus("");
    setEditingHistory((currentHistory) => currentHistory.slice(0, -1));
  }

  function handleWheelZoom(deltaY: number) {
    const direction = deltaY < 0 ? 10 : -10;
    setPreviewZoom((currentZoom) => {
      const nextZoom = clampPreviewZoom(currentZoom + direction);

      if (previewMode !== "focusFit") {
        gridPreviewZoomRef.current = nextZoom;
      }

      return nextZoom;
    });
  }

  function handleFocusVariant(canvasId: string, fitZoom?: PreviewZoom) {
    if (previewMode !== "focusFit") {
      gridPreviewZoomRef.current = previewZoom;
    }

    handleSelectCanvas(canvasId);

    if (fitZoom) {
      setPreviewZoom(clampPreviewZoom(fitZoom));
    }

    setPreviewMode("focusFit");
  }

  function handleExitFocus() {
    setPreviewMode("grid");
    setPreviewZoom(gridPreviewZoomRef.current);
    clearTextSelection();
  }

  function handleChangePreviewZoom(nextZoom: PreviewZoom) {
    const clampedZoom = clampPreviewZoom(nextZoom);

    if (previewMode !== "focusFit") {
      gridPreviewZoomRef.current = clampedZoom;
    }

    setPreviewZoom(clampedZoom);
  }

  function handleSelectCanvas(canvasId: string) {
    setActiveCanvasId(canvasId);
    clearTextSelection();
  }

  function handleSelectTextNode(selection: TextNodeSelection) {
    if (selection.canvasId !== activeCanvasId) {
      setActiveCanvasId(selection.canvasId);
    }

    setSelectedTextNodeId(selection.id);
    setSelectedTextCanvasId(selection.canvasId);
    setSelectedTextAnchor(selection.anchor);
  }

  async function handleExport() {
    if (!processedSvg || !activeCanvas || !activeSvgSource) {
      return;
    }

    setIsExporting(true);

    try {
      setExportStatus(copy.status.generatingPng);
      const exportSvg = createCanvasSvg(activeCanvas, activeSvgSource, fonts);
      const blob = await exportSvgToPng(exportSvg, activeCanvas.settings, scale);
      const fileName = createPngFileName(activeSvgFileName, activeCanvas, scale);
      downloadBlob(blob, fileName);
      setExportStatus(copy.status.exported(fileName));
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : copy.errors.pngExport;
      setError(message);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleBatchExport() {
    if (exportableCanvases.length === 0) {
      return;
    }

    setIsExporting(true);

    try {
      const usedFileNames = new Set<string>();

      for (const [index, canvas] of exportableCanvases.entries()) {
        setExportStatus(copy.status.exportingCanvas(index + 1, exportableCanvases.length, canvas.name));
        const svg = createCanvasSvg(canvas, canvas.svgSource ?? "", fonts);
        const blob = await exportSvgToPng(svg, canvas.settings, scale);
        downloadBlob(
          blob,
          createUniqueFileName(
            createPngFileName(canvas.svgFileName ?? "", canvas, scale),
            usedFileNames,
          ),
        );
      }

      setExportStatus(copy.status.batchPng(exportableCanvases.length));
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : copy.errors.batchExport;
      setError(message);
    } finally {
      setIsExporting(false);
    }
  }

  function handleExportSvg() {
    if (!processedSvg || !activeCanvas || !activeSvgSource) {
      return;
    }

    const baseName = sanitizeBaseFileName(activeSvgFileName);
    const fileName = `${baseName}-${sanitizeFileSegment(activeCanvas.name)}-editable.svg`;
    const exportSvg = createCanvasSvg(activeCanvas, activeSvgSource, fonts);
    downloadTextFile(exportSvg, fileName, "image/svg+xml;charset=utf-8");
    setExportStatus(
      isSystemFontSelected(activeCanvas, fonts)
        ? copy.status.exportedWithWarning(fileName, copy.errors.systemFontMissing)
        : copy.status.exported(fileName),
    );
  }

  function handleBatchExportSvg() {
    if (exportableCanvases.length === 0) {
      return;
    }

    const usedFileNames = new Set<string>();

    exportableCanvases.forEach((canvas) => {
      const baseName = sanitizeBaseFileName(canvas.svgFileName ?? "");
      const svg = createCanvasSvg(canvas, canvas.svgSource ?? "", fonts);
      downloadTextFile(
        svg,
        createUniqueFileName(
          `${baseName}-${sanitizeFileSegment(canvas.name)}-editable.svg`,
          usedFileNames,
        ),
        "image/svg+xml;charset=utf-8",
      );
    });
    setExportStatus(
      exportableCanvases.some((canvas) => isSystemFontSelected(canvas, fonts))
        ? copy.status.batchSvgWithWarning(exportableCanvases.length, copy.errors.systemFontMissing)
        : copy.status.batchSvg(exportableCanvases.length),
    );
  }

  function handleRemoveFont(fontId: string) {
    const fontToRemove = fonts.find((font) => font.id === fontId);

    if (!fontToRemove || fontToRemove.kind === "system") {
      return;
    }

    releaseUploadedFont(fontToRemove);
    setFonts((currentFonts) => currentFonts.filter((font) => font.id !== fontId));
    setCanvases((currentCanvases) =>
      currentCanvases.map((canvas) => {
        const fontRules = getCanvasFontRules(canvas);
        const textOverrides = removeFontFamilyFromOverrides(
          canvas.textOverrides ?? {},
          fontToRemove.family,
        );

        return {
          ...canvas,
          selectedFontFamily:
            canvas.selectedFontFamily === fontToRemove.family ? "" : canvas.selectedFontFamily,
          fontRules: {
            ...fontRules,
            cjkFontFamily:
              fontRules.cjkFontFamily === fontToRemove.family ? "" : fontRules.cjkFontFamily,
            latinFontFamily:
              fontRules.latinFontFamily === fontToRemove.family ? "" : fontRules.latinFontFamily,
          },
          textOverrides,
        };
      }),
    );
  }

  function handleSelectFont(fontFamily: string, options?: { onlyIfEmpty?: boolean }) {
    updateActiveCanvas((canvas) => {
      if (options?.onlyIfEmpty && getPrimaryCanvasFont(canvas)) {
        return canvas;
      }

      return {
        ...canvas,
        fontRules: createFontRules(fontFamily),
        selectedFontFamily: fontFamily,
      };
    });
  }

  function handleChangeFontRule(ruleName: keyof Omit<FontRules, "mixedTextPolicy">, fontFamily: string) {
    updateActiveCanvas((canvas) => {
      const fontRules = {
        ...getCanvasFontRules(canvas),
        [ruleName]: fontFamily,
      };

      return {
        ...canvas,
        fontRules,
        selectedFontFamily: getPrimaryFontFromRules(fontRules),
      };
    });
  }

  function handleSelectTextOverride(fontFamily: string) {
    if (!selectedTextNodeId || !selectedTextCanvasId) {
      return;
    }

    updateCanvasById(selectedTextCanvasId, (canvas) => ({
      ...canvas,
      textOverrides: upsertTextOverride(canvas.textOverrides ?? {}, selectedTextNodeId, {
        ...(canvas.textOverrides?.[selectedTextNodeId] ?? {}),
        fontFamily,
      }),
    }));
  }

  function handleChangeTextFontSizePercent(fontSizePercent: number) {
    if (!selectedTextNodeId || !selectedTextCanvasId) {
      return;
    }

    updateCanvasById(selectedTextCanvasId, (canvas) => ({
      ...canvas,
      textOverrides: upsertTextOverride(canvas.textOverrides ?? {}, selectedTextNodeId, {
        ...(canvas.textOverrides?.[selectedTextNodeId] ?? {}),
        fontSizePercent,
      }),
    }));
  }

  function handleChangeTextContent(textContent: string) {
    if (!selectedTextNodeId || !selectedTextCanvasId || !selectedTextNode) {
      return;
    }

    const normalizedTextContent =
      textContent === selectedTextNode.originalText ? undefined : textContent;

    updateCanvasById(selectedTextCanvasId, (canvas) => ({
      ...canvas,
      textOverrides: upsertTextOverride(canvas.textOverrides ?? {}, selectedTextNodeId, {
        ...(canvas.textOverrides?.[selectedTextNodeId] ?? {}),
        textContent: normalizedTextContent,
      }),
    }));
  }

  function handleResetTextOverride() {
    if (!selectedTextNodeId || !selectedTextCanvasId) {
      return;
    }

    updateCanvasById(selectedTextCanvasId, (canvas) => ({
      ...canvas,
      textOverrides: omitTextOverride(canvas.textOverrides ?? {}, selectedTextNodeId),
    }));
  }

  function updateActiveCanvas(updater: (canvas: CanvasVersion) => CanvasVersion) {
    updateCanvasById(activeCanvasId, updater);
  }

  function updateCanvasById(canvasId: string, updater: (canvas: CanvasVersion) => CanvasVersion) {
    const nextCanvases = canvases.map((canvas) =>
      canvas.id === canvasId ? updater(canvas) : canvas,
    );

    if (nextCanvases.every((canvas, index) => canvas === canvases[index])) {
      return;
    }

    pushEditingHistory();
    setCanvases(nextCanvases);
  }

  function handleChangeCanvasSettings(settings: CanvasSettings) {
    updateActiveCanvas((canvas) => ({
      ...canvas,
      settings,
    }));
  }

  function clearTextSelection() {
    setSelectedTextNodeId("");
    setSelectedTextCanvasId("");
    setSelectedTextAnchor(null);
  }

  function pushEditingHistory(snapshotCanvases = canvases) {
    const snapshot: EditingSnapshot = {
      canvases: cloneCanvases(snapshotCanvases),
      activeCanvasId,
      nextCanvasNumber,
    };

    setEditingHistory((currentHistory) => [...currentHistory.slice(-39), snapshot]);
  }

  return (
    <main
      className="app"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        handleDroppedFiles(Array.from(event.dataTransfer.files ?? []));
      }}
    >
      <RoughFrameLayer />
      <RoughFrame as="aside" className="sidebar" radius={16} strokeWidth={1.4}>
        <div className="brand">
          <img className="brand__mark" src={logoUrl} alt={copy.brandTitle} />
          <div className="brand__copy">
            <h1>{copy.brandTitle}</h1>
            <span className="brand__latin">{copy.brandLatin}</span>
            <p>{copy.brandSubtitle}</p>
          </div>
        </div>

        <CanvasVersionControls
          activeCanvasId={activeCanvas.id}
          canvases={canvases}
          copy={copy.canvasVersion}
          fonts={fonts}
          onRemoveCanvas={handleRemoveCanvas}
          onSelectCanvas={(canvasId) => {
            handleSelectCanvas(canvasId);
            setPreviewMode("grid");
          }}
        />

        <FontControls
          copy={copy.fontControls}
          fonts={fonts}
          fontStatus={fontStatus}
          isReadingFonts={isReadingFonts}
          isReadingSystemFonts={isReadingSystemFonts}
          fontRules={getCanvasFontRules(activeCanvas)}
          systemFontSupported={systemFontSupported}
          textReport={svgProcessingResult.report}
          onAddFontFiles={handleFontFiles}
          onChangeFontRule={handleChangeFontRule}
          onLoadSystemFonts={handleLoadSystemFonts}
          onRemoveFont={handleRemoveFont}
        />

        {visibleError ? (
          <div className="notice" role="alert">
            {visibleError}
          </div>
        ) : null}
      </RoughFrame>

      <section className="workspace" aria-label={copy.workspaceLabel}>
          <CanvasToolbar
            copy={copy.canvasToolbar}
            canvasCopy={copy.canvasControls}
            helpCopy={copy.help}
            batchDisabled={exportableCanvases.length <= 1}
          disabled={!processedSvg}
          exportScale={scale}
          exportStatus={exportStatus}
          isExporting={isExporting}
          previewZoom={previewZoom}
          canvasSettings={activeCanvas.settings}
          canAddCanvas={Boolean(activeSvgSource)}
          canReset={Boolean(hasAnySvg || fonts.length > 0 || editingHistory.length > 0)}
          canUndo={editingHistory.length > 0}
          languageToggleLabel={copy.languageToggleLabel}
          languageToggleTitle={copy.languageToggleTitle}
          onAddCanvas={handleAddCanvas}
          onImportSvgFiles={handleSvgFiles}
          onBatchExport={handleBatchExport}
          onBatchExportSvg={handleBatchExportSvg}
          onChangeCanvasSettings={handleChangeCanvasSettings}
          onChangeExportScale={setScale}
          onChangePreviewZoom={handleChangePreviewZoom}
          onExport={handleExport}
          onExportSvg={handleExportSvg}
          onReset={handleClearCanvas}
          onToggleLanguage={() => setLanguage((current) => (current === "zh" ? "en" : "zh"))}
          onUndo={handleUndo}
        />
        <SvgPreview
          activeVariantId={activeCanvas.id}
          backgroundColor={activeCanvas.settings.backgroundColor}
          canRemoveVariant={canvases.length > 1}
          height={activeCanvas.settings.height}
          mode={previewMode}
          svg={processedSvg}
          variants={canvasPreviewVariants}
          width={activeCanvas.settings.width}
          zoom={previewZoom}
          copy={copy.preview}
          fontOptions={previewFontOptions}
          selectedTextAnchor={selectedTextAnchor}
          selectedTextNode={selectedTextNode}
          selectedTextOverride={selectedTextOverride}
          onChangeTextContent={handleChangeTextContent}
          onUploadSvgFiles={handleSvgFiles}
          onClearTextSelection={clearTextSelection}
          onExitFocus={handleExitFocus}
          onFocusVariant={handleFocusVariant}
          onRemoveVariant={handleRemoveCanvas}
          onSelectVariant={handleSelectCanvas}
          onSelectTextNode={handleSelectTextNode}
          onSelectTextOverride={handleSelectTextOverride}
          onChangeTextFontSizePercent={handleChangeTextFontSizePercent}
          onResetTextOverride={handleResetTextOverride}
          onWheelZoom={handleWheelZoom}
        />
      </section>
    </main>
  );
}

export default App;

function createCanvasVersion(
  index: number,
  canvasNames: AppCopy["canvasNames"],
  options?: {
    name?: string;
    svgFileName?: string;
    svgSource?: string;
    template?: CanvasVersion;
    copyTextOverrides?: boolean;
  },
): CanvasVersion {
  const template = options?.template;

  return {
    id: `canvas-${index}`,
    name: options?.name ?? (index === 1 ? canvasNames.main : canvasNames.numbered(index)),
    settings: template ? { ...template.settings } : { ...defaultSettings },
    svgFileName: options?.svgFileName,
    svgSource: options?.svgSource,
    fontRules: template ? { ...getCanvasFontRules(template) } : createFontRules(""),
    textOverrides:
      options?.copyTextOverrides && template?.textOverrides
        ? cloneTextOverrides(template.textOverrides)
        : {},
    selectedFontFamily: template?.selectedFontFamily ?? "",
  };
}

function clampPreviewZoom(value: number): PreviewZoom {
  return Math.min(Math.max(Math.round(value / 5) * 5, 20), 200);
}

function createCanvasSvg(
  canvas: CanvasVersion,
  svgSource: string,
  fonts: UploadedFont[],
  options?: { includeEditorAttributes?: boolean; selectedTextNodeId?: string },
): string {
  if (options?.includeEditorAttributes) {
    return processSvgPresentation(svgSource, {
      fonts,
      fontRules: getCanvasFontRules(canvas),
      textOverrides: canvas.textOverrides ?? {},
      includeEditorAttributes: true,
      selectedTextNodeId: options.selectedTextNodeId,
      styleScopeId: canvas.id,
      settings: canvas.settings,
    }).svg;
  }

  return applySvgPresentation(svgSource, {
    fonts,
    fontRules: getCanvasFontRules(canvas),
    textOverrides: canvas.textOverrides ?? {},
    includeEditorAttributes: options?.includeEditorAttributes,
    selectedTextNodeId: options?.selectedTextNodeId,
    styleScopeId: canvas.id,
    settings: canvas.settings,
  });
}

function isSvgFile(file: File): boolean {
  return file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
}

function isFontFile(file: File): boolean {
  return /\.(ttf|otf|woff2?)$/i.test(file.name);
}

function createPngFileName(
  svgFileName: string,
  canvas: CanvasVersion,
  scale: ExportScale,
): string {
  const baseName = sanitizeBaseFileName(svgFileName);

  return `${baseName}-${sanitizeFileSegment(canvas.name)}-${canvas.settings.width}x${canvas.settings.height}@${scale}x.png`;
}

function createCanvasName(fileName: string, fallback: string): string {
  const baseName = fileName.replace(/\.svg$/i, "").trim();

  return baseName || fallback;
}

function sanitizeBaseFileName(fileName: string): string {
  const baseName = fileName.replace(/\.svg$/i, "").trim() || "svg-export";

  return sanitizeFileSegment(baseName) || "svg-export";
}

function createUniqueFileName(fileName: string, usedFileNames: Set<string>): string {
  if (!usedFileNames.has(fileName)) {
    usedFileNames.add(fileName);
    return fileName;
  }

  const extensionMatch = fileName.match(/(\.[^.]+)$/);
  const extension = extensionMatch?.[1] ?? "";
  const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
  let index = 2;
  let nextFileName = `${baseName}-${String(index).padStart(2, "0")}${extension}`;

  while (usedFileNames.has(nextFileName)) {
    index += 1;
    nextFileName = `${baseName}-${String(index).padStart(2, "0")}${extension}`;
  }

  usedFileNames.add(nextFileName);
  return nextFileName;
}

function dedupeFonts(nextFonts: UploadedFont[], currentFonts: UploadedFont[]): UploadedFont[] {
  const currentFamilies = new Set(currentFonts.map((font) => font.family));

  return nextFonts.filter((font) => !currentFamilies.has(font.family));
}

function isSystemFontSelected(canvas: CanvasVersion, fonts: UploadedFont[]): boolean {
  const fontRules = getCanvasFontRules(canvas);
  const selectedFamilies = [
    fontRules.cjkFontFamily,
    fontRules.latinFontFamily,
    ...Object.values(canvas.textOverrides ?? {}).map((override) => override.fontFamily ?? ""),
  ];

  return fonts.some((font) => font.kind === "system" && selectedFamilies.includes(font.family));
}

function createFontRules(fontFamily: string): FontRules {
  return {
    cjkFontFamily: fontFamily,
    latinFontFamily: fontFamily,
    mixedTextPolicy: "preserve",
  };
}

function getCanvasFontRules(canvas: CanvasVersion): FontRules {
  return canvas.fontRules ?? createFontRules(canvas.selectedFontFamily ?? "");
}

function getPrimaryCanvasFont(canvas: CanvasVersion): string {
  return getPrimaryFontFromRules(getCanvasFontRules(canvas));
}

function getPrimaryFontFromRules(fontRules: FontRules): string {
  return fontRules.cjkFontFamily || fontRules.latinFontFamily;
}

function omitTextOverride(textOverrides: TextOverrides, textNodeId: string): TextOverrides {
  const { [textNodeId]: _removed, ...nextOverrides } = textOverrides;

  return nextOverrides;
}

function upsertTextOverride(
  textOverrides: TextOverrides,
  textNodeId: string,
  override: NonNullable<TextOverrides[string]>,
): TextOverrides {
  const fontSizePercent = Number.isFinite(override.fontSizePercent)
    ? Math.min(Math.max(Math.round(override.fontSizePercent ?? 100), 20), 300)
    : undefined;
  const normalizedOverride = {
    fontFamily: override.fontFamily || undefined,
    fontSizePercent: fontSizePercent === 100 ? undefined : fontSizePercent,
    ...(hasOwnValue(override, "textContent") && override.textContent !== undefined
      ? { textContent: override.textContent }
      : {}),
  };

  if (
    !normalizedOverride.fontFamily &&
    !normalizedOverride.fontSizePercent &&
    !hasOwnValue(normalizedOverride, "textContent")
  ) {
    return omitTextOverride(textOverrides, textNodeId);
  }

  return {
    ...textOverrides,
    [textNodeId]: normalizedOverride,
  };
}

function removeFontFamilyFromOverrides(
  textOverrides: TextOverrides,
  fontFamily: string,
): TextOverrides {
  const entries = Object.entries(textOverrides)
    .map(([textNodeId, override]): [string, NonNullable<TextOverrides[string]>] => [
      textNodeId,
      override.fontFamily === fontFamily ? { ...override, fontFamily: undefined } : override,
    ])
    .filter(([, override]) => Boolean(override.fontFamily || override.fontSizePercent || hasOwnValue(override, "textContent")));

  return Object.fromEntries(entries);
}

function cloneCanvases(canvases: CanvasVersion[]): CanvasVersion[] {
  return canvases.map((canvas) => ({
    ...canvas,
    settings: { ...canvas.settings },
    fontRules: canvas.fontRules ? { ...canvas.fontRules } : undefined,
    textOverrides: canvas.textOverrides ? cloneTextOverrides(canvas.textOverrides) : undefined,
  }));
}

function cloneTextOverrides(textOverrides: TextOverrides): TextOverrides {
  return Object.fromEntries(
    Object.entries(textOverrides).map(([textNodeId, override]) => [textNodeId, { ...override }]),
  );
}

function createPreviewFontOptions(fonts: UploadedFont[]): PreviewFontOption[] {
  const options: PreviewFontOption[] = [];
  const usedFamilies = new Set<string>();

  fonts
    .slice()
    .sort((first, second) => {
      if (first.kind === second.kind) {
        return first.name.localeCompare(second.name);
      }

      return first.kind === "system" ? 1 : -1;
    })
    .forEach((font) => {
      if (usedFamilies.has(font.family)) {
        return;
      }

      usedFamilies.add(font.family);
      options.push(createPreviewFontOption(font));
    });

  return options;
}

function createPreviewFontOption(font: UploadedFont): PreviewFontOption {
  const searchFields = [
    font.name,
    font.family,
    font.systemFont?.fullName ?? "",
    font.systemFont?.postscriptName ?? "",
    font.systemFont?.style ?? "",
  ];

  return {
    family: font.family,
    kind: font.kind === "system" ? "system" : "uploaded",
    label: font.name,
    searchText: createFontSearchText(searchFields),
  };
}

function createFontSearchText(fields: string[]): string {
  const rawText = fields.join(" ").toLowerCase();
  const compactText = rawText.replace(/[\s\-_.,/\\()]+/g, "");

  return `${rawText} ${compactText}`;
}

function hasOwnValue<T extends object>(target: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(target, key);
}
