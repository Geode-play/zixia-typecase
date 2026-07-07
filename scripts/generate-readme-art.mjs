import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(rootDir, 'docs/images');
const fontFace = `
  @font-face {
    font-family: "TekitouPoemReadme";
    src: url("../../src/assets/fonts/tekitou-poem.ttf") format("truetype");
  }
`;

const titleSvg = `<svg width="620" height="150" viewBox="0 0 620 150" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">字匣 / ZIXIA TYPECASE</title>
  <desc id="desc">字匣项目名称，中英文居中显示。</desc>
  <style>
${fontFace}
    text {
      font-family: "TekitouPoemReadme", "Comic Sans MS", sans-serif;
      text-anchor: middle;
      dominant-baseline: middle;
      letter-spacing: 0;
    }
  </style>
  <text x="310" y="58" fill="#2f302b" font-size="64">字匣</text>
  <text x="310" y="113" fill="#5f6258" font-size="30">ZIXIA · TYPECASE</text>
</svg>
`;

const supportSvg = `<svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="supportTitle supportDesc">
  <title id="supportTitle">Buy me a coffee</title>
  <desc id="supportDesc">A small hand-drawn coffee cup icon for the support link.</desc>
  <path d="M23 31C35 28 55 28 67 31C67 44 64 63 59 70C54 77 37 77 32 70C27 62 24 45 23 31Z" fill="#fffaf0" stroke="#34342f" stroke-width="3.2" stroke-linejoin="round" />
  <path d="M67 40C78 38 83 45 80 54C78 62 71 65 64 62" stroke="#34342f" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M27 32C36 36 56 36 66 32" stroke="#c8b89d" stroke-width="3.2" stroke-linecap="round" />
  <path d="M35 24C39 18 31 16 35 10M48 24C52 18 44 16 48 10M61 24C65 18 57 16 61 10" stroke="#8d9f78" stroke-width="3" stroke-linecap="round" />
  <path d="M31 78C40 82 58 82 66 78" stroke="#c8b89d" stroke-width="3" stroke-linecap="round" />
  <path d="M45 49C49 42 60 44 61 53C69 51 74 59 69 65C65 70 55 75 52 79C48 75 38 70 34 65C29 59 34 51 42 53C42 51 43 50 45 49Z" fill="#e9c3cb" stroke="#34342f" stroke-width="2.8" stroke-linejoin="round" />
</svg>
`;

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'readme-title.svg'), titleSvg);
await writeFile(path.join(outDir, 'readme-buy-me-a-coffee.svg'), supportSvg);
