# ClickDeck

English | [中文](#clickdeck-中文)

ClickDeck is an open-source Chrome/Edge extension for visual HTML page editing. It helps you fine-tune AI-generated pages, HTML presentations, project briefs, and other browser-rendered documents directly in the browser without opening DevTools.

Select an element, adjust typography, spacing, alignment, color, and text in place, add visual edit suggestions when needed, then export the edited page as an HTML snapshot, long image, image-based PDF, or browser presentation.

## Status

ClickDeck is an early MVP. It is usable for real browser-page polishing, local installation, and GitHub feedback, while export quality and advanced workflows are still improving.

## Why ClickDeck

AI coding tools are good at generating the first version of a web page, but the last mile is often visual: a title needs to be bigger, a paragraph needs softer spacing, a section needs a warmer color, or a presentation page needs a final polish before sharing.

ClickDeck sits between Chrome DevTools and a full design tool. It is a lightweight in-browser visual editor for people who want direct control over the rendered page without turning every small design adjustment into a code search.

## Features

- Select elements on the current page with a visual outline.
- Adjust font size, weight, line spacing, alignment, and color.
- Edit text directly in place.
- Replace images without leaving the browser page.
- Treat inline SVG, canvas, formula regions, and iframe blocks as safe whole-block editing targets when deep editing is unsafe.
- Edit simple inline SVG text directly on the page while keeping complex SVG text structures protected.
- Undo and redo style/text changes.
- Use a draggable, collapsible control panel while you refine the page.
- **Copy AI Edit Prompt**: Generate a structured prompt from your visual edits, ready to be pasted into Claude/ChatGPT for source code updates.
- **Review Prompt Handoff**: Prepare structured page review prompts from visible issues when you want external AI to analyze the current page.
- **Edit Suggestions**: Add visual edit suggestions on the page, including dual-region move notes for AI handoff.
- **Move Intent Precision**: Snap Target B to guides, preserve X/Y axis constraints, and describe Source A and Target B semantics more clearly in AI handoff prompts.
- **Present Mode**: Present your HTML design directly in full screen.
- Export an edited HTML snapshot.
- Export long images and image-based PDFs for sharing or archival snapshots.
- Copy recent diagnostics logs from Advanced options when issue reports need technical details.
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

## Installation

For most users, install ClickDeck from the GitHub Releases page:
1. Go to the [Releases](https://github.com/ningsiii/ClickDeck/releases) page and download the attached asset named `ClickDeck-v1.3.5.zip`.
2. Do **not** use GitHub's auto-generated **Source code (zip)** archive for installation. That archive is the Vite source project, not the unpacked extension package.
3. Extract the ZIP file to a folder on your computer. After extraction, you should see a `ClickDeck-v1.3.5/` folder that contains `manifest.json`.
4. Open Chrome or Edge and navigate to `chrome://extensions/` or `edge://extensions/`.
5. Enable **Developer mode** in the top right corner.
6. Click **Load unpacked** and select the extracted `ClickDeck-v1.3.5/` folder that contains `manifest.json`.
7. If you want to edit local `file://` HTML files, open ClickDeck's **Details** page in `chrome://extensions/` and enable **Allow access to file URLs**.
8. See the release notes in [`RELEASE_1.3.5.md`](RELEASE_1.3.5.md) if you want a short summary of what changed.

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

- Legacy browser-print PDF export is no longer the primary route. Use long image or image-based PDF export for higher visual fidelity; complex pages may still need manual review.
- Complex websites may have CSS or script behavior that affects editing/export quality.
- HTML snapshot export keeps external resource URLs instead of bundling every asset.
- The panel is draggable and scrollable, but not resizable.

## Support

- Ko-fi: https://ko-fi.com/ningsiii

| WeChat Pay | Alipay |
| --- | --- |
| ![WeChat Pay QR](docs/assets/wechat.png) | ![Alipay QR](docs/assets/alipay.png) |

## License

MIT

---

# ClickDeck 中文

ClickDeck 是一个开源 Chrome/Edge 插件，用于对当前 HTML 页面进行可视化编辑和微调。它适合微调 AI 生成的网页、HTML 演示文稿、项目简报和其他浏览器渲染出来的文档，不需要打开 DevTools。

你可以直接选择页面元素，调整字号、间距、对齐、颜色和文本内容，必要时补充可视化修改意见，然后把修改后的页面导出为 HTML 快照、长图、图片型 PDF，或直接进入浏览器演示模式。

## 当前状态

ClickDeck 目前是早期 MVP。它已经可以用于真实的浏览器页面微调、本地安装和 GitHub 反馈，但导出质量和高级工作流仍在持续优化。

## 为什么做 ClickDeck

AI 编程工具很擅长生成第一版网页，但最后一公里通常是视觉微调：标题再大一点、段落间距柔和一点、区块颜色更暖一点，或者 HTML/PPT 式页面在分享前需要最后打磨。

ClickDeck 介于 Chrome DevTools 和完整设计工具之间。它是一个轻量的浏览器内可视化编辑器，让用户不用为了每一个小改动都去代码里搜索定位。

## 功能

- 在当前页面上选择元素，并显示可视化描边。
- 调整字号、字重、行距、对齐和颜色。
- 直接编辑页面文字。
- 直接替换页面中的图片资源。
- 将 inline SVG、canvas、公式区域和 iframe 识别为安全的整体块编辑目标，在不适合深度编辑时限制操作范围。
- 对简单 SVG 文字提供页面内原位编辑，同时对复杂 SVG 文字结构保留限制提示。
- 撤销和重做样式/文字修改。
- 使用可拖动、可折叠的控制面板持续微调页面。
- **复制 AI Edit Prompt**：将你的可视化修改一键转换为结构化的 Prompt，直接发给 Claude/ChatGPT 用于修改源码。
- **让 AI 看 / Review Prompt**：把当前页面里说不清、但你看得出的设计问题整理成结构化评审 Prompt，交给外部 AI 帮你分析。
- **修改意见**: 在页面上添加可视化修改意见，并支持拖拽划定“移动”的起点和终点区域，方便交给 AI 继续改源码。
- **移动意图精度升级**: Target B 会吸附到可见 guide，并在 AI handoff prompt 中更清楚地表达 X/Y 轴关系、Source A 和 Target B 语义。
- **浏览器演示模式**: 将本地 HTML 文件作为幻灯片直接全屏演示，无需转为 PPT。
- 导出修改后的 HTML 快照。
- 导出长图和图片型 PDF，用于分享或固定归档。
- 在高级选项中复制最近诊断日志，方便提交 issue 时补充技术信息。
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

## 安装方法

对于普通用户，请通过 GitHub Releases 安装 ClickDeck：
1. 前往 [Releases](https://github.com/ningsiii/ClickDeck/releases) 页面，下载附件里的 `ClickDeck-v1.3.5.zip`。
2. 不要使用 GitHub 自动生成的 **Source code (zip)** 源码压缩包来安装。那个压缩包是 Vite 源码工程，不是可直接加载的扩展目录。
3. 将 ZIP 文件解压到你电脑上的一个文件夹中。解压后你应该能看到一个包含 `manifest.json` 的 `ClickDeck-v1.3.5/` 文件夹。
4. 打开 Chrome 或 Edge 浏览器，访问 `chrome://extensions/` 或 `edge://extensions/`。
5. 打开右上角的 **开发者模式 (Developer mode)**。
6. 点击 **加载已解压的扩展程序 (Load unpacked)**，然后选择刚才解压出来、且内部包含 `manifest.json` 的 `ClickDeck-v1.3.5/` 文件夹。
7. 如果你要编辑本地 `file://` HTML 文件，请在 `chrome://extensions/` 里打开 ClickDeck 的 **详情 (Details)** 页面，并开启 **允许访问文件网址 (Allow access to file URLs)**。
8. 如果你想先快速了解这版更新，可以查看 [`RELEASE_1.3.5.md`](RELEASE_1.3.5.md)。

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

- 旧版浏览器打印 PDF 不再是主要路线。建议优先使用长图或图片型 PDF 导出；复杂页面仍建议人工检查导出效果。
- 复杂网站的 CSS 或脚本可能影响编辑和导出质量。
- HTML 快照会保留外部资源 URL，不会把所有资源内联打包。
- 面板可以拖动和滚动，但暂不支持自由拉伸。

## 支持项目

- Ko-fi 赞助：https://ko-fi.com/ningsiii

| 微信赞赏 | 支付宝 |
| --- | --- |
| ![微信赞赏码](docs/assets/wechat.png) | ![支付宝收款码](docs/assets/alipay.png) |

## License

MIT
