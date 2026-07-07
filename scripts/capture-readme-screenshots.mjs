import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const appUrl = process.env.README_SCREENSHOT_URL ?? "http://127.0.0.1:5173/";
const fixturePath = path.join(rootDir, "docs/fixtures/readme-sample.svg");
const imagesDir = path.join(rootDir, "docs/images");

const screenshotTargets = {
  desktop: path.join(imagesDir, "readme-desktop.png"),
  localEditing: path.join(imagesDir, "readme-local-editing.png"),
  exportPanel: path.join(imagesDir, "readme-export.png"),
};

let serverProcess;
let chromeProcess;
let userDataDir;

async function main() {
try {
  await ensureAppServer();
  await mkdir(imagesDir, { recursive: true });

  const chrome = await launchChrome();
  chromeProcess = chrome.process;
  userDataDir = chrome.userDataDir;

  const pageTarget = await createPage(chrome.port);
  const client = await CdpClient.connect(pageTarget.webSocketDebuggerUrl);

  await client.send("Page.enable");
  await client.send("DOM.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const loaded = client.waitFor("Page.loadEventFired", () => true, 15000);
  await client.send("Page.navigate", { url: appUrl });
  await loaded;
  await waitForExpression(client, "document.querySelector('input[accept=\".svg,image/svg+xml\"]') !== null");

  await uploadSvg(client);
  await waitForExpression(
    client,
    "document.querySelectorAll('[data-svg-font-switcher-text-id]').length >= 1",
  );

  await capturePng(client, screenshotTargets.desktop);

  await clickTextNode(client);
  await waitForExpression(client, "document.querySelector('.text-context-popover') !== null");
  await capturePng(client, screenshotTargets.localEditing);

  await closeTextPopover(client);
  await waitForExpression(client, "document.querySelector('.text-context-popover') === null");

  await clickExportButton(client);
  await waitForExpression(client, "document.querySelector('.export-popover') !== null");
  await capturePng(client, screenshotTargets.exportPanel);

  await client.close();

  console.log("Captured README screenshots:");
  Object.values(screenshotTargets).forEach((target) => console.log(`- ${path.relative(rootDir, target)}`));
} finally {
  if (chromeProcess) {
    await stopProcess(chromeProcess);
  }

  if (serverProcess) {
    await stopProcess(serverProcess);
  }

  if (userDataDir) {
    await rm(userDataDir, { recursive: true, force: true });
  }
}
}

async function stopProcess(child) {
  if (child.exitCode !== null || child.killed) {
    return;
  }

  await new Promise((resolve) => {
    child.once("exit", resolve);
    child.kill("SIGTERM");
    setTimeout(resolve, 1500);
  });
}

async function ensureAppServer() {
  if (await canFetch(appUrl)) {
    return;
  }

  serverProcess = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1"], {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for Vite dev server.")), 20000);

    const handleOutput = async (chunk) => {
      process.stdout.write(chunk);
      if (await canFetch(appUrl)) {
        clearTimeout(timeout);
        resolve();
      }
    };

    serverProcess.stdout.on("data", handleOutput);
    serverProcess.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });
    serverProcess.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Vite dev server exited early with code ${code}.`));
    });
  });
}

async function canFetch(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function launchChrome() {
  const profileDir = await mkdtemp(path.join(tmpdir(), "zixia-readme-chrome-"));
  const child = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-address=127.0.0.1",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDir}`,
      "about:blank",
    ],
    {
      stdio: ["ignore", "ignore", "pipe"],
    },
  );

  const endpoint = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for Chrome DevTools endpoint.")), 20000);

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      const match = text.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:(\d+)\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve({ browserWsUrl: match[1], port: Number(match[2]) });
      }
    });

    child.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Chrome exited early with code ${code}.`));
    });
  });

  return { ...endpoint, process: child, userDataDir: profileDir };
}

async function createPage(port) {
  const endpoint = `http://127.0.0.1:${port}/json/new?about:blank`;
  const response = await fetch(endpoint, { method: "PUT" });

  if (!response.ok) {
    throw new Error(`Could not create Chrome page: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function uploadSvg(client) {
  const svg = await readFile(fixturePath, "utf8");
  await evaluate(
    client,
    `(() => {
      const input = document.querySelector('input[accept=".svg,image/svg+xml"]');

      if (!input) {
        throw new Error('Could not find SVG file input.');
      }

      const file = new File([${JSON.stringify(svg)}], 'readme-sample.svg', { type: 'image/svg+xml' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      Object.defineProperty(input, 'files', { value: transfer.files, configurable: true });
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return input.files.length;
    })()`,
  );
}

async function clickTextNode(client) {
  const point = await evaluate(client, `(() => {
    const textNodes = Array.from(document.querySelectorAll('[data-svg-font-switcher-text-id]'));
    const target = textNodes.find((node) => node.textContent.includes('快速切换字体')) || textNodes[0];

    if (!target) {
      return null;
    }

    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);

  if (!point) {
    throw new Error("Could not find a preview text node to click.");
  }

  await clickPoint(client, point);
}

async function clickExportButton(client) {
  const point = await evaluate(client, `(() => {
    const target = document.querySelector('.toolbar-export-button');

    if (!target) {
      return null;
    }

    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);

  if (!point) {
    throw new Error("Could not find export button.");
  }

  await clickPoint(client, point);
}

async function closeTextPopover(client) {
  const point = await evaluate(client, `(() => {
    const target = document.querySelector('.text-context-popover__header wired-button');

    if (!target) {
      return null;
    }

    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);

  if (!point) {
    throw new Error("Could not find text popover close button.");
  }

  await clickPoint(client, point);
}

async function clickPoint(client, point) {
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    button: "left",
    clickCount: 1,
    x: point.x,
    y: point.y,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    button: "left",
    clickCount: 1,
    x: point.x,
    y: point.y,
  });
}

async function capturePng(client, targetPath) {
  const { data } = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });

  await writeFile(targetPath, Buffer.from(data, "base64"));
}

async function waitForExpression(client, expression, timeoutMs = 10000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (await evaluate(client, expression)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const diagnostic = await evaluate(
    client,
    `(() => ({
      bodyText: document.body.innerText.slice(0, 2000),
      svgCount: document.querySelectorAll('svg').length,
      editableTextCount: document.querySelectorAll('[data-svg-font-switcher-text-id]').length,
      fileInputs: Array.from(document.querySelectorAll('input[type="file"]')).map((input) => ({
        accept: input.getAttribute('accept'),
        files: Array.from(input.files || []).map((file) => file.name),
      })),
    }))()`,
  );

  throw new Error(`Timed out waiting for expression: ${expression}\n${JSON.stringify(diagnostic, null, 2)}`);
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  if (result.exceptionDetails) {
    const description =
      result.exceptionDetails.exception?.description ??
      result.exceptionDetails.exception?.value ??
      result.exceptionDetails.text ??
      "Runtime evaluation failed.";

    throw new Error(description);
  }

  return result.result.value;
}

class CdpClient {
  static async connect(wsUrl) {
    const socket = new WebSocket(wsUrl);
    const client = new CdpClient(socket);

    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });

    return client;
  }

  constructor(socket) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = socket;

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);

        if (message.error) {
          reject(new Error(message.error.message));
        } else {
          resolve(message.result ?? {});
        }

        return;
      }

      const listeners = this.listeners.get(message.method);
      if (listeners) {
        listeners.forEach((listener) => listener(message.params ?? {}));
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;

    this.socket.send(JSON.stringify({ id, method, params }));

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  waitFor(method, predicate, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for ${method}.`));
      }, timeoutMs);

      const listener = (params) => {
        if (!predicate(params)) {
          return;
        }

        cleanup();
        resolve(params);
      };

      const cleanup = () => {
        clearTimeout(timeout);
        const listeners = this.listeners.get(method) ?? [];
        this.listeners.set(
          method,
          listeners.filter((item) => item !== listener),
        );
      };

      const listeners = this.listeners.get(method) ?? [];
      listeners.push(listener);
      this.listeners.set(method, listeners);
    });
  }

  close() {
    this.socket.close();
  }
}

await main();
