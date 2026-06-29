# ClickDeck 案例研究：把 AI 生成的 HTML 变成可编辑的演示材料

_A case study on editing AI-generated HTML artifacts as presentation material_

## 摘要

ClickDeck 是一个开源 Chrome/Edge 扩展，当前定位是对浏览器里已经渲染出来的 HTML 页面做可视化微调。它不试图替代代码编辑器，也不把网页变成自由画布，而是补上一个经常被忽略的环节：AI 已经生成了第一版 HTML，但人还需要对内容、版式、图片和强调关系做最后的判断与修正。

从工作流角度看，ClickDeck 处理的是“AI 生成之后”的问题。用户可以直接在页面上调整字体、行距、对齐、颜色、文本与图片，也可以添加结构化修改意见，或者生成可继续交给外部 AI 的编辑与评审 Prompt。它保留了 HTML 作为中间产物的灵活性，同时降低了普通用户必须手改代码的门槛。

这份文档刻意采用案例文章的写法，而不是产品宣传页。它包含摘要、多级标题、英文段落、工作流、表格、图示、判断性段落与结论，适合后续转换为 PDF 并导入 Lens，用于演示大纲、图表速览、划线、Explain、Summary、Bullets、Note、My Vision 以及 Portable HTML 导出。

## 1. ClickDeck 是什么？

ClickDeck 是一个基于 Manifest V3 的 Chrome/Edge 扩展，当前版本为 `1.3.2`。从仓库与 manifest 可以确认，它以 content script 的方式运行在当前网页上，主要权限围绕 `activeTab`、`scripting` 与 `storage` 展开。它的功能边界相对清楚：在浏览器里直接微调当前 HTML 页面，并把修改结果导出为适合分享、归档或继续协作的材料。

从 README 和界面文案来看，ClickDeck 当前的真实能力包括：

- 在当前页面上选择元素并显示可视化描边
- 编辑文本、调整字号、字重、颜色、对齐和间距
- 替换图片
- 撤销与重做
- 添加“修改意见”，包括与移动相关的双区域意图标记
- 生成 **Copy AI Edit Prompt** 与 **Review Prompt Handoff**
- 导出 HTML 快照、长图、图片型 PDF
- 进入浏览器演示模式
- 复制诊断日志用于问题反馈

这些能力说明 ClickDeck 不是单纯的 HTML 预览器，也不是自动改源码的系统。更准确的说法是：它是一个介于 AI 生成结果和最终交付材料之间的人工控制层。

## 2. 为什么是 HTML，而不是传统 PPT？

AI 系统生成 HTML 的能力，通常早于它稳定生成“好用的 PPT 文件”的能力。HTML 的优势在于天然承载文字、图片、布局、层级和交互，而且可以直接在浏览器中打开、分享和继续修改。对于 AI 工作流来说，HTML 既是生成结果，也是可被再次加工的中间格式。

但问题也恰恰在这里。HTML 足够灵活，普通用户却未必愿意打开 DevTools、搜索 DOM、手调 CSS。传统 PPT 工具虽然更符合习惯，却往往不是 AI 最先产出的格式。于是工作流中会出现一个空档：AI 已经生成了一份“差不多能看”的 HTML 材料，但离真正可演示、可交付、可分享的版本，还差一轮人工修订。

ClickDeck 试图补上的就是这一轮修订。它不改变 HTML 作为 AI 中间产物的地位，也不要求用户放弃浏览器环境；它只是把“最后一公里”的细调动作前移到了页面本身。这一节很适合在 Lens 里做 Summary，因为它同时包含背景、问题、折中方案与产品定位四个层次。

## 3. English Source Block for Lens Demo

An AI-generated HTML artifact is not just a static web page. It is an editable communication object created by a language model, reviewed by a human, and often reused as a presentation, report, or product explanation. The challenge is that AI can generate the first version quickly, but the final version still requires human judgment. Users need to correct wording, replace images, adjust emphasis, and export the result without asking the model to regenerate everything from scratch. In practice, the artifact moves across several stages: generation, inspection, visual correction, structured feedback, and delivery. A useful tool in this workflow should reduce friction between those stages. It should let the user work directly on the rendered page, preserve context, and support handoff to other systems. This is why visual editing, review prompts, and export formats matter: they turn a generated artifact into a controllable working document.

## 4. ClickDeck 的基本工作流

### Step 1：用 AI 生成 HTML 初稿

用户通常先从通用大模型、代码模型或模板系统获得第一版 HTML。这个初稿已经包含页面结构、标题、图片、段落和基础布局，但质量并不稳定，尤其是在重点层次、字词准确性、视觉强调和图片匹配上，往往仍需要人来判断。

### Step 2：在浏览器中打开页面

接下来，用户直接在浏览器里查看这份 HTML，而不是先回到源码层。这个阶段主要做整体检查：结构是否通顺，信息是否完整，图片是否合适，哪一部分需要改大、改弱、替换或重排。浏览器在这里既是预览器，也是接下来编辑操作的现场。

### Step 3：用 ClickDeck 可视化修改

在 ClickDeck 中，用户可以直接点选元素并调整字体、间距、对齐、颜色和文本，也可以替换图片。对于说得清的改动，这种方式比重新提示 AI 或手动搜索代码更直接；对于说不清但能看出来的问题，用户可以补充“修改意见”或生成 Review Prompt，把页面局部问题转成结构化的协作输入。

### Step 4：导出或继续交给 AI

修改完成后，用户可以导出 HTML 快照、长图、图片型 PDF，或者进入浏览器演示模式继续展示。如果还需要进一步重构源码，则可以使用 **Copy AI Edit Prompt** 或 **Review Prompt Handoff**，把页面现状和修改意图继续交给外部 AI 处理。这一节适合在 Lens 中演示 Bullets，也适合把步骤提炼后加入 My Vision。

## 5. 功能与使用场景表

| 模块 | 作用 | Lens 演示用途 |
| --- | --- | --- |
| 可视化编辑 | 直接修改 HTML 页面中的文字、字号、颜色、对齐和间距 | 适合作为结构化功能说明表加入 My Vision |
| 图片替换 | 在不离开浏览器的情况下替换页面图片 | 说明“AI 初稿之后仍需人工修正素材” |
| HTML 快照 | 导出编辑后的页面快照，保留当前浏览器中的修改结果 | 可讨论“导出的是当前工作状态，而不是源码回写” |
| 长图 / 图片型 PDF | 生成适合分享与归档的静态材料 | 适合对比不同交付格式 |
| 浏览器演示模式 | 让 HTML 页面以演示稿方式全屏展示 | 适合讨论 HTML 与传统 PPT 的边界 |
| Copy AI Edit Prompt | 把视觉修改转成结构化 Prompt，继续交给外部 AI 改源码 | 适合演示人机协作闭环 |
| Review Prompt Handoff | 把页面里“看得出但不容易说清”的问题整理成评审 Prompt | 适合演示 Explain / Summary 后的再加工 |
| 修改意见 | 直接在页面上记录移动、删除或局部意图 | 适合讨论“页面即批注面板”的工作方式 |

## 6. 项目信号与占位数据

下表只填写仓库中可以确认的内容；无法确认的数据保留 TODO，不虚构。

| 项目 | 内容 |
| --- | --- |
| 项目名称 | ClickDeck |
| 产品类型 | Chrome / Edge 扩展 |
| 当前版本 | 1.3.2 |
| GitHub 地址 | https://github.com/ningsiii/ClickDeck |
| Chrome Web Store 地址 | TODO：仓库中未找到公开链接 |
| GitHub Stars | TODO：请在录制前填写当前数据 |
| Chrome Web Store 用户数 | TODO：请在录制前填写当前数据 |
| 当前阶段 | Early MVP / 持续迭代中 |
| 许可证 | MIT |

## 7. 图片 / 界面示意

![ClickDeck 界面示意图](../assets/clickdeck-showcase.png)

图 1：ClickDeck 的界面示意图。该图可用于 Lens 中的 Figure / 图表速览演示；如果后续需要更贴近视频脚本的画面，也可以替换为 Chrome Store 截图或最新操作截图。

## 8. 从 ClickDeck 到 Lens：共同的问题

AI 会生成越来越多的材料，格式可能是网页、PDF、Markdown、长文档、方案页或演示稿。真正困难的地方并不在“第一版能不能生成”，而在“生成之后，谁来负责理解、筛选、修改、重排和复用这些材料”。ClickDeck 面向的是 AI 生成 HTML 之后的编辑与导出，Lens 面向的是长文档导入之后的阅读、标注、重构与再输出。两者解决的问题不同，但它们面对的是同一个变化：内容生成速度在上升，而人工控制界面仍然稀缺。

真正的问题不是 AI 能不能生成内容，而是人在 AI 生成之后，如何继续理解、整理、修改和复用这些材料。

这段判断适合在 Lens 里写 Note，因为它不是功能列表，而是对工作流的立场判断。用户可以围绕这句话继续补充自己的观察，例如：哪些材料适合直接发布，哪些材料必须经过人工重构，哪些工具只是“生成器”，哪些工具才是真正的工作台。

## 9. 为什么这份文档适合 Lens MVP 演示？

这份文档故意包含了 Lens 演示所需要的关键元素：有清晰的大纲层级，有适合 Explain 的英文概念段，有适合 Summary 的背景说明，有适合 Bullets 的 4 步工作流，有功能表和项目信号表，也有一张真实相对路径图片。

除此之外，它还包含两个对 Lens 很重要的内容类型。第一类是判断性段落，例如上一节关于“AI 生成之后的人类控制”的论述，适合用户划线并写 Note。第二类是可重组的结构化材料，例如工作流、功能表格、产品信号与结论段，适合加入 My Vision 后重新组织成一份新的研究页。

如果要演示 Lens 不是“只会总结 PDF”，而是一个可以把阅读结果进一步重构、组合并导出的工作台，那么这份文档的形态是合适的。它不像广告页那样只有口号，也不像纯论文那样过度抽象，而是保留了案例、概念、表格和结论之间的张力。

## 10. Lens 演示动作建议

以下清单可直接作为录制视频时的动作参考：

1. 导入这份文档的 PDF 版本。
2. 展示 Original 大纲。
3. 打开图表速览。
4. 选中英文段落里的 `AI-generated HTML artifact`。
5. 使用 AI Explain。
6. 选中第 4 节的工作流段落。
7. 使用 Summary / Bullets。
8. 写一条 Note：`这说明 AI 生成之后，人仍然需要控制和重构材料。`
9. 把这条 Note 加入 My Vision。
10. 把“功能与使用场景表”加入 My Vision。
11. 把图片加入 My Vision。
12. 切换到 My Vision。
13. 导出 Portable HTML。
14. 用浏览器 AI，例如 Ask Gemini / Ask GPT，对导出的 HTML 继续总结或问答。

## 11. 核心信息

ClickDeck 不是单纯的 HTML 编辑器，而是 AI 生成内容之后的人工控制层。Lens 也不应被理解成单纯的 PDF 总结器，而更像是长文档阅读之后的重构工作台。

如果把这两个项目放在同一条线上看，它们指向的是同一件事：当 AI 持续生成更多材料之后，真正稀缺的不是生成按钮，而是更好的界面，用来帮助人理解、整理、修改和复用这些材料。

这也是这份文档最适合加入 My Vision 的结论段：未来的知识工作流，不只需要生成器，还需要能够承接生成结果、并允许人继续接管的工作台。

