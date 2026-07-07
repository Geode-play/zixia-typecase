import { createElement, useEffect, useMemo, useRef, type CSSProperties, type MouseEventHandler, type ReactNode } from "react";
import "../../lib/wired/roughCompatibility";
import "wired-elements/lib/wired-button.js";
import "wired-elements/lib/wired-checkbox.js";
import "wired-elements/lib/wired-combo.js";
import "wired-elements/lib/wired-input.js";
import "wired-elements/lib/wired-item.js";
import "wired-elements/lib/wired-slider.js";

const emptySelectValue = "__svg_font_switcher_empty__";
const wiredShadowStyleId = "svg-font-switcher-wired-style";
const wiredShadowStyle = `
  button,
  input,
  #textPanel,
  #dropPanel,
  wired-item {
    font-family: inherit !important;
    font-size: inherit !important;
    font-weight: 750 !important;
    letter-spacing: 0 !important;
    text-transform: none !important;
  }

  button {
    background: var(--wired-button-bg, var(--wired-control-bg, #f4f1ea)) !important;
    border-radius: var(--wired-button-radius, 8px) !important;
    color: inherit !important;
  }

  :host(.toolbar-button) button {
    min-height: 32px !important;
    padding: 0 10px !important;
  }

  :host(.toolbar-icon-button) button,
  :host(.toolbar-export-button) button,
  :host(.focus-grid-button) button,
  :host(.focus-rail__arrow) button,
  :host(.focus-rail__item) button,
  :host(.preview-item__remove) button,
  :host(.canvas-select__remove) button,
  :host(.text-context-popover__header) button {
    display: grid !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    place-items: center !important;
    padding: 0 !important;
    border-radius: inherit !important;
  }

  :host(.canvas-select__trigger) button {
    width: 100% !important;
    min-height: 50px !important;
    padding: 8px 12px !important;
    text-align: left !important;
  }

  :host(.canvas-select__trigger) slot {
    display: grid !important;
    width: 100% !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    align-items: center !important;
    gap: 4px 10px !important;
  }

  :host(.text-context-popover__reset) button {
    width: 100% !important;
    min-height: 32px !important;
    padding: 0 10px !important;
  }

  input {
    background: var(--wired-input-bg, var(--wired-control-bg, #f4f1ea)) !important;
    border-radius: 8px !important;
    box-sizing: border-box !important;
    color: inherit !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 34px !important;
    padding: 0 10px !important;
  }

  #container,
  #textPanel {
    background: transparent !important;
    border-radius: 8px !important;
    min-height: 34px !important;
  }

  #textPanel {
    background: transparent !important;
    border-radius: 8px !important;
    box-sizing: border-box !important;
    color: inherit !important;
    display: flex !important;
    align-items: center !important;
    min-height: 42px !important;
    overflow: hidden !important;
    padding: 0 8px !important;
  }

  #textPanel span {
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  #dropPanel {
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
    min-height: 42px !important;
  }

  :host(.toolbar-zoom__slider) {
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
  }

  :host(.toolbar-zoom__slider) #container,
  :host(.toolbar-zoom__slider) svg {
    background: transparent !important;
    box-shadow: none !important;
  }

  #card {
    overflow-x: hidden !important;
    overflow-y: auto !important;
    max-height: 280px !important;
    padding: 4px !important;
    background: var(--wired-combo-popup-bg, #fbf7ee) !important;
    border: 1px solid var(--wired-combo-popup-border, rgba(143, 136, 124, 0.58)) !important;
    border-radius: 8px !important;
    box-shadow: var(--wired-combo-popup-shadow, 0 18px 38px -24px rgba(48, 52, 53, 0.34)) !important;
    z-index: 10000 !important;
  }

  wired-item {
    margin: 2px 0 !important;
    padding: 7px 9px !important;
    color: inherit !important;
    font-weight: 850 !important;
    background: var(--wired-item-bg, #fbf8f0) !important;
    border-radius: 7px !important;
  }

  wired-item.wired-select-heading {
    color: var(--text-muted, #7c786e) !important;
    font-size: 12px !important;
    font-weight: 900 !important;
    letter-spacing: 0.04em !important;
    pointer-events: none !important;
    text-transform: uppercase !important;
    background: transparent !important;
  }

  wired-item:hover,
  wired-item:focus,
  wired-item[selected],
  wired-item[aria-selected="true"] {
    background: var(--wired-item-hover-bg, #ece8dc) !important;
  }
`;

type WiredElementProps = {
  ariaExpanded?: boolean;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  style?: CSSProperties;
  title?: string;
};

type WiredButtonElement = HTMLElement & {
  disabled: boolean;
  elevation: number;
};

type WiredInputElement = HTMLElement & {
  disabled: boolean;
  max?: string;
  min?: string;
  placeholder: string;
  step?: string;
  type: string;
  value: string;
};

type WiredCheckboxElement = HTMLElement & {
  checked: boolean;
  disabled: boolean;
};

type WiredComboElement = HTMLElement & {
  disabled: boolean;
  lastSelectedItem?: HTMLElement & { selected?: boolean };
  selected?: string;
  value?: { text: string; value: string };
};

type WiredSliderElement = HTMLElement & {
  disabled: boolean;
  max: number;
  min: number;
  step: number;
  value: number;
};

type WiredSelectedEvent = Event & {
  detail?: {
    selected?: string;
  };
};

export type WiredSelectOption = {
  disabled?: boolean;
  group?: string;
  label: string;
  meta?: string;
  value: string;
};

type WiredSelectPopupPlacement = "bottom" | "top";

export function WiredButton({
  ariaLabel,
  ariaExpanded,
  children,
  className,
  disabled = false,
  elevation = 1,
  onClick,
  style,
  title,
}: WiredElementProps & {
  children?: ReactNode;
  elevation?: number;
  onClick?: MouseEventHandler<HTMLElement>;
}) {
  const ref = useRef<WiredButtonElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    ref.current.disabled = disabled;
    ref.current.elevation = elevation;
    applyWiredShadowStyle(ref.current);
  }, [disabled, elevation]);

  return createElement(
    "wired-button",
    {
      "aria-label": ariaLabel,
      "aria-expanded": ariaExpanded,
      className,
      onClick,
      ref,
      style,
      title,
    },
    children,
  );
}

export function WiredInput({
  ariaLabel,
  className,
  disabled = false,
  max,
  min,
  onValueChange,
  placeholder = "",
  step,
  style,
  title,
  type = "text",
  value,
}: WiredElementProps & {
  max?: string;
  min?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  step?: string;
  type?: string;
  value: string | number;
}) {
  const ref = useRef<WiredInputElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    ref.current.disabled = disabled;
    ref.current.max = max;
    ref.current.min = min;
    ref.current.placeholder = placeholder;
    ref.current.step = step;
    ref.current.type = type;
    ref.current.value = String(value);
    applyWiredShadowStyle(ref.current);
  }, [disabled, max, min, placeholder, step, type, value]);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const handleValueChange = () => onValueChange(element.value);

    const handleDeferredValueChange = () => window.setTimeout(handleValueChange, 0);

    element.addEventListener("input", handleValueChange);
    element.addEventListener("change", handleValueChange);
    element.addEventListener("click", handleDeferredValueChange);

    return () => {
      element.removeEventListener("input", handleValueChange);
      element.removeEventListener("change", handleValueChange);
      element.removeEventListener("click", handleDeferredValueChange);
    };
  }, [onValueChange]);

  return createElement("wired-input", {
    "aria-label": ariaLabel,
    className,
    ref,
    style,
    title,
  });
}

export function WiredSlider({
  ariaLabel,
  className,
  disabled = false,
  max = 100,
  min = 0,
  onValueChange,
  step = 1,
  style,
  title,
  value,
}: WiredElementProps & {
  max?: number;
  min?: number;
  onValueChange: (value: number) => void;
  step?: number;
  value: number;
}) {
  const ref = useRef<WiredSliderElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    ref.current.disabled = disabled;
    ref.current.max = max;
    ref.current.min = min;
    ref.current.step = step;
    ref.current.value = value;
    applyWiredShadowStyle(ref.current);
  }, [disabled, max, min, step, value]);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const handleValueChange = () => onValueChange(element.value);

    element.addEventListener("change", handleValueChange);

    return () => {
      element.removeEventListener("change", handleValueChange);
    };
  }, [onValueChange]);

  return createElement("wired-slider", {
    "aria-label": ariaLabel,
    className,
    ref,
    style,
    title,
  });
}

export function WiredCheckbox({
  checked,
  children,
  className,
  disabled = false,
  onCheckedChange,
  style,
}: WiredElementProps & {
  checked: boolean;
  children?: ReactNode;
  onCheckedChange: (checked: boolean) => void;
}) {
  const ref = useRef<WiredCheckboxElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    ref.current.checked = checked;
    ref.current.disabled = disabled;
    applyWiredShadowStyle(ref.current);
  }, [checked, disabled]);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const handleChange = () => onCheckedChange(element.checked);

    element.addEventListener("change", handleChange);

    return () => {
      element.removeEventListener("change", handleChange);
    };
  }, [onCheckedChange]);

  return createElement(
    "wired-checkbox",
    {
      className,
      ref,
      style,
    },
    children,
  );
}

export function WiredSelect({
  ariaLabel,
  className,
  disabled = false,
  onClick,
  onValueChange,
  options,
  placeholder = "",
  popupPlacement = "bottom",
  style,
  title,
  value,
}: WiredElementProps & {
  onClick?: MouseEventHandler<HTMLElement>;
  onValueChange: (value: string) => void;
  options: WiredSelectOption[];
  placeholder?: string;
  popupPlacement?: WiredSelectPopupPlacement;
  value: string;
}) {
  const ref = useRef<WiredComboElement | null>(null);
  const selectedValue = value || emptySelectValue;
  const renderedOptions = useMemo(
    () => {
      const normalizedOptions =
        options.length > 0 ? options : [{ label: placeholder, value: "" }];

      return normalizedOptions.map((option, index) => ({
        ...option,
        renderLabel: formatOptionLabel(option),
        renderValue: option.value || emptySelectValue,
        key: `${option.group ?? "default"}-${option.value || emptySelectValue}-${index}`,
      }));
    },
    [options, placeholder],
  );
  const optionSignature = renderedOptions.map((option) => option.key).join("|");

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    syncWiredComboItems(element, renderedOptions);
    element.disabled = disabled;
    element.selected = selectedValue;
    element.dataset.popupPlacement = popupPlacement;
    refreshWiredComboSelection(element);
    applyWiredShadowStyle(element);
    syncWiredComboLayout(element);
  }, [disabled, popupPlacement, selectedValue, optionSignature]);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const sync = () => {
      syncWiredComboLayout(element);
      applyWiredShadowStyle(element);
    };
    const syncPopup = () => syncWiredComboPopup(element);
    const animationFrame = window.requestAnimationFrame(sync);
    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(sync) : null;
    const mutationObserver = new MutationObserver(() => syncWiredComboPopup(element));

    resizeObserver?.observe(element);
    mutationObserver.observe(element, { attributeFilter: ["aria-expanded"], attributes: true });
    window.addEventListener("resize", syncPopup);
    window.addEventListener("scroll", syncPopup, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncPopup);
      window.removeEventListener("scroll", syncPopup, true);
    };
  }, [optionSignature]);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const handleSelected = (event: Event) => {
      const selected = (event as WiredSelectedEvent).detail?.selected ?? element.selected ?? "";
      const selectedOption = renderedOptions.find((option) => option.renderValue === selected);

      if (selectedOption?.disabled) {
        element.selected = selectedValue;
        closeWiredCombo(element);
        syncWiredComboSoon(element);
        return;
      }

      onValueChange(selected === emptySelectValue ? "" : selected);
      closeWiredCombo(element);
      syncWiredComboSoon(element);
    };

    element.addEventListener("selected", handleSelected);
    element.addEventListener("click", syncWiredComboSoon);
    element.addEventListener("keydown", syncWiredComboSoon);

    return () => {
      element.removeEventListener("selected", handleSelected);
      element.removeEventListener("click", syncWiredComboSoon);
      element.removeEventListener("keydown", syncWiredComboSoon);
    };
  }, [onValueChange, optionSignature]);

  return createElement(
    "wired-combo",
    {
      "aria-label": ariaLabel,
      className,
      key: optionSignature,
      onClick,
      ref,
      style,
      title,
    },
    renderedOptions.map((option) =>
      createElement(
        "wired-item",
        {
          "aria-disabled": option.disabled ? "true" : undefined,
          className: option.disabled ? "wired-select-heading" : undefined,
          key: option.key,
          value: option.renderValue,
        },
        option.renderLabel,
      ),
    ),
  );
}

function formatOptionLabel(option: WiredSelectOption): string {
  const label = option.group ? `${option.group} / ${option.label}` : option.label;

  return option.meta ? `${label} / ${option.meta}` : label;
}

function syncWiredComboItems(
  element: HTMLElement,
  options: Array<WiredSelectOption & { renderValue: string }>,
): void {
  Array.from(element.querySelectorAll<HTMLElement>("wired-item")).forEach((item, index) => {
    const option = options[index];

    if (!option) {
      return;
    }

    (item as HTMLElement & { value?: string }).value = option.renderValue;
    item.setAttribute("value", option.renderValue);
  });
}

function refreshWiredComboSelection(element: HTMLElement): void {
  syncWiredComboSelection(element);
  window.requestAnimationFrame(() => syncWiredComboSelection(element));
}

function syncWiredComboSelection(element: HTMLElement): void {
  const combo = element as WiredComboElement;
  const slot = element.shadowRoot?.getElementById("slot") as HTMLSlotElement | null;

  if (!slot) {
    return;
  }

  if (combo.lastSelectedItem) {
    combo.lastSelectedItem.selected = false;
    combo.lastSelectedItem.removeAttribute("aria-selected");
  }

  const selectedItem = slot
    .assignedNodes()
    .find((node): node is HTMLElement & { selected?: boolean; value?: string } => {
      if (!(node instanceof HTMLElement) || node.tagName !== "WIRED-ITEM") {
        return false;
      }

      const item = node as HTMLElement & { value?: string };
      const itemValue = item.value || item.getAttribute("value") || "";

      return Boolean(combo.selected && itemValue === combo.selected);
    });

  combo.lastSelectedItem = selectedItem;
  if (selectedItem) {
    selectedItem.selected = true;
    selectedItem.setAttribute("aria-selected", "true");
    combo.value = {
      text: selectedItem.textContent || "",
      value: selectedItem.value || selectedItem.getAttribute("value") || "",
    };
  } else {
    combo.value = undefined;
  }

}

function syncWiredComboLayout(element: HTMLElement): void {
  const root = element.shadowRoot;

  if (!root) {
    return;
  }

  const container = root.getElementById("container") as HTMLElement | null;
  const textPanel = root.getElementById("textPanel") as HTMLElement | null;
  const dropPanel = root.getElementById("dropPanel") as HTMLElement | null;
  const card = root.getElementById("card") as HTMLElement | null;
  const svg = root.querySelector("svg") as SVGSVGElement | null;
  const width = Math.max(Math.round(element.clientWidth), 124);
  const textWidth = Math.max(width - 34, 90);

  syncWiredComboPopup(element);
  element.style.position = "relative";

  if (container) {
    container.style.boxSizing = "border-box";
    container.style.width = `${width}px`;
    container.style.maxWidth = `${width}px`;
  }

  if (textPanel) {
    textPanel.style.boxSizing = "border-box";
    textPanel.style.width = `${textWidth}px`;
    textPanel.style.maxWidth = `${textWidth}px`;
  }

  if (dropPanel) {
    dropPanel.style.boxSizing = "border-box";
    dropPanel.style.width = "34px";
    dropPanel.style.minWidth = "34px";
  }

  if (svg) {
    svg.style.overflow = "visible";
  }

  (element as WiredComboElement & { requestUpdate?: () => void }).requestUpdate?.();
}

function syncWiredComboPopup(element: HTMLElement): void {
  const isOpen = element.getAttribute("aria-expanded") === "true";
  const root = element.shadowRoot;
  const card = root?.getElementById("card") as HTMLElement | null;
  const placement = element.dataset.popupPlacement === "top" ? "top" : "bottom";
  const popupBackground =
    getComputedStyle(element).getPropertyValue("--wired-combo-popup-bg").trim() || "#fbf7ee";
  const width = Math.max(Math.round(element.clientWidth), 124);

  element.toggleAttribute("data-open", isOpen);
  if (isOpen) {
    element.style.setProperty("z-index", "2147483647", "important");
    element.style.setProperty("overflow", "visible", "important");
  } else {
    element.style.removeProperty("z-index");
    element.style.setProperty("overflow", "visible", "important");
  }

  if (!card) {
    return;
  }

  if (!isOpen || element.classList.contains("font-search-select__trigger")) {
    card.style.setProperty("display", "none", "important");
    card.style.setProperty("pointer-events", "none", "important");
    card.style.setProperty("visibility", "hidden", "important");
    return;
  }

  const rect = element.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
  const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
  const popupWidth = Math.min(width, Math.max(viewportWidth - 16, 124));

  card.style.setProperty("display", "block", "important");
  card.style.setProperty("position", "fixed", "important");
  card.style.setProperty("visibility", "visible", "important");
  card.style.setProperty("pointer-events", "auto", "important");
  card.style.setProperty("z-index", "2147483647", "important");
  card.style.boxSizing = "border-box";
  card.style.background = popupBackground;
  card.style.left = `${Math.max(8, Math.min(rect.left, viewportWidth - popupWidth - 8))}px`;
  card.style.width = `${popupWidth}px`;
  card.style.minWidth = `${popupWidth}px`;
  card.style.maxWidth = `${popupWidth}px`;
  card.style.maxHeight = `${Math.max(120, viewportHeight - 16)}px`;
  card.setAttribute("fill", popupBackground);

  const popupHeight = Math.min(card.scrollHeight || card.getBoundingClientRect().height || 280, viewportHeight - 16);
  const belowTop = Math.min(rect.bottom + 6, viewportHeight - popupHeight - 8);
  const aboveTop = Math.max(8, rect.top - popupHeight - 6);

  card.style.setProperty("top", `${placement === "top" ? aboveTop : Math.max(8, belowTop)}px`, "important");
  card.style.setProperty("bottom", "auto", "important");
}

function closeWiredCombo(element: HTMLElement): void {
  const card = element.shadowRoot?.getElementById("card") as HTMLElement | null;

  (element as HTMLElement & { setCardShowing?: (showing: boolean) => void }).setCardShowing?.(false);
  element.setAttribute("aria-expanded", "false");
  element.removeAttribute("data-open");
  element.style.removeProperty("z-index");
  element.style.setProperty("overflow", "visible", "important");
  if (card) {
    card.style.setProperty("display", "none", "important");
    card.style.setProperty("pointer-events", "none", "important");
    card.style.setProperty("visibility", "hidden", "important");
  }
  element.blur();
  syncWiredComboPopup(element);
}

function syncWiredComboSoon(eventOrElement: Event | HTMLElement): void {
  const element =
    eventOrElement instanceof HTMLElement
      ? eventOrElement
      : eventOrElement.currentTarget instanceof HTMLElement
        ? eventOrElement.currentTarget
        : null;

  if (!element) {
    return;
  }

  window.requestAnimationFrame(() => syncWiredComboLayout(element));
  window.setTimeout(() => syncWiredComboLayout(element), 0);
}

function applyWiredShadowStyle(element: HTMLElement) {
  window.requestAnimationFrame(() => {
    const root = element.shadowRoot;

    if (!root || root.getElementById(wiredShadowStyleId)) {
      return;
    }

    const style = document.createElement("style");
    style.id = wiredShadowStyleId;
    style.textContent = wiredShadowStyle;
    root.appendChild(style);
  });
}
