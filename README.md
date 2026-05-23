# ClickDeck

English | [中文](#clickdeck-中文)

ClickDeck is an open-source Chrome extension for visually fine-tuning the current HTML page. It helps users adjust text, spacing, alignment, color, and media directly in the browser, then export the adjusted page as PDF or HTML.

## Current Scope

- Chrome extension first.
- Edit the current page in place.
- No AI content generation.
- No source-code write-back in the MVP.
- PDF export first, HTML snapshot export second.
- PPT export and source-code write-back are future research tracks.

## Development Status

This project is in early scaffolding. The first milestone is a minimal MV3 extension that can toggle a page overlay, select elements, and apply simple visual changes.

## Scripts

```bash
npm install
npm run build
npm run typecheck
npm test
npm run e2e
```

Load the built `dist/` directory in Chrome via `chrome://extensions` with Developer mode enabled.

## License

MIT

---

# ClickDeck 中文

ClickDeck 是一个开源 Chrome 插件，用于在当前 HTML 页面上进行可视化微调。用户可以直接在浏览器里调整文字、间距、对齐、颜色和媒体内容，然后将调整后的页面导出为 PDF 或 HTML。

## 当前范围

- 优先做 Chrome 插件。
- 在当前页面上直接编辑。
- 不做 AI 内容生成。
- MVP 不回写源码。
- PDF 导出优先，HTML 快照导出其次。
- PPT 导出和源码回写作为后续可研方向。

## 开发状态

项目处于早期骨架阶段。第一个里程碑是完成一个最小 MV3 插件：可以开关页面覆盖层、选择元素，并应用简单视觉修改。

## 脚本

```bash
npm install
npm run build
npm run typecheck
npm test
npm run e2e
```

构建后，在 Chrome 的 `chrome://extensions` 开启开发者模式，并加载 `dist/` 目录。

## License

MIT
