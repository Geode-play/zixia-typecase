<div align="center">
  <img src="./src/assets/brand/logo.png" alt="字匣 / ZIXIA TYPECASE logo" width="120" />
  <br />
  <img src="./docs/images/readme-title.svg" alt="字匣 / ZIXIA TYPECASE" width="310" />
  <p>字匣可以导入包含可编辑文字的 SVG，快速切换字体、微调文字，并导出高清 PNG 或可继续编辑的 SVG。</p>
</div>

<p align="center">
  <img src="./docs/images/readme-app-overview.png" alt="字匣软件界面截图" width="960" />
</p>

## 它能做什么

- 导入一张或多张 SVG。
- 为中文/CJK 与英文/Latin 分别设置字体。
- 读取系统字体，或上传 TTF、OTF、WOFF、WOFF2 字体文件。
- 点击文字节点后微调内容、字体和字号。
- 调整画布尺寸、背景和导出倍率。
- 导出当前图卡，或批量导出全部图卡。

## 使用方式

### 在线使用

字匣是一个静态网页工具，可以通过 GitHub Pages 在线打开，无需安装。SVG 和字体文件会优先在浏览器本地处理，不需要上传到服务器。

首次发布前，需要在 GitHub 仓库的 `Settings → Pages` 中把 `Source` 选择为 `GitHub Actions`。启用后，GitHub 会显示在线访问地址。

### 下载桌面版

在 GitHub Releases 中选择最新版本，下载对应平台的安装包。如果 Releases 暂时没有安装包，也可以直接使用在线版。

| 平台 | 文件 |
| --- | --- |
| macOS | 名称以 `-mac.dmg` 结尾的文件 |
| Windows 安装版 | 名称以 `-win.exe` 结尾的文件 |
| Windows 绿色版 | 名称以 `-win-portable.zip` 结尾的文件 |

目前桌面安装包可能尚未签名或公证，因此系统可能会出现安全提醒：

- macOS 提示“无法验证开发者”时，可以在 Finder 中右键 App，选择“打开”；也可以到“系统设置 → 隐私与安全性”中选择“仍要打开”。
- Windows 出现 Microsoft Defender SmartScreen 提醒时，可以选择“更多信息 → 仍要运行”。如果系统或安全软件拦截，请确认安装包来自本项目的 GitHub Releases。

这些提示通常只需要手动允许一次，不需要重启电脑。

### 本地开发运行

```bash
npm install
npm run dev
```

常用命令：

```bash
npm run build
npm run preview
npm run check:ui-font
npm run desktop:dmg
npm run desktop:win
```

## 补充说明

- 本项目是 Vite + React 项目，生产构建输出目录是 `dist`。
- `vite.config.ts` 已使用相对资源路径，适合部署到 GitHub Pages 的项目子路径。
- 桌面版使用 Electron 打包，桌面构建工作流会在推送 `v*` 格式的 tag 时构建 macOS 和 Windows 安装包，并发布到 GitHub Releases。
- 系统字体读取功能依赖 Local Font Access API，目前主要由 Chromium 系浏览器支持；如果浏览器不支持该 API，仍然可以通过上传本地字体文件使用。
- 系统字体只保存字体 family 名称，不会默认把字体文件嵌入导出的 SVG。使用系统字体导出的 PNG 会按本机渲染结果生成；导出的 SVG 在其他电脑上打开时，如果对方没有同名字体，显示效果可能不同。
- 为了让文字节点可以被选中和编辑，应用会把上传的 SVG 以内联方式渲染到页面中。当前 sanitizer 会移除 `<script>` 标签、`onclick` 这类内联事件属性，以及 `href="javascript:..."`。

## 反馈与支持

如果遇到 SVG 解析、字体显示、导出尺寸或桌面安装包相关问题，欢迎在 GitHub Issues 里反馈。提交问题时建议附上：

- 使用的平台与浏览器/应用版本；
- 能复现问题的 SVG 文件或截图；
- 期望结果与实际结果。

<p align="center">
  <img src="./docs/images/readme-buy-me-a-coffee.svg" alt="Buy me a coffee" width="84" />
</p>

<p align="center">如果这个工具帮到了你，可以用一杯咖啡支持它继续打磨。</p>

## 素材与授权

Logo 是为这个项目生成的 AI 图片。

当前仓库内置的 UI 字体为：

- `src/assets/fonts/tekitou-poem.ttf`：`TekitouPoem / 適当ポエム`，版权方为 `Cockatrice Digital`。

根据该字体官方 BOOTH 页面说明，`TekitouPoem / 適当ポエム` 以 SIL Open Font License 1.1 发布，可商用，使用时不需要署名。由于本仓库会再分发字体文件本身，已在 [src/assets/fonts/OFL-1.1.txt](./src/assets/fonts/OFL-1.1.txt) 附上 OFL 1.1 许可证文本。若修改或再分发字体文件，需要继续遵守 OFL 条件。

## 许可证

项目代码使用 MIT License，版权署名为 `GEODE`。详见 [LICENSE](./LICENSE)。

字体文件使用 SIL Open Font License 1.1，详见 [src/assets/fonts/OFL-1.1.txt](./src/assets/fonts/OFL-1.1.txt)。
