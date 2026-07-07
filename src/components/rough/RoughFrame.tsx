import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import rough from "roughjs/bin/rough";

type RoughFrameProps = {
  ariaLabel?: string;
  as?: ElementType;
  children: ReactNode;
  className?: string;
  radius?: number;
  roughness?: number;
  strokeColor?: string;
  strokeWidth?: number;
  style?: CSSProperties;
};

export function RoughFrame({
  ariaLabel,
  as: Component = "div",
  children,
  className = "",
  radius = 12,
  roughness = 0.8,
  strokeColor = "var(--line-strong)",
  strokeWidth = 1.35,
  style,
}: RoughFrameProps) {
  const frameRef = useRef<HTMLElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const seedRef = useRef(rough.newSeed());

  useEffect(() => {
    const frame = frameRef.current;
    const svg = svgRef.current;

    if (!frame || !svg) {
      return;
    }

    const drawFrame = () => {
      const width = Math.max(Math.round(frame.clientWidth), 1);
      const height = Math.max(Math.round(frame.clientHeight), 1);
      const inset = Math.ceil(strokeWidth + 1);
      const pathRadius = Math.max(0, Math.min(radius, (width - inset * 2) / 2, (height - inset * 2) / 2));
      const stroke = resolveStrokeColor(frame, strokeColor);

      svg.replaceChildren();
      svg.setAttribute("width", `${width}`);
      svg.setAttribute("height", `${height}`);
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

      const right = width - inset;
      const bottom = height - inset;
      const left = inset;
      const top = inset;
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

      const roughSvg = rough.svg(svg);
      svg.appendChild(
        roughSvg.path(d, {
          bowing: 0.6,
          fill: "transparent",
          roughness,
          seed: seedRef.current,
          stroke,
          strokeWidth,
        }),
      );
    };

    drawFrame();

    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(drawFrame) : null;
    resizeObserver?.observe(frame);

    return () => {
      resizeObserver?.disconnect();
    };
  }, [radius, roughness, strokeColor, strokeWidth]);

  return (
    <Component
      aria-label={ariaLabel}
      className={["rough-frame", className].filter(Boolean).join(" ")}
      ref={frameRef}
      style={style}
    >
      <svg aria-hidden="true" className="rough-frame__svg" focusable="false" ref={svgRef} />
      <div className="rough-frame__content">{children}</div>
    </Component>
  );
}

function resolveStrokeColor(element: HTMLElement, color: string): string {
  const cssVariable = color.match(/^var\((--[^)]+)\)$/)?.[1];

  if (!cssVariable) {
    return color;
  }

  return getComputedStyle(element).getPropertyValue(cssVariable).trim() || color;
}
