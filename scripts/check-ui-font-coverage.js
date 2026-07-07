import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const fontPath = "src/assets/fonts/tekitou-poem.ttf";
const sourceRoot = "src";
const stylesPath = "src/styles.css";

function u16(view, offset) {
  return view.getUint16(offset, false);
}

function u32(view, offset) {
  return view.getUint32(offset, false);
}

function tag(view, offset) {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

function readCmapFormat4(view, offset, glyphs) {
  const segCount = u16(view, offset + 6) / 2;
  const endCodeOffset = offset + 14;
  const startCodeOffset = endCodeOffset + segCount * 2 + 2;
  const idDeltaOffset = startCodeOffset + segCount * 2;
  const idRangeOffsetOffset = idDeltaOffset + segCount * 2;

  for (let index = 0; index < segCount; index += 1) {
    const start = u16(view, startCodeOffset + index * 2);
    const end = u16(view, endCodeOffset + index * 2);
    const delta = u16(view, idDeltaOffset + index * 2);
    const rangeOffset = u16(view, idRangeOffsetOffset + index * 2);

    for (let codePoint = start; codePoint <= end && codePoint !== 0xffff; codePoint += 1) {
      if (rangeOffset === 0) {
        if (((codePoint + delta) & 0xffff) !== 0) {
          glyphs.add(codePoint);
        }
        continue;
      }

      const glyphOffset =
        idRangeOffsetOffset + index * 2 + rangeOffset + (codePoint - start) * 2;
      if (glyphOffset + 1 < view.byteLength && u16(view, glyphOffset) !== 0) {
        glyphs.add(codePoint);
      }
    }
  }
}

function readCmapFormat12(view, offset, glyphs) {
  const groupCount = u32(view, offset + 12);
  let groupOffset = offset + 16;

  for (let index = 0; index < groupCount; index += 1) {
    const start = u32(view, groupOffset);
    const end = u32(view, groupOffset + 4);
    const startGlyph = u32(view, groupOffset + 8);

    if (startGlyph !== 0) {
      for (let codePoint = start; codePoint <= end; codePoint += 1) {
        glyphs.add(codePoint);
      }
    }

    groupOffset += 12;
  }
}

function readFontGlyphs(filePath) {
  const buffer = readFileSync(filePath);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const tableCount = u16(view, 4);
  let cmapOffset = -1;

  for (let index = 0; index < tableCount; index += 1) {
    const recordOffset = 12 + index * 16;
    if (tag(view, recordOffset) === "cmap") {
      cmapOffset = u32(view, recordOffset + 8);
      break;
    }
  }

  if (cmapOffset < 0) {
    throw new Error("Missing cmap table.");
  }

  const subtableCount = u16(view, cmapOffset + 2);
  const glyphs = new Set();

  for (let index = 0; index < subtableCount; index += 1) {
    const recordOffset = cmapOffset + 4 + index * 8;
    const subtableOffset = cmapOffset + u32(view, recordOffset + 4);
    const format = u16(view, subtableOffset);

    if (format === 4) {
      readCmapFormat4(view, subtableOffset, glyphs);
    }

    if (format === 12) {
      readCmapFormat12(view, subtableOffset, glyphs);
    }
  }

  return glyphs;
}

const glyphs = readFontGlyphs(fontPath);
const sourceText = readSourceFiles(sourceRoot)
  .map((filePath) => readFileSync(filePath, "utf8"))
  .join("\n");
const uiChars = [...new Set(sourceText.match(/[\u3400-\u9fff\uf900-\ufaff]/gu) ?? [])].sort();
const missing = uiChars.filter((char) => !glyphs.has(char.codePointAt(0)));

const styles = readFileSync(stylesPath, "utf8");
const rootFontFamily = styles.match(/:root\s*\{[\s\S]*?font-family\s*:\s*([^;]+);/)?.[1].trim();

if (rootFontFamily !== "\"TekitouPoem UI\"") {
  console.error(`Expected :root font-family to be "TekitouPoem UI", got ${rootFontFamily ?? "missing"}.`);
  process.exitCode = 1;
}

if (missing.length > 0) {
  console.error("Missing UI glyphs in TekitouPoem UI:");
  missing.forEach((char) => {
    console.error(`- ${char} U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`);
  });
  process.exitCode = 1;
}

if (!process.exitCode) {
  console.log(`TekitouPoem UI covers ${uiChars.length} unique Chinese source characters.`);
}

function readSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return readSourceFiles(filePath);
    }

    return /\.(css|ts|tsx)$/.test(entry.name) ? [filePath] : [];
  });
}
