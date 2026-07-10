# ClickDeck v1.3.4

ClickDeck v1.3.4 focuses on safer handling for modern complex HTML content and more accurate move-intent handoff. It extends the MVP without changing the product boundary: ClickDeck remains a lightweight in-browser HTML fine-tuning tool, not a full SVG editor, canvas editor, formula editor, iframe editor, or free-form design canvas.

## Highlights

- Added safe whole-block handling for modern complex elements:
  - inline SVG
  - canvas
  - formula regions such as MathML, KaTeX, and MathJax
  - iframe / srcdoc blocks
- Added simple inline SVG text editing directly on the page for safe `<text>` / `<tspan>` cases
- Refined simple SVG text editing to use an anchored floating popover instead of a covering input overlay
- Keeps complex SVG text structures protected with clear limitation hints
- Improved Move Intent precision:
  - Target B now snaps to alignment guides instead of only showing them
  - move prompts describe X/Y axis constraints separately
  - Source A and Target B semantics are clearer
  - prompt output distinguishes primary constraints, secondary references, and confidence
- Cleaned up media controls:
  - the weak `Max 100%` button is hidden from the main panel
  - replace and resize actions now sit on a single row
- Fixed video resizing so `+ / -` uses intrinsic aspect ratio and can still shrink when page CSS sets blocking `min-height` or `min-width`

## Current scope

ClickDeck v1.3.4 can:

- visually fine-tune the current HTML page in the browser
- export edited pages as HTML snapshots, long images, and image-based PDFs
- hand off visual edits and move intent to external AI with more structured prompts
- edit simple inline SVG text in place when the structure is safe

ClickDeck v1.3.4 does not:

- become a full SVG editor
- edit canvas drawing internals
- edit rendered formula source structures directly
- enter iframe internals
- write changes back to the source repository automatically
- become a free-form design canvas

## Installation / Update

1. Download the attached release asset `ClickDeck-v1.3.4.zip`
2. Do **not** use GitHub's auto-generated **Source code (zip)** archive for installation
3. Extract the ZIP file locally
4. Open the extracted `ClickDeck-v1.3.4/` folder and confirm that it contains `manifest.json`
5. Open `chrome://extensions/` or `edge://extensions/`
6. Enable **Developer mode**
7. Click **Load unpacked** and select the extracted `ClickDeck-v1.3.4/` folder
8. If you edit local `file://` HTML files, open ClickDeck's **Details** page and enable **Allow access to file URLs**

## Privacy policy

https://ningsiii.github.io/ClickDeck/privacy-policy.html

## 中文说明

ClickDeck v1.3.4 重点补齐了现代复杂 HTML 元素的安全轻量编辑能力，并提升了 Move Intent 的位置表达精度。它仍然是轻量浏览器内 HTML 微调工具，不会变成完整 SVG 编辑器、Canvas 编辑器、公式编辑器、iframe 编辑器或自由画布工具。

### 主要变化

- 新增复杂元素的安全整体块处理：
  - inline SVG
  - canvas
  - MathML / KaTeX / MathJax 等公式区域
  - iframe / srcdoc
- 对简单、可控的 SVG `<text>` / `<tspan>` 提供页面内原位编辑
- 简单 SVG 文字编辑从覆盖式输入框改为锚定浮层，减少错位和遮挡感
- 对复杂 SVG 文字结构继续显示限制提示，避免误导用户进入深层编辑
- Move Intent 精度升级：
  - Target B 会真实吸附到 guide
  - prompt 分开描述 X / Y 轴主约束
  - Source A 与 Target B 的语义更清楚
  - prompt 会区分主约束、辅助参考与置信度
- 调整媒体控件：
  - 主面板中不再显示作用弱的“最大 100%”按钮
  - 替换按钮与 `- / +` 缩放按钮改为同排显示
- 修正视频缩放：
  - `+ / -` 现在优先使用视频原始比例
  - 同步清除阻挡缩小的最小尺寸约束，避免出现“只变窄、不变矮”的错误效果

### 安装提醒

- 请下载 GitHub Release 附件中的 `ClickDeck-v1.3.4.zip`
- 不要把 GitHub 自动生成的 **Source code (zip)** 当成扩展安装包
- 解压后应选择 `ClickDeck-v1.3.4/` 这个包含 `manifest.json` 的文件夹
- 本地 `file://` HTML 页面仍需在扩展详情中开启 **允许访问文件网址**

### 隐私政策

https://ningsiii.github.io/ClickDeck/privacy-policy.html
