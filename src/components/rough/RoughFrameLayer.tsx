import { useEffect } from "react";
import rough from "roughjs/bin/rough";

const framedSelectors = [
  ".workspace",
  ".toolbar-popover",
  ".canvas-select__menu",
  ".svg-frame",
  ".text-context-popover",
  ".focus-rail",
].join(",");

const dividerSelectors = [".brand", ".control-group:not(:last-of-type)", ".export-popover .control-group"].join(",");

type FrameRecord = {
  resizeObserver?: ResizeObserver;
  svg: SVGSVGElement;
};

const svgNamespace = "http://www.w3.org/2000/svg";

export function RoughFrameLayer() {
  useEffect(() => {
    const framedElements = new WeakMap<HTMLElement, FrameRecord>();
    const dividerElements = new WeakMap<HTMLElement, FrameRecord>();

    const frameElement = (element: HTMLElement) => {
      if (framedElements.has(element)) {
        return;
      }

      element.classList.add("rough-auto-frame");
      const svg = document.createElementNS(svgNamespace, "svg");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      svg.classList.add("rough-auto-frame__svg");
      element.prepend(svg);

      const draw = () => drawRoundedFrame(element, svg);
      draw();

      const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(draw) : undefined;
      resizeObserver?.observe(element);
      framedElements.set(element, { resizeObserver, svg });
    };

    const divideElement = (element: HTMLElement) => {
      if (dividerElements.has(element)) {
        return;
      }

      element.classList.add("rough-auto-divider");
      const svg = document.createElementNS(svgNamespace, "svg");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      svg.classList.add("rough-auto-divider__svg");
      element.prepend(svg);

      const draw = () => drawDivider(element, svg);
      draw();

      const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(draw) : undefined;
      resizeObserver?.observe(element);
      dividerElements.set(element, { resizeObserver, svg });
    };

    const scan = () => {
      document.querySelectorAll<HTMLElement>(framedSelectors).forEach(frameElement);
      document.querySelectorAll<HTMLElement>(dividerSelectors).forEach(divideElement);
    };

    scan();
    const mutationObserver = new MutationObserver(scan);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      mutationObserver.disconnect();
      document.querySelectorAll<HTMLElement>(".rough-auto-frame").forEach((element) => {
        const record = framedElements.get(element);

        record?.resizeObserver?.disconnect();
        record?.svg.remove();
        element.classList.remove("rough-auto-frame");
      });
      document.querySelectorAll<HTMLElement>(".rough-auto-divider").forEach((element) => {
        const record = dividerElements.get(element);

        record?.resizeObserver?.disconnect();
        record?.svg.remove();
        element.classList.remove("rough-auto-divider");
      });
    };
  }, []);

  return null;
}

function drawRoundedFrame(element: HTMLElement, svg: SVGSVGElement) {
  const width = Math.max(Math.round(element.clientWidth), 1);
  const height = Math.max(Math.round(element.clientHeight), 1);
  const styles = getComputedStyle(element);
  const stroke = styles.getPropertyValue("--rough-frame-color").trim() ||
    styles.getPropertyValue("--line-strong").trim() ||
    "#d5d3cf";
  const strokeWidth = Number.parseFloat(styles.getPropertyValue("--rough-frame-width")) || 1.35;
  const radius = Number.parseFloat(styles.getPropertyValue("--rough-frame-radius")) ||
    Number.parseFloat(styles.borderTopLeftRadius) ||
    8;
  const inset = Math.ceil(strokeWidth + 1);
  const pathRadius = Math.max(0, Math.min(radius, (width - inset * 2) / 2, (height - inset * 2) / 2));
  const left = inset;
  const top = inset;
  const right = width - inset;
  const bottom = height - inset;

  svg.replaceChildren();
  svg.setAttribute("width", `${width}`);
  svg.setAttribute("height", `${height}`);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const d = [
    `M ${left + pathRadius} ${top}`,
    `L ${right - pathRadius} ${top}`,
    `Q ${right} ${top} ${right} ${top + pathRadius}`,
    `L ${right} ${bottom - pathRadius}`,
    `Q ${right} ${bottom} ${right - pathRadius} ${bottom}`,
    `L ${left + pathRadius} ${bottom}`,
    `Q ${left} ${bottom} ${left} ${bottom - pathRadius}`,
    `L ${left} ${top + pathRadius}`,
    `Q ${left} ${top} ${left + pathRadius} ${top}`,
    "Z",
  ].join(" ");

  svg.appendChild(
    rough.svg(svg).path(d, {
      bowing: 0.6,
      fill: "transparent",
      roughness: 0.8,
      stroke,
      strokeWidth,
    }),
  );
}

function drawDivider(element: HTMLElement, svg: SVGSVGElement) {
  const width = Math.max(Math.round(element.clientWidth), 1);
  const height = Math.max(Math.round(element.clientHeight), 1);
  const styles = getComputedStyle(element);
  const stroke = styles.getPropertyValue("--rough-divider-color").trim() ||
    styles.getPropertyValue("--line-strong").trim() ||
    "#9f978b";
  const strokeWidth = Number.parseFloat(styles.getPropertyValue("--rough-divider-width")) || 0.85;
  const y = Math.max(height - 2, 1);
  const grid = rough.svg(svg);

  svg.replaceChildren();
  svg.setAttribute("width", `${width}`);
  svg.setAttribute("height", `${height}`);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.appendChild(
    grid.line(1, y, width - 2, y + Math.sin(width * 0.03) * 0.9, {
      bowing: 0.45,
      roughness: 1.7,
      stroke,
      strokeWidth,
    }),
  );
}
