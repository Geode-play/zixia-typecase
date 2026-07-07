import type { CanvasSettings } from "../types";
import type { AppCopy } from "../i18n";
import { canvasPresetGroups, canvasPresets, formatCanvasPreset } from "../lib/canvas/presets";
import { isTransparentColor } from "../lib/shared/text";
import { WiredCheckbox, WiredInput, WiredSelect, type WiredSelectOption } from "./wired/WiredElements";

type CanvasControlsProps = {
  copy: AppCopy["canvasControls"];
  settings: CanvasSettings;
  onChange: (settings: CanvasSettings) => void;
  showTitle?: boolean;
};

export function CanvasControls({ copy, settings, onChange, showTitle = true }: CanvasControlsProps) {
  const isTransparent = isTransparentColor(settings.backgroundColor);
  const colorPickerValue = isHexColor(settings.backgroundColor) ? settings.backgroundColor : "#ffffff";
  const presetOptions = createPresetOptions(copy.choosePresetSize);
  const selectedPreset = canvasPresets.find(
    (preset) => preset.width === settings.width && preset.height === settings.height,
  );

  return (
    <div className="control-group">
      {showTitle ? <div className="control-group__title">{copy.title}</div> : null}
      <label className="field">
        <span>{copy.presetSize}</span>
        <WiredSelect
          ariaLabel={copy.presetSize}
          className="wired-field-control"
          options={presetOptions}
          placeholder={copy.choosePresetSize}
          value={selectedPreset?.id ?? ""}
          onValueChange={(value) => {
            const preset = canvasPresets.find((item) => item.id === value);

            if (preset) {
              onChange({ ...settings, width: preset.width, height: preset.height });
            }
          }}
        />
      </label>
      <div className="grid-two">
        <label className="field">
          <span>{copy.width}</span>
          <WiredInput
            min="1"
            type="number"
            value={settings.width}
            onValueChange={(value) =>
              onChange({ ...settings, width: toPositiveInteger(value, 1080) })
            }
          />
        </label>
        <label className="field">
          <span>{copy.height}</span>
          <WiredInput
            min="1"
            type="number"
            value={settings.height}
            onValueChange={(value) =>
              onChange({ ...settings, height: toPositiveInteger(value, 1440) })
            }
          />
        </label>
      </div>
      <label className="toggle-field">
        <WiredCheckbox
          checked={isTransparent}
          onCheckedChange={(checked) =>
            onChange({
              ...settings,
              backgroundColor: checked ? "transparent" : "#ffffff",
            })
          }
        />
        <span>{copy.transparentBackground}</span>
      </label>
      <label className="field field--color">
        <span>{copy.background}</span>
        <input
          type="color"
          value={colorPickerValue}
          onChange={(event) => onChange({ ...settings, backgroundColor: event.target.value })}
        />
        <WiredInput
          type="text"
          value={settings.backgroundColor}
          onValueChange={(value) =>
            onChange({ ...settings, backgroundColor: normalizeBackgroundColor(value) })
          }
        />
      </label>
    </div>
  );
}

function createPresetOptions(emptyLabel: string): WiredSelectOption[] {
  return [
    { label: emptyLabel, value: "" },
    ...canvasPresetGroups.flatMap((group) =>
      [
        { disabled: true, label: group, value: `group-${group}` },
        ...canvasPresets
          .filter((preset) => preset.group === group)
          .map((preset) => ({
            label: formatCanvasPreset(preset),
            value: preset.id,
          })),
      ],
    ),
  ];
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
