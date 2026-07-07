export type CanvasPresetGroup = "方圖" | "豎圖" | "長圖" | "横圖";

export type CanvasPreset = {
  id: string;
  group: CanvasPresetGroup;
  width: number;
  height: number;
  ratio?: string;
};

export const canvasPresetGroups: CanvasPresetGroup[] = ["方圖", "豎圖", "長圖", "横圖"];

export const canvasPresets: CanvasPreset[] = [
  { id: "square-1080", group: "方圖", width: 1080, height: 1080, ratio: "1:1" },
  { id: "square-600", group: "方圖", width: 600, height: 600, ratio: "1:1" },
  { id: "square-400", group: "方圖", width: 400, height: 400, ratio: "1:1" },
  { id: "portrait-1080-1440", group: "豎圖", width: 1080, height: 1440, ratio: "3:4" },
  { id: "portrait-1242-1660", group: "豎圖", width: 1242, height: 1660, ratio: "3:4" },
  { id: "story-1080-1920", group: "豎圖", width: 1080, height: 1920, ratio: "9:16" },
  { id: "portrait-1200-1920", group: "長圖", width: 1200, height: 1920 },
  { id: "portrait-800-2000", group: "長圖", width: 800, height: 2000 },
  { id: "landscape-1920-1080", group: "横圖", width: 1920, height: 1080, ratio: "16:9" },
  { id: "landscape-1440-1080", group: "横圖", width: 1440, height: 1080, ratio: "4:3" },
  { id: "landscape-2560-1440", group: "横圖", width: 2560, height: 1440, ratio: "16:9" },
  { id: "wide-1920-900", group: "横圖", width: 1920, height: 900 },
];

export function formatCanvasPreset(preset: CanvasPreset): string {
  const size = `${preset.width}×${preset.height}`;

  return preset.ratio ? `${size} · ${preset.ratio}` : size;
}
