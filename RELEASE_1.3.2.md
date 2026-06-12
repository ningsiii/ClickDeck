# ClickDeck v1.3.2 Release Notes

ClickDeck v1.3.2 is a release-preparation update for the current MVP. It packages the latest export-consistency fixes, refreshes the public-facing install materials, and prepares a cleaner GitHub / Chrome Web Store handoff without expanding the product boundary.

## Highlights

- Updated the shipped extension version to `1.3.2`.
- Updated the in-panel version label to match the release package.
- Improved toolbar activation feedback for old tabs, local HTML files, and browser-restricted pages.
- Refreshed the README download references for the `v1.3.2` package.
- Prepared a fuller English listing description that covers visual edit suggestions and external AI review handoff.
- Rebuilt the extension package as a fresh `v1.3.2` ZIP artifact.

## What this release is for

- A cleaner installation package for testers and manual installs.
- A more accurate public-facing description for GitHub Releases and Chrome Web Store materials.
- A packaging checkpoint after the recent export-consistency fixes and prompt-handoff improvements already merged into the MVP.

## Installation / Update

1. Download `ClickDeck-v1.3.2.zip` from the GitHub Releases page.
2. Extract the ZIP file to a local folder.
3. Open `chrome://extensions/` or `edge://extensions/`.
4. Enable **Developer mode**.
5. Click **Load unpacked** and choose the extracted folder.
6. If you want to edit local `file://` HTML files, open ClickDeck's **Details** page in `chrome://extensions/` and enable **Allow access to file URLs**.
7. If you already installed an older unpacked version, reload it after replacing the files.

## Local HTML Permission

Chrome and Edge do not let extensions access local `file://` pages by default. For local HTML demos or presentations:

1. Open `chrome://extensions/` or `edge://extensions/`.
2. Find **ClickDeck**.
3. Click **Details**.
4. Enable **Allow access to file URLs** / **允许访问文件网址**.
5. Reload the local HTML file, then click the ClickDeck toolbar icon again.

## Product Boundary Reminder

ClickDeck v1.3.2 still stays inside the same MVP boundary:

- It visually fine-tunes the current HTML page in the browser.
- It exports edited pages as HTML snapshots, long images, or image-based PDFs.
- It supports visual edit suggestions on the current page.
- It can prepare structured edit and review prompts from your visual changes for external AI handoff.

It still does **not**:

- write changes back to the source repository automatically
- act like a free-form canvas or Figma replacement
- generate content or redesign pages automatically
- export editable PPT or editable PDF files

## Chrome Web Store / GitHub Release Description (EN)

Use the following text for the Chrome Web Store listing or GitHub release summary:

> Visually fine-tune the current HTML page and export it.
>
> ClickDeck is a lightweight Chrome/Edge extension for editing browser-rendered HTML pages without opening DevTools. It works well for AI-generated pages, HTML presentations, reports, proposals, and other pages you want to polish directly in the browser.
>
> Core features:
> - Edit text in place and adjust font size, weight, spacing, alignment, and color
> - Replace images and make quick visual polish changes without touching source code
> - Add visual edit suggestions directly on the page, including move/remove notes and region-based intent marking
> - Use undo/redo with a draggable, collapsible control panel
> - Export the edited page as an HTML snapshot, long image, or image-based PDF
> - Generate structured edit and review prompts from your visual changes for coding AI or browser AI handoff
>
> ClickDeck is built for visual fine-tuning and review handoff on the current page. It is not a free-form design canvas and does not write changes back to your source files automatically.

## GitHub Upload Checklist

Recommended release attachments:

- `ClickDeck-v1.3.2.zip`
- release body text adapted from this file

Do **not** upload these as release attachments:

- internal docs such as `docs/执行路线图.md`
- temporary local folders such as `scratch/`
- test materials under `fixtures/` or `feedback/`
- source-only directories that are not needed for manual extension install

## 中文说明

ClickDeck v1.3.2 是一次发布准备版本，重点是把当前 MVP 的安装包、对外文案和最新修复整理一致，不是新增产品边界。

### 主要变化

- 扩展版本号升级到 `1.3.2`
- 面板中的版本显示同步更新
- 改进旧标签页、本地 HTML 和浏览器受限页面上的插件图标点击反馈
- README 的下载链接和 release 指向更新为 `v1.3.2`
- 补充了更完整的英文描述，覆盖“修改意见”和“评审 prompt 交接”
- 重新生成了 `v1.3.2` 发布包

### 这次发布主要用于

- 给测试者和手动安装用户提供一致的 release 包
- 让 GitHub Releases 与 Chrome Web Store 对外说明更贴近当前真实能力
- 为正式上传前的手测与材料整理提供一个干净版本

### 能力边界提醒

ClickDeck 仍然是一个浏览器内的 HTML 页面可视化微调工具：

- 可以编辑当前页面元素
- 可以导出 HTML 快照、长图和图片型 PDF
- 可以添加页面级的可视化修改意见
- 可以把可视化修改整理成结构化 edit / review prompt，交给外部 AI 继续处理

它仍然不是：

- 自动回写源码的工具
- 自由画布/类 Figma 工具
- 自动生成内容或自动重设计页面的 AI 工具
- 可导出可编辑 PPT / 可导出可编辑 PDF 的工具
