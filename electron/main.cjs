const { app, BrowserWindow, shell, session } = require("electron");
const path = require("node:path");

const appName = "字匣";
const appIconPath = path.join(__dirname, "../build/icons/icon.png");

function isAppPage(webContents) {
  const url = webContents?.getURL?.() ?? "";

  return url.startsWith("file://");
}

function configureSessionPermissions() {
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return permission === "local-fonts" && isAppPage(webContents);
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === "local-fonts" && isAppPage(webContents));
  });
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 680,
    title: appName,
    backgroundColor: "#f8f5ee",
    icon: appIconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.removeMenu();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
}

app.whenReady().then(() => {
  configureSessionPermissions();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
