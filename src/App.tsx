import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasControls } from "./components/CanvasControls";
import { CanvasVersionControls } from "./components/CanvasVersionControls";
import { ExportControls } from "./components/ExportControls";
import { FileDropInput } from "./components/FileDropInput";
import { FontControls } from "./components/FontControls";
import { SvgPreview, type PreviewVariant } from "./components/SvgPreview";
import { downloadBlob, downloadTextFile, exportSvgToPng } from "./lib/export/pngExporter";
import { builtInFontCatalog, loadBuiltInFont } from "./lib/fonts/builtInFonts";
import { createUploadedFonts, releaseUploadedFont, releaseUploadedFonts } from "./lib/fonts/fontManager";
import { sanitizeFileSegment } from "./lib/shared/text";
import { applySvgPresentation, processSvgPresentation } from "./lib/svg/svgProcessor";
import type { CanvasSettings, CanvasVersion, ExportScale, UploadedFont } from "./types";

const defaultSettings: CanvasSettings = {
  width: 1080,
  height: 1440,
  backgroundColor: "transparent",
};

function App() {
  const [svgSource, setSvgSource] = useState("");
  const [svgFileName, setSvgFileName] = useState("未选择 SVG");
  const [fonts, setFonts] = useState<UploadedFont[]>([]);
  const [canvases, setCanvases] = useState<CanvasVersion[]>(() => [createCanvasVersion(1)]);
  const [activeCanvasId, setActiveCanvasId] = useState("canvas-1");
  const [nextCanvasNumber, setNextCanvasNumber] = useState(2);
  const [scale, setScale] = useState<ExportScale>(2);
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isReadingFonts, setIsReadingFonts] = useState(false);
  const [loadingBuiltInFontId, setLoadingBuiltInFontId] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const fontsRef = useRef<UploadedFont[]>([]);

  const activeCanvas = canvases.find((canvas) => canvas.id === activeCanvasId) ?? canvases[0];

  useEffect(() => {
    fontsRef.current = fonts;
  }, [fonts]);

  useEffect(
    () => () => {
      releaseUploadedFonts(fontsRef.current);
    },
    [],
  );

  const svgProcessingResult = useMemo(() => {
    if (!svgSource || !activeCanvas) {
      return { error: "", report: undefined, svg: "" };
    }

    try {
      const result = processSvgPresentation(svgSource, {
        fonts,
        selectedChineseFontFamily: activeCanvas.selectedChineseFontFamily,
        selectedEnglishFontFamily: activeCanvas.selectedEnglishFontFamily,
        settings: activeCanvas.settings,
      });

      return {
        error: "",
        report: result.report,
        svg: result.svg,
      };
    } catch (caughtError) {
      return {
        error:
          caughtError instanceof Error ? caughtError.message : "SVG 处理失败，请重新上传文件。",
        report: undefined,
        svg: "",
      };
    }
  }, [activeCanvas, fonts, svgSource]);

  const canvasPreviewVariants = useMemo<PreviewVariant[]>(() => {
    if (!svgSource || canvases.length <= 1) {
      return [];
    }

    return canvases
      .map((canvas) => {
        try {
          return {
            id: canvas.id,
            label: canvas.name,
            svg: createCanvasSvg(canvas, svgSource, fonts),
          };
        } catch {
          return null;
        }
      })
      .filter((variant): variant is PreviewVariant => Boolean(variant));
  }, [canvases, fonts, svgSource]);

  const processedSvg = svgProcessingResult.svg;
  const visibleError = error || svgProcessingResult.error;

  async function handleSvgFiles(files: File[]) {
    const file = files[0];

    if (!file) {
      return;
    }

    try {
      setError("");
      setExportStatus("");
      setSvgSource(await file.text());
      setSvgFileName(file.name);
    } catch {
      setError("无法读取 SVG 文件。");
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
        updateActiveCanvas((canvas) => ({
          ...canvas,
          selectedChineseFontFamily: canvas.selectedChineseFontFamily || uniqueFonts[0].family,
          selectedEnglishFontFamily: canvas.selectedEnglishFontFamily || uniqueFonts[0].family,
        }));
      }
    } catch {
      setError("字体文件读取失败，请确认格式为 TTF、OTF、WOFF 或 WOFF2。");
    } finally {
      setIsReadingFonts(false);
    }
  }

  async function handleLoadBuiltInFont(
    fontId: string,
    options?: { selectCategory?: "zh" | "en" },
  ) {
    setLoadingBuiltInFontId(fontId);

    try {
      setError("");
      const builtInFont = await loadBuiltInFont(fontId);
      const category = getBuiltInFontCategory(builtInFont.family);

      setFonts((currentFonts) => {
        if (currentFonts.some((font) => font.family === builtInFont.family)) {
          return currentFonts;
        }

        return [...currentFonts, builtInFont];
      });

      if (options?.selectCategory === "zh" || (!options && category === "zh")) {
        updateActiveCanvas((canvas) => ({
          ...canvas,
          selectedChineseFontFamily: builtInFont.family,
        }));
      }

      if (options?.selectCategory === "en" || (!options && category === "en")) {
        updateActiveCanvas((canvas) => ({
          ...canvas,
          selectedEnglishFontFamily: builtInFont.family,
        }));
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "内置字体加载失败。");
    } finally {
      setLoadingBuiltInFontId("");
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
    const nextCanvas = {
      ...activeCanvas,
      id: `canvas-${nextCanvasNumber}`,
      name: `画布 ${nextCanvasNumber}`,
      settings: { ...activeCanvas.settings },
    };

    setCanvases((currentCanvases) => [...currentCanvases, nextCanvas]);
    setActiveCanvasId(nextCanvas.id);
    setNextCanvasNumber((currentNumber) => currentNumber + 1);
  }

  function handleDuplicateCanvas(canvasId: string) {
    const sourceCanvas = canvases.find((canvas) => canvas.id === canvasId);

    if (!sourceCanvas) {
      return;
    }

    const nextCanvas = {
      ...sourceCanvas,
      id: `canvas-${nextCanvasNumber}`,
      name: `${sourceCanvas.name} 副本`,
      settings: { ...sourceCanvas.settings },
    };

    setCanvases((currentCanvases) => [...currentCanvases, nextCanvas]);
    setActiveCanvasId(nextCanvas.id);
    setNextCanvasNumber((currentNumber) => currentNumber + 1);
  }

  function handleRemoveCanvas(canvasId: string) {
    setCanvases((currentCanvases) => {
      if (currentCanvases.length <= 1) {
        return currentCanvases;
      }

      const nextCanvases = currentCanvases.filter((canvas) => canvas.id !== canvasId);

      if (canvasId === activeCanvasId) {
        setActiveCanvasId(nextCanvases[0].id);
      }

      return nextCanvases;
    });
  }

  async function handleExport() {
    if (!processedSvg || !activeCanvas) {
      return;
    }

    setIsExporting(true);

    try {
      setExportStatus("正在生成 PNG...");
      const blob = await exportSvgToPng(processedSvg, activeCanvas.settings, scale);
      const fileName = createPngFileName(svgFileName, activeCanvas, scale);
      downloadBlob(blob, fileName);
      setExportStatus(`已导出 ${fileName}`);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "PNG 导出失败。";
      setError(message);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleBatchExport() {
    if (!svgSource || canvases.length === 0) {
      return;
    }

    setIsExporting(true);

    try {
      for (const [index, canvas] of canvases.entries()) {
        setExportStatus(`正在导出 ${index + 1}/${canvases.length}：${canvas.name}`);
        const svg = createCanvasSvg(canvas, svgSource, fonts);
        const blob = await exportSvgToPng(svg, canvas.settings, scale);
        downloadBlob(blob, createPngFileName(svgFileName, canvas, scale));
      }

      setExportStatus(`已批量导出 ${canvases.length} 个 PNG`);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "批量导出失败。";
      setError(message);
    } finally {
      setIsExporting(false);
    }
  }

  function handleExportSvg() {
    if (!processedSvg || !activeCanvas) {
      return;
    }

    const baseName = svgFileName.replace(/\.svg$/i, "") || "svg-export";
    const fileName = `${baseName}-${sanitizeFileSegment(activeCanvas.name)}-editable.svg`;
    downloadTextFile(processedSvg, fileName, "image/svg+xml;charset=utf-8");
    setExportStatus(`已导出 ${fileName}`);
  }

  function handleBatchExportSvg() {
    if (!svgSource) {
      return;
    }

    const baseName = svgFileName.replace(/\.svg$/i, "") || "svg-export";

    canvases.forEach((canvas) => {
      const svg = createCanvasSvg(canvas, svgSource, fonts);
      downloadTextFile(
        svg,
        `${baseName}-${sanitizeFileSegment(canvas.name)}-editable.svg`,
        "image/svg+xml;charset=utf-8",
      );
    });
    setExportStatus(`已批量导出 ${canvases.length} 个 SVG`);
  }

  function handleRemoveFont(fontId: string) {
    const fontToRemove = fonts.find((font) => font.id === fontId);

    if (!fontToRemove) {
      return;
    }

    releaseUploadedFont(fontToRemove);
    setFonts((currentFonts) => currentFonts.filter((font) => font.id !== fontId));
    setCanvases((currentCanvases) =>
      currentCanvases.map((canvas) => ({
        ...canvas,
        selectedChineseFontFamily:
          canvas.selectedChineseFontFamily === fontToRemove.family
            ? ""
            : canvas.selectedChineseFontFamily,
        selectedEnglishFontFamily:
          canvas.selectedEnglishFontFamily === fontToRemove.family
            ? ""
            : canvas.selectedEnglishFontFamily,
      })),
    );
  }

  function updateActiveCanvas(updater: (canvas: CanvasVersion) => CanvasVersion) {
    setCanvases((currentCanvases) =>
      currentCanvases.map((canvas) => (canvas.id === activeCanvasId ? updater(canvas) : canvas)),
    );
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
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark">S</span>
          <div>
            <h1>SVG Font Switcher</h1>
            <p>本地字体切换与高清 PNG 导出</p>
          </div>
        </div>

        <div className="panel">
          <FileDropInput
            accept=".svg,image/svg+xml"
            hint="选择一个 SVG 文件"
            id="svg-upload"
            label="上传 SVG"
            onFiles={handleSvgFiles}
          />
          <FileDropInput
            accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
            hint={isReadingFonts ? "正在读取字体..." : "可一次选择多个字体文件"}
            id="font-upload"
            label="上传字体"
            multiple
            onFiles={handleFontFiles}
          />
        </div>

        <CanvasVersionControls
          activeCanvasId={activeCanvas.id}
          canvases={canvases}
          fonts={fonts}
          onAddCanvas={handleAddCanvas}
          onDuplicateCanvas={handleDuplicateCanvas}
          onRemoveCanvas={handleRemoveCanvas}
          onSelectCanvas={setActiveCanvasId}
        />

        <CanvasControls
          settings={activeCanvas.settings}
          onChange={(settings) =>
            updateActiveCanvas((canvas) => ({
              ...canvas,
              settings,
            }))
          }
        />

        <FontControls
          builtInFonts={builtInFontCatalog}
          fonts={fonts}
          loadingBuiltInFontId={loadingBuiltInFontId}
          selectedChineseFontFamily={activeCanvas.selectedChineseFontFamily}
          selectedEnglishFontFamily={activeCanvas.selectedEnglishFontFamily}
          onLoadBuiltInFont={handleLoadBuiltInFont}
          onRemoveFont={handleRemoveFont}
          onSelectChineseFont={(fontFamily) =>
            updateActiveCanvas((canvas) => ({
              ...canvas,
              selectedChineseFontFamily: fontFamily,
            }))
          }
          onSelectEnglishFont={(fontFamily) =>
            updateActiveCanvas((canvas) => ({
              ...canvas,
              selectedEnglishFontFamily: fontFamily,
            }))
          }
        />

        <ExportControls
          batchDisabled={!processedSvg || canvases.length <= 1}
          disabled={!processedSvg}
          isExporting={isExporting}
          scale={scale}
          status={exportStatus}
          onBatchExport={handleBatchExport}
          onBatchExportSvg={handleBatchExportSvg}
          onChangeScale={setScale}
          onExport={handleExport}
          onExportSvg={handleExportSvg}
        />

        {visibleError ? (
          <div className="notice" role="alert">
            {visibleError}
          </div>
        ) : null}
      </aside>

      <section className="workspace" aria-label="SVG 预览">
        <SvgPreview
          activeVariantId={activeCanvas.id}
          backgroundColor={activeCanvas.settings.backgroundColor}
          fileName={`${svgFileName} · ${activeCanvas.name}`}
          height={activeCanvas.settings.height}
          svg={processedSvg}
          variants={canvasPreviewVariants}
          width={activeCanvas.settings.width}
          onSelectVariant={setActiveCanvasId}
        />
      </section>
    </main>
  );
}

export default App;

function createCanvasVersion(index: number): CanvasVersion {
  return {
    id: `canvas-${index}`,
    name: index === 1 ? "主画布" : `画布 ${index}`,
    settings: { ...defaultSettings },
    selectedChineseFontFamily: "",
    selectedEnglishFontFamily: "",
  };
}

function createCanvasSvg(canvas: CanvasVersion, svgSource: string, fonts: UploadedFont[]): string {
  return applySvgPresentation(svgSource, {
    fonts,
    selectedChineseFontFamily: canvas.selectedChineseFontFamily,
    selectedEnglishFontFamily: canvas.selectedEnglishFontFamily,
    settings: canvas.settings,
  });
}

function isSvgFile(file: File): boolean {
  return file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
}

function isFontFile(file: File): boolean {
  return /\.(ttf|otf|woff2?)$/i.test(file.name);
}

function getBuiltInFontCategory(fontFamily: string): "zh" | "en" | null {
  return builtInFontCatalog.find((font) => font.family === fontFamily)?.category ?? null;
}

function createPngFileName(
  svgFileName: string,
  canvas: CanvasVersion,
  scale: ExportScale,
): string {
  const baseName = svgFileName.replace(/\.svg$/i, "") || "svg-export";

  return `${baseName}-${sanitizeFileSegment(canvas.name)}-${canvas.settings.width}x${canvas.settings.height}@${scale}x.png`;
}

function dedupeFonts(nextFonts: UploadedFont[], currentFonts: UploadedFont[]): UploadedFont[] {
  const currentFamilies = new Set(currentFonts.map((font) => font.family));

  return nextFonts.filter((font) => !currentFamilies.has(font.family));
}
