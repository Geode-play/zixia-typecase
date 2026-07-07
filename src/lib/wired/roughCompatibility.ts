import { HachureFiller } from "roughjs/bin/fillers/hachure-filler";
import { ZigZagFiller } from "roughjs/bin/fillers/zigzag-filler";
import type { OpSet, ResolvedOptions } from "roughjs/bin/core";
import type { Point } from "roughjs/bin/geometry";

type FillPolygonPrototype = {
  fillPolygon?: (points: Point[], options: ResolvedOptions) => OpSet;
  fillPolygons?: (polygonList: Point[][], options: ResolvedOptions) => OpSet;
};

installFillPolygonAlias(HachureFiller.prototype);
installFillPolygonAlias(ZigZagFiller.prototype);

function installFillPolygonAlias(prototype: FillPolygonPrototype) {
  if (typeof prototype.fillPolygon === "function" || typeof prototype.fillPolygons !== "function") {
    return;
  }

  prototype.fillPolygon = function fillPolygon(
    this: Required<Pick<FillPolygonPrototype, "fillPolygons">>,
    points,
    options,
  ) {
    return this.fillPolygons([points], options);
  };
}
