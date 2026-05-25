# ClickDeck

English | [中文](#clickdeck-中文)

ClickDeck is an open-source Chrome/Edge extension for visual HTML page editing. It helps you fine-tune AI-generated pages, HTML presentations, project briefs, and other browser-rendered documents directly in the browser without opening DevTools.

Select an element, adjust typography, spacing, alignment, color, and text in place, then export the edited page as an HTML snapshot or through the browser PDF print flow.

## Status

ClickDeck is an alpha project. The extension is usable for local testing and GitHub feedback, but it is not ready for Chrome Web Store submission yet.

## Why ClickDeck

AI coding tools are good at generating the first version of a web page, but the last mile is often visual: a title needs to be bigger, a paragraph needs softer spacing, a section needs a warmer color, or a presentation page needs a final polish before sharing.

ClickDeck sits between Chrome DevTools and a full design tool. It is a lightweight in-browser visual editor for people who want direct control over the rendered page without turning every small design adjustment into a code search.

## Features

- Select elements on the current page with a visual outline.
- Adjust font size, weight, line spacing, alignment, and color.
- Edit text directly in place.
- Undo and redo style/text changes.
- Export an edited HTML snapshot.
- Trigger PDF export in long-page, A4, and 16:9 modes.
- Copy recent diagnostics logs for issue reports.
- Show a Chinese UI automatically when the browser language is Chinese.

## Use Cases

- Polishing AI-generated landing pages, prototypes, and static HTML pages.
- Fine-tuning HTML presentations built with Reveal.js, Slidev, Marp, or custom HTML.
- Adjusting browser-rendered project briefs, proposals, reports, and teaching materials.
- Capturing an edited page as HTML or PDF when source-code write-back is not needed.

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

For screenshots or GIF recording, open `fixtures/showcase-page.html`, enable ClickDeck with `Alt+Shift+C`, select the hero title or metric cards, and demonstrate a few small typography/color changes.

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

ClickDeck 是一个开源 Chrome/Edge 插件，用于对当前 HTML 页面进行可视化编辑和微调。它适合微调 AI 生成的网页、HTML 演示文稿、项目简报和其他浏览器渲染出来的文档，不需要打开 DevTools。

你可以直接选择页面元素，调整字号、间距、对齐、颜色和文本内容，然后把修改后的页面导出为 HTML 快照，或通过浏览器打印流程导出 PDF。

## 当前状态

ClickDeck 目前是 alpha 项目。它已经适合本地测试和 GitHub 反馈，但还不建议直接提交 Chrome Web Store。

## 为什么做 ClickDeck

AI 编程工具很擅长生成第一版网页，但最后一公里通常是视觉微调：标题再大一点、段落间距柔和一点、区块颜色更暖一点，或者 HTML/PPT 式页面在分享前需要最后打磨。

ClickDeck 介于 Chrome DevTools 和完整设计工具之间。它是一个轻量的浏览器内可视化编辑器，让用户不用为了每一个小改动都去代码里搜索定位。

## 功能

- 在当前页面上选择元素，并显示可视化描边。
- 调整字号、字重、行距、对齐和颜色。
- 直接编辑页面文字。
- 撤销和重做样式/文字修改。
- 导出修改后的 HTML 快照。
- 触发长页面、A4、16:9 三种 PDF 打印导出。
- 复制最近诊断日志，方便提交 issue。
- 浏览器语言为中文时自动显示中文界面。

## 使用场景

- 微调 AI 生成的 landing page、原型页和静态 HTML 页面。
- 微调 Reveal.js、Slidev、Marp 或自定义 HTML 生成的演示文稿。
- 调整项目简报、提案、报告和教学材料等浏览器渲染文档。
- 在不需要源码回写时，把修改后的页面导出为 HTML 或 PDF。

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

如果要录制截图或 GIF，可以打开 `fixtures/showcase-page.html`，用 `Alt+Shift+C` 启用 ClickDeck，选择首屏标题或指标卡片，演示少量字号、颜色和文本微调。

## 隐私

ClickDeck 在浏览器本地运行。默认不会上传页面内容或诊断信息。诊断按钮只会把最近本地日志复制到剪贴板，由你决定是否粘贴到 issue。

## 已知限制

- PDF 导出走浏览器打印流程，最终保存位置仍需要用户确认。
- 复杂网站的 CSS 或脚本可能影响编辑和导出质量。
- HTML 快照会保留外部资源 URL，不会把所有资源内联打包。
- 面板可以拖动和滚动，但暂不支持自由拉伸。

## License

MIT
