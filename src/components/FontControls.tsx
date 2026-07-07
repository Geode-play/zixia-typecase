import { useEffect, useMemo, useRef, useState } from "react";
import { WiredButton, WiredSelect } from "./wired/WiredElements";
import type { AppCopy } from "../i18n";
import type { FontRules, SvgProcessingReport, UploadedFont } from "../types";

type FontControlsProps = {
  copy: AppCopy["fontControls"];
  fonts: UploadedFont[];
  fontRules: FontRules;
  fontStatus: string;
  isReadingFonts: boolean;
  isReadingSystemFonts: boolean;
  systemFontSupported: boolean;
  textReport?: SvgProcessingReport;
  onAddFontFiles: (files: File[]) => void;
  onChangeFontRule: (ruleName: keyof Pick<FontRules, "cjkFontFamily" | "latinFontFamily">, fontFamily: string) => void;
  onLoadSystemFonts: () => void;
  onRemoveFont: (fontId: string) => void;
};

type FontOptionGroup = {
  label: string;
  options: FontOption[];
};

type FontOption = {
  family: string;
  label: string;
  searchText: string;
};

export function FontControls({
  copy,
  fonts,
  fontRules,
  fontStatus,
  isReadingFonts,
  isReadingSystemFonts,
  systemFontSupported,
  textReport,
  onAddFontFiles,
  onChangeFontRule,
  onLoadSystemFonts,
  onRemoveFont,
}: FontControlsProps) {
  const fontInputRef = useRef<HTMLInputElement | null>(null);
  const uploadedFonts = fonts.filter((font) => font.kind !== "system");
  const hasSystemFonts = fonts.some((font) => font.kind === "system");
  const optionGroups = createFontOptionGroups({
    copy,
    fonts,
    uploadedFonts,
  });

  return (
    <div className="control-group">
      <div className="control-group__title">{copy.title}</div>

      <div className="font-rule-grid">
        <FontRuleSelect
          label={copy.cjkFont}
          keepOriginalLabel={copy.keepOriginal}
          loadingPlaceholder={copy.loadingPlaceholder}
          noMatchingFonts={copy.noMatchingFonts}
          optionGroups={optionGroups}
          value={fontRules.cjkFontFamily}
          searchPlaceholder={copy.searchFonts}
          onChange={(fontFamily) => onChangeFontRule("cjkFontFamily", fontFamily)}
        />
        <FontRuleSelect
          label={copy.latinFont}
          keepOriginalLabel={copy.keepOriginal}
          loadingPlaceholder={copy.loadingPlaceholder}
          noMatchingFonts={copy.noMatchingFonts}
          optionGroups={optionGroups}
          value={fontRules.latinFontFamily}
          searchPlaceholder={copy.searchFonts}
          onChange={(fontFamily) => onChangeFontRule("latinFontFamily", fontFamily)}
        />
      </div>

      <div className="local-font-action">
        <input
          ref={fontInputRef}
          accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
          multiple
          type="file"
          onChange={(event) => {
            onAddFontFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <WiredButton onClick={() => fontInputRef.current?.click()}>
          {isReadingFonts ? copy.readingFonts : copy.addLocalFonts}
        </WiredButton>
      </div>

      <div className="system-font-tools">
        {!hasSystemFonts ? (
          <WiredButton disabled={!systemFontSupported || isReadingSystemFonts} onClick={onLoadSystemFonts}>
            {isReadingSystemFonts ? copy.loadingSystemFonts : copy.loadSystemFonts}
          </WiredButton>
        ) : null}
        {!systemFontSupported ? (
          <span>
            {copy.systemFontUnsupported} {copy.systemFontFallback}
          </span>
        ) : null}
        {fontStatus ? <span className="font-status">{fontStatus}</span> : null}
      </div>

      {textReport ? <TextAnalysis copy={copy} report={textReport} /> : null}

      {uploadedFonts.length > 0 ? (
        <div className="font-manager">
          <div className="mini-title">{copy.localFonts}</div>
          {uploadedFonts.map((font) => (
            <div className="font-row" key={font.id}>
              <span className="font-row__name">{font.name}</span>
              <span>{copy.uploadedFont}</span>
              <WiredButton onClick={() => onRemoveFont(font.id)}>{copy.remove}</WiredButton>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FontRuleSelect({
  label,
  keepOriginalLabel,
  loadingPlaceholder,
  noMatchingFonts,
  optionGroups,
  searchPlaceholder,
  value,
  onChange,
}: {
  label: string;
  keepOriginalLabel: string;
  loadingPlaceholder: string;
  noMatchingFonts: string;
  optionGroups: FontOptionGroup[];
  searchPlaceholder: string;
  value: string;
  onChange: (fontFamily: string) => void;
}) {
  const isWaitingForFonts = optionGroups.length === 0;

  return (
    <label className="font-select-field">
      <span>{label}</span>
      <FontSearchSelect
        ariaLabel={label}
        disabled={isWaitingForFonts}
        keepOriginalLabel={keepOriginalLabel}
        noResultsLabel={noMatchingFonts}
        optionGroups={optionGroups}
        placeholder={isWaitingForFonts ? loadingPlaceholder : keepOriginalLabel}
        searchPlaceholder={searchPlaceholder}
        value={value}
        onChange={onChange}
      />
    </label>
  );
}

function FontSearchSelect({
  ariaLabel,
  disabled,
  keepOriginalLabel,
  noResultsLabel,
  optionGroups,
  placeholder,
  searchPlaceholder,
  value,
  onChange,
}: {
  ariaLabel: string;
  disabled: boolean;
  keepOriginalLabel: string;
  noResultsLabel: string;
  optionGroups: FontOptionGroup[];
  placeholder: string;
  searchPlaceholder: string;
  value: string;
  onChange: (fontFamily: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeFontSearchToken(query.trim());
  const selectedOption = optionGroups.flatMap((group) => group.options).find((option) => option.family === value);
  const triggerLabel = selectedOption?.label ?? placeholder;
  const filteredGroups = useMemo(
    () =>
      normalizedQuery
        ? optionGroups
            .map((group) => ({
              ...group,
              options: group.options.filter((option) => option.searchText.includes(normalizedQuery)),
            }))
            .filter((group) => group.options.length > 0)
        : optionGroups,
    [normalizedQuery, optionGroups],
  );
  const hasResults = filteredGroups.some((group) => group.options.length > 0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isOpen]);

  function selectFont(fontFamily: string) {
    onChange(fontFamily);
    setIsOpen(false);
    setQuery("");
  }

  return (
    <div className="font-search-select" ref={ref}>
      <div onMouseDownCapture={() => setIsOpen((current) => !current)}>
        <WiredSelect
          ariaLabel={ariaLabel}
          className="font-search-select__trigger wired-field-control"
          disabled={disabled}
          options={[{ label: triggerLabel, value }]}
          placeholder={placeholder}
          value={value}
          onValueChange={() => undefined}
        />
      </div>
      {isOpen ? (
        <div className="font-search-select__menu">
          <input
            autoFocus
            className="font-search-select__input"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsOpen(false);
              }
            }}
          />
          {!normalizedQuery ? (
            <button className="font-search-select__option" type="button" onClick={() => selectFont("")}>
              {keepOriginalLabel}
            </button>
          ) : null}
          {filteredGroups.map((group) => (
            <div className="font-search-select__group" key={group.label}>
              <div className="font-search-select__group-label">{group.label}</div>
              {group.options.map((option) => (
                <button
                  aria-selected={option.family === value ? "true" : undefined}
                  className={
                    option.family === value
                      ? "font-search-select__option is-active"
                      : "font-search-select__option"
                  }
                  key={option.family}
                  type="button"
                  onClick={() => selectFont(option.family)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ))}
          {!hasResults ? <span className="font-search-select__empty">{noResultsLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function TextAnalysis({ copy, report }: { copy: AppCopy["fontControls"]; report: SvgProcessingReport }) {
  return (
    <div className={report.mixedTextElementCount > 0 ? "text-analysis has-warning" : "text-analysis"}>
      <span>
        {copy.textAnalysis(
          report.textElementCount,
          report.pureCjkTextElementCount,
          report.pureLatinTextElementCount,
          report.mixedTextElementCount,
          report.emptyTextElementCount,
        )}
      </span>
      {report.textElementCount === 0 ? (
        <strong>{copy.noEditableText}</strong>
      ) : null}
      {report.mixedTextElementCount > 0 ? <strong>{copy.mixedTextDetected}</strong> : null}
    </div>
  );
}

function createFontOptionGroups({
  copy,
  fonts,
  uploadedFonts,
}: {
  copy: AppCopy["fontControls"];
  fonts: UploadedFont[];
  uploadedFonts: UploadedFont[];
}): FontOptionGroup[] {
  const groups: FontOptionGroup[] = [];
  const usedFamilies = new Set<string>();
  const systemFonts = fonts
    .filter((font) => font.kind === "system")
    .sort(sortFontsByName);

  addGroup(groups, copy.uploadedFonts, uploadedFonts.sort(sortFontsByName), usedFamilies);
  addGroup(groups, copy.systemFonts, systemFonts, usedFamilies);

  return groups;
}

function addGroup(
  groups: FontOptionGroup[],
  label: string,
  fonts: UploadedFont[],
  usedFamilies: Set<string>,
): void {
  const options = fonts
    .filter((font) => {
      if (usedFamilies.has(font.family)) {
        return false;
      }

      usedFamilies.add(font.family);
      return true;
    })
    .map((font) => ({
      family: font.family,
      label: font.name,
      searchText: createFontSearchText([
        font.name,
        font.family,
        font.systemFont?.fullName ?? "",
        font.systemFont?.postscriptName ?? "",
        font.systemFont?.style ?? "",
      ]),
    }));

  if (options.length > 0) {
    groups.push({ label, options });
  }
}

function sortFontsByName(first: UploadedFont, second: UploadedFont) {
  return first.name.localeCompare(second.name);
}

function createFontSearchText(fields: string[]): string {
  const rawText = fields.join(" ").toLowerCase();

  return `${rawText} ${normalizeFontSearchToken(rawText)}`;
}

function normalizeFontSearchToken(value: string): string {
  return value.toLowerCase().replace(/[\s\-_.,/\\()]+/g, "");
}
