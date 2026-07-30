# ClickDeck v1.3.5

ClickDeck v1.3.5 adds a lightweight interaction-assistance workflow for HTML pages and browser-based presentations. It helps users identify suitable interaction patterns, review a whole page or selected region with an external AI, and carry a chosen interaction idea into an existing edit suggestion.

This release does not add a built-in AI model, generate implementation code, or automatically apply interactions to the page.

## Highlights

- Added dedicated interaction-review prompts for external AI:
  - whole-page interaction review
  - selected-region interaction review
  - conservative recommendations that can explicitly keep content static
- Added the Interaction Dictionary:
  - organized by six information relationships
  - includes twenty common UI and HTML-presentation interaction patterns
  - provides neutral A/B/C and 1/2/3 micro-demos instead of industry-specific examples
- Refined the dictionary experience:
  - the left index changes only on click
  - the right demo loops at a slower, readable pace while hovered
  - clicking pauses autoplay and allows manual interaction
  - the selected pattern can be copied as a structured description
- Connected interaction patterns to existing edit suggestions:
  - a selected pattern can be written into the current suggestion
  - the inserted text remains editable
  - no code is generated and no interaction is applied automatically
- Kept the existing visual editing, export, complex-element safety, and simple SVG text editing workflows intact

## Current scope

ClickDeck v1.3.5 can:

- visually fine-tune the current HTML page in Chrome or Edge
- edit text and safe visual properties in place
- replace images and resize supported media
- mark visual edit suggestions and move intent
- prepare structured edit and interaction-review prompts for external AI handoff
- browse and copy lightweight interaction-pattern references
- export edited pages as HTML snapshots, long images, and image-based PDFs

ClickDeck v1.3.5 does not:

- run a built-in AI model
- generate or apply interaction code automatically
- write changes back to the source repository
- become a full SVG, canvas, formula, or iframe editor
- become a free-form design canvas
- export editable PPT or editable PDF

## Installation / Update

1. Download the attached release asset `ClickDeck-v1.3.5.zip`
2. Do **not** use GitHub's auto-generated **Source code (zip)** archive for installation
3. Extract the ZIP file locally
4. Open the extracted `ClickDeck-v1.3.5/` folder and confirm that it contains `manifest.json`
5. Open `chrome://extensions/` or `edge://extensions/`
6. Enable **Developer mode**
7. Click **Load unpacked** and select the extracted `ClickDeck-v1.3.5/` folder
8. If you edit local `file://` HTML files, open ClickDeck's **Details** page and enable **Allow access to file URLs**

## Privacy policy

https://ningsiii.github.io/ClickDeck/privacy-policy.html

## 中文说明

ClickDeck v1.3.5 新增了一套面向 HTML 页面与浏览器演示文稿的轻量「交互辅助」流程。它可以帮助用户判断某个区域是否值得增加交互、通过外部 AI 审查整页或框选区域，并把选中的交互形式写入现有修改意见。

本版本不会内置 AI 模型，不会生成实现代码，也不会自动把交互应用到页面。

### 主要变化

- 新增面向外部 AI 的交互审查 Prompt：
  - 整页交互审查
  - 框选区域交互审查
  - 保持克制，可明确建议某些区域继续使用静态表达
- 新增「交互小字典」：
  - 按六种信息关系组织
  - 收录二十种常用 UI 与 HTML 演示交互形式
  - 使用 A/B/C、1/2/3 等中性微演示，不绑定具体行业案例
- 优化字典体验：
  - 左侧目录只有点击才切换
  - 右侧演示在 Hover 时以较慢节奏循环
  - 点击后暂停自动播放并允许手动操作
  - 可以复制当前选中交互形式的结构化描述
- 与现有修改意见联动：
  - 可以把选中的交互形式写入当前修改意见
  - 写入后的文字仍可继续编辑
  - 不生成代码，也不自动应用交互
- 保持原有可视化编辑、导出、复杂元素安全处理和简单 SVG 文字编辑能力不变

### 安装提醒

- 请下载 GitHub Release 附件中的 `ClickDeck-v1.3.5.zip`
- 不要把 GitHub 自动生成的 **Source code (zip)** 当成扩展安装包
- 解压后应选择 `ClickDeck-v1.3.5/` 这个包含 `manifest.json` 的文件夹
- 本地 `file://` HTML 页面仍需在扩展详情中开启 **允许访问文件网址**

### 隐私政策

https://ningsiii.github.io/ClickDeck/privacy-policy.html
