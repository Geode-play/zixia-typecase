import type { CanvasSettings } from "../types";
import { canvasPresets } from "../lib/canvas/presets";
import { isTransparentColor } from "../lib/shared/text";

type CanvasControlsProps = {
  settings: CanvasSettings;
  onChange: (settings: CanvasSettings) => void;
};

export function CanvasControls({ settings, onChange }: CanvasControlsProps) {
  const isTransparent = isTransparentColor(settings.backgroundColor);
  const colorPickerValue = isHexColor(settings.backgroundColor) ? settings.backgroundColor : "#ffffff";
  const groupedPresets = Object.entries(
    canvasPresets.reduce<Record<string, typeof canvasPresets>>((groups, preset) => {
      groups[preset.group] = [...(groups[preset.group] ?? []), preset];
      return groups;
    }, {}),
  );

  return (
    <div className="control-group">
      <div className="control-group__title">画布</div>
      <label className="field">
        <span>常用尺寸</span>
        <select
          value=""
          onChange={(event) => {
            const preset = canvasPresets.find((item) => item.id === event.target.value);

            if (preset) {
              onChange({ ...settings, width: preset.width, height: preset.height });
            }
          }}
        >
          <option value="">选择预设尺寸</option>
          {groupedPresets.map(([group, presets]) => (
            <optgroup key={group} label={group}>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label} · {preset.width}×{preset.height}
                  {preset.note ? ` · ${preset.note}` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="grid-two">
        <label className="field">
          <span>宽度</span>
          <input
            min="1"
            type="number"
            value={settings.width}
            onChange={(event) =>
              onChange({ ...settings, width: toPositiveInteger(event.target.value, 1080) })
            }
          />
        </label>
        <label className="field">
          <span>高度</span>
          <input
            min="1"
            type="number"
            value={settings.height}
            onChange={(event) =>
              onChange({ ...settings, height: toPositiveInteger(event.target.value, 1440) })
            }
          />
        </label>
      </div>
      <label className="toggle-field">
        <input
          checked={isTransparent}
          type="checkbox"
          onChange={(event) =>
            onChange({
              ...settings,
              backgroundColor: event.target.checked ? "transparent" : "#ffffff",
            })
          }
        />
        <span>透明背景</span>
      </label>
      <label className="field field--color">
        <span>背景色</span>
        <input
          disabled={isTransparent}
          type="color"
          value={colorPickerValue}
          onChange={(event) => onChange({ ...settings, backgroundColor: event.target.value })}
        />
        <input
          type="text"
          value={settings.backgroundColor}
          onChange={(event) =>
            onChange({ ...settings, backgroundColor: normalizeBackgroundColor(event.target.value) })
          }
        />
      </label>
    </div>
  );
}

function toPositiveInteger(value: string, fallback: number): number {
  const nextValue = Number.parseInt(value, 10);

  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : fallback;
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

function normalizeBackgroundColor(value: string): string {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : "transparent";
}
