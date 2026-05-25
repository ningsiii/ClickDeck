# ClickDeck

English | [中文](#clickdeck-中文)

ClickDeck is an open-source Chrome/Edge extension for visually fine-tuning the current HTML page. It lets you select elements directly in the browser, adjust visual details, edit text in place, undo changes, and export the result as HTML or PDF.

## Status

ClickDeck is an alpha project. The extension is usable for local testing and GitHub feedback, but it is not ready for Chrome Web Store submission yet.

## Features

- Select elements on the current page with a visual outline.
- Adjust font size, weight, line spacing, alignment, and color.
- Edit text directly in place.
- Undo and redo style/text changes.
- Export an edited HTML snapshot.
- Trigger PDF export in long-page, A4, and 16:9 modes.
- Copy recent diagnostics logs for issue reports.
- Show a Chinese UI automatically when the browser language is Chinese.

## Non-Goals

- No AI content generation.
- No source-code write-back.
- No free-form design canvas.
- No editable PPT export in the MVP.

## Local Development

```bash
npm install
npm run build
npm run typecheck
npm test
npm run e2e
```

Load the built `dist/` directory in Chrome or Edge via the extensions page with Developer mode enabled.

## Privacy

ClickDeck runs locally in the browser. It does not upload page content or diagnostics by default. The diagnostics button copies recent local logs to your clipboard so you can choose what to share in an issue.

## Known Limitations

- PDF export uses the browser print flow, so the user still confirms the final save location.
- Complex websites may have CSS or script behavior that affects editing/export quality.
- HTML snapshot export keeps external resource URLs instead of bundling every asset.
- The panel is draggable and scrollable, but not resizable.

## License

MIT

---

# ClickDeck 中文

ClickDeck 是一个开源 Chrome/Edge 插件，用于在当前 HTML 页面上做可视化微调。你可以直接在浏览器里选择元素、调整视觉细节、就地编辑文字、撤销修改，并导出 HTML 或 PDF。

## 当前状态

ClickDeck 目前是 alpha 项目。它已经适合本地测试和 GitHub 反馈，但还不建议直接提交 Chrome Web Store。

## 功能

- 在当前页面上选择元素，并显示可视化描边。
- 调整字号、字重、行距、对齐和颜色。
- 直接编辑页面文字。
- 撤销和重做样式/文字修改。
- 导出修改后的 HTML 快照。
- 触发长页面、A4、16:9 三种 PDF 打印导出。
- 复制最近诊断日志，方便提交 issue。
- 浏览器语言为中文时自动显示中文界面。

## 不做什么

- 不做 AI 内容生成。
- 不回写源码。
- 不做自由画布设计工具。
- MVP 不导出可编辑 PPT。

## 本地开发

```bash
npm install
npm run build
npm run typecheck
npm test
npm run e2e
```

构建后，在 Chrome 或 Edge 的扩展管理页面开启开发者模式，并加载 `dist/` 目录。

## 隐私

ClickDeck 在浏览器本地运行。默认不会上传页面内容或诊断信息。诊断按钮只会把最近本地日志复制到剪贴板，由你决定是否粘贴到 issue。

## 已知限制

- PDF 导出走浏览器打印流程，最终保存位置仍需要用户确认。
- 复杂网站的 CSS 或脚本可能影响编辑和导出质量。
- HTML 快照会保留外部资源 URL，不会把所有资源内联打包。
- 面板可以拖动和滚动，但暂不支持自由拉伸。

## License

MIT
