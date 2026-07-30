export type AskGeminiPromptKey = "flow" | "focus" | "interaction" | "interaction-selection";
export type AskGeminiPromptLanguage = "en" | "zh";

const COMMON_REQUIREMENTS_ZH = `请先根据当前网页判断它更像哪种类型：方案/PPT、产品界面、营销页、工具页、文章页或其他。后续建议必须贴合这个页面类型，不要套用固定模板。

执行难度判断标准：
低：主要是调整顺序、字号、间距、强调层级、删减或移动现有模块。
中：需要重构一个页面区域，或加入少量 HTML/CSS/原生 JS 交互。
高：需要重做多页结构、复杂动画、多状态交互、响应式大改，或可能影响整体架构。

推荐程度判断标准：
★★★★★：低成本且明显改善核心理解、转化或操作路径，建议优先做。
★★★★☆：收益明确，但需要一点重排或判断，适合当前阶段做。
★★★☆☆：有帮助，但不是关键问题，可作为可选优化。
★★☆☆☆：收益有限或容易分散重点，不建议当前优先做。
★☆☆☆☆：可能炫技、过度设计或工程成本偏高，建议暂缓。

约束条件：
- 最多输出 3 条建议。
- 不写总评，不泛泛表扬，不重写整份页面。
- 不建议复杂后台、数据库、AI API、上传服务或重做整站。
- 每条建议必须引用当前页面中的具体区域、标题、模块、按钮、表格或可见文字。如果看不清页面内容，必须说明不确定，不要假装看见。
- 三条建议之间尽量覆盖不同页面、不同区域或不同问题，不要全部集中在同一个模块。
- 优先推荐低成本、少改文案、少加交互的方案。
- 如果一个建议需要新增较多 JS、改变业务表达或引入复杂动效，请降低推荐星级。
- 不要为了显得高级而建议复杂动画、3D、沉浸式重做、多状态系统。优先选择低成本但能明显改善阅读或操作的改法。

每条建议必须按以下结构输出：

## 建议 N：一句话标题

页面类型判断：
方案/PPT / 产品界面 / 营销页 / 工具页 / 文章页 / 其他

你看到的问题：
用 1-2 句话说明当前页面哪里不顺。必须引用页面里的具体区域、标题、模块、按钮、表格或可见文字。

为什么值得改：
说明这个修改能改善什么：理解速度、说服力、转化、操作效率、视觉记忆点、移动端阅读体验等。

建议怎么改：
给出具体调整方向。不要只写“增强层级”“优化体验”这类空话。

执行难度：
低 / 中 / 高

推荐程度：
★☆☆☆☆ 到 ★★★★★

为什么推荐：
用一句普通用户能理解的话说明为什么这条值得先做或不值得现在做。

给 coding AI 的修改 prompt：
写一段可以直接复制给 coding AI 的执行指令，必须包含：
- 目标页面或目标区域
- 具体要改什么
- 保留什么现有风格
- 不要改什么
- 如适合用 ClickDeck 框选，请说明建议框选哪个区域`;

const COMMON_REQUIREMENTS_EN = `First decide what type of page this is: proposal/PPT, product UI, marketing page, tool page, article page, or something else. Your suggestions must fit that page type. Do not apply a fixed template.

Implementation difficulty scale:
Low: mostly adjusts order, font size, spacing, emphasis, hierarchy, deletion, or movement of existing modules.
Medium: requires rebuilding one page region, or adding a small amount of HTML/CSS/vanilla JS interaction.
High: requires rebuilding multiple pages, complex animation, multi-state interaction, major responsive changes, or changes that may affect the overall architecture.

Recommendation rating scale:
★★★★★: low cost and clearly improves core comprehension, conversion, or the operation path; do it first.
★★★★☆: clear value, but needs some layout work or judgment; suitable for the current phase.
★★★☆☆: useful, but not a core issue; optional optimization.
★★☆☆☆: limited value or may distract from the main point; do not prioritize now.
★☆☆☆☆: likely over-designed, gimmicky, or costly; defer it.

Constraints:
- Output at most 3 suggestions.
- Do not write an overall review, generic praise, or a full-page rewrite.
- Do not suggest complex backend work, databases, AI APIs, upload services, or rebuilding the whole site/app.
- Each suggestion must cite a specific region, heading, module, button, table, or visible text from the current page. If you cannot clearly see the page content, say that you are unsure instead of pretending.
- The 3 suggestions should cover different regions or different problems when possible. Do not put all of them on the same module.
- Prefer low-cost changes that keep copy mostly intact and avoid adding unnecessary interaction.
- If a suggestion requires substantial JS, changes business messaging, or adds complex motion, lower its recommendation rating.
- Do not propose complex animation, 3D effects, immersive rebuilds, or multi-state systems just to sound advanced. Prefer low-cost changes that clearly improve reading or operation.

Each suggestion must use this exact structure:

## Suggestion N: One-line title

Page type judgment:
Proposal/PPT / Product UI / Marketing page / Tool page / Article page / Other

What you noticed:
Use 1-2 sentences to describe what feels unclear or ineffective. You must cite a concrete region, heading, module, button, table, or visible text from the page.

Why it is worth changing:
Explain what this improves: comprehension speed, persuasion, conversion, operation efficiency, visual memorability, mobile readability, etc.

How to change it:
Give a concrete adjustment. Do not write vague advice such as "improve hierarchy" or "enhance the experience" without specifics.

Implementation difficulty:
Low / Medium / High

Recommendation:
★☆☆☆☆ to ★★★★★

Why this rating:
Use one plain sentence that a non-technical user can understand.

Prompt for coding AI:
Write one directly copyable instruction for a coding AI. It must include:
- Target page or target region
- Exactly what to change
- What existing style to preserve
- What not to change
- If ClickDeck selection would help, specify which area the user should select`;

const FLOW_FOCUS_ZH = `请从“看逻辑”视角评审当前页面。
聚焦要求：
- 页面顺序是否顺。
- 信息递进是否自然。
- 用户是否知道下一步为什么出现。
- 方案/PPT 是否有说服闭环。
- 产品 UI 是否有清楚的任务路径。`;

const FOCUS_FOCUS_ZH = `请从“看重点”视角评审当前页面。
聚焦要求：
- 第一眼看到什么。
- 核心标题、数字、按钮、金句、图表是否足够突出。
- 页面是否太满、太平均或太松。
- 重要信息是否被次要信息淹没。
- 视觉主次是否适合当前页面类型。`;

const INTERACTION_PAGE_ZH = `请作为一名克制的网页交互审阅者，分析当前整个页面。

你的目标不是增加更多动画和操作，而是判断：页面中是否存在能真实降低理解、查找、比较成本的轻量交互。

请先理解页面的内容结构、信息关系和用户阅读任务，再提出建议。

规则：

1. 最多推荐 3 个位置；如果静态表达已经足够，可以只推荐 1 个或完全不推荐。
2. 不得虚构页面中不存在的内容、数据、图片、详情或隐藏信息。
3. 每个位置只推荐一种主要交互，不要捆绑多个功能。
4. 必须比较“保持静态”和“增加交互”，只有交互收益明显大于操作与理解成本时才建议实施。
5. 只根据当前页面的真实内容规模判断，不要用未来可能增加的内容为当前功能找理由，也不要自行设定固定数量阈值。
6. 所有核心信息应当默认可见。筛选、折叠或切换会隐藏信息时，必须说明恢复方式和遗漏风险。
7. 分别判断桌面端与移动端；不要把 Hover 当成移动端方案。
8. 不使用“最佳”“无风险”“一定提升”“完全不会影响”等缺乏证据的绝对表述。
9. 不生成代码、Canvas 或动态预览。

适用条件：

- Before/After Slider 只适合同尺寸、同构图、对象位置基本对应的两个画面。
- Accordion 只适合确实存在的次要补充内容，不能隐藏核心信息。
- 筛选或搜索只适合当前内容规模已经产生明显查找成本的情况。
- Tab 会隐藏另一种状态，如果用户需要同时比较，应优先考虑静态并排。
- 联动高亮必须存在清晰可靠的对应关系，并支持点击和键盘操作。

请按以下格式回答：

### 页面判断
- 页面主要内容与用户任务：
- 当前静态表达是否清楚：
- 是否真的需要交互：
- 判断依据：

### 候选建议
每个候选位置说明：
- 页面区域：
- 信息关系与用户任务：
- 保持静态是否足够：
- 推荐的主要交互：
- 用户如何操作：
- 成立前提：
- 当前是否满足前提：
- 相比静态表达的真实收益：
- 桌面端与移动端表现：
- 隐藏信息或增加操作成本的风险：
- 结论：建议 / 可选 / 不建议 / 不适用

### 最终结论
- 最值得实施的一项：
- 应当继续保持静态的区域：
- 是否存在为了交互而交互的风险：

如果没有任何交互明显优于静态表达，请明确回答“建议保持静态”。`;

const INTERACTION_SELECTION_ZH = `我已经通过 Select from screen 框选了一个页面区域。

请只分析本次框选区域。可以参考它在页面中的上下文，但不要扩展成全页面改版。如果无法准确识别框选内容，请直接说明，不要猜测。

你的任务是判断：这个区域保持静态是否已经足够；如果确实值得增加交互，哪一种轻量交互最合适。

规则：

1. 必须把“保持静态”作为方案 0，不能默认交互一定更好。
2. 最多提出 2 个真正成立的交互候选，不要为了凑数量提供方案。
3. 不得虚构不存在的内容、数据、图片、详情或隐藏信息。
4. 每个方案只包含一种主要交互。
5. 只根据当前内容和当前规模判断，不自行设定固定数量阈值，不用未来扩充为当前功能找理由。
6. 如果交互只增加动态感，却没有降低理解、查找或比较成本，应标记为不建议。
7. 核心信息应默认可见；涉及隐藏、筛选或切换时，说明恢复方式和遗漏风险。
8. 分别说明桌面端、移动端和键盘操作。
9. 不使用缺乏证据的绝对表述。
10. 不生成代码、Canvas 或动态预览。

特别检查：

- Slider 的两个画面是否同尺寸、同构图并且位置对应。
- Tab 是否会损害同时比较。
- Accordion 是否确实存在次要补充内容。
- 筛选或搜索是否真的降低当前内容的查找成本。
- 联动高亮是否存在清晰可靠的对应关系。

请按以下格式回答：

### 框选区域判断
- 识别到的区域：
- 信息关系：
- 用户任务：
- 当前静态表达是否清楚：
- 是否真的需要交互：

### 方案 0：保持静态
- 优点：
- 局限：
- 结论：建议 / 可选 / 不建议

### 交互候选
每个真正成立的候选说明：
- 名称：
- 用户如何操作：
- 解决的具体问题：
- 成立前提：
- 当前是否满足：
- 相比静态表达的真实收益：
- 桌面端、移动端和键盘操作：
- 隐藏信息或增加操作成本的风险：
- 结论：建议 / 可选 / 不建议 / 不适用

只有结论为“建议”或真正成立的“可选”方案，才提供：
- 可写入修改意见：用不超过 35 个汉字描述具体修改，不写代码。

### 最终结论
- 首选方案：
- 为什么优于其他方案：
- 不做交互是否会妨碍理解：
- 不适合的常见交互及原因：

如果静态表达最好，首选必须是“保持静态”，并且不要生成修改意见。`;

const FLOW_FOCUS_EN = `Review the current page from the "Check Flow" perspective.
Focus on:
- Whether the page order feels natural.
- Whether the information progression is clear.
- Whether the user understands why the next section appears.
- Whether a proposal/PPT has a persuasive loop.
- Whether a product UI has a clear task path.`;

const FOCUS_FOCUS_EN = `Review the current page from the "Check Focus" perspective.
Focus on:
- What the user sees first.
- Whether the core heading, numbers, CTA, quote, chart, or key message stands out.
- Whether the page feels too dense, too flat, or too loose.
- Whether important information is buried by secondary information.
- Whether the visual hierarchy fits the page type.`;

const INTERACTION_PAGE_EN = `Act as a restrained web interaction reviewer and analyze the entire current page.

Your goal is not to add more animation or controls. Decide whether any lightweight interaction would genuinely reduce the cost of comprehension, finding information, or comparison.

Understand the page's content structure, information relationships, and reading tasks before making suggestions.

Rules:

1. Recommend at most 3 regions. If the static expression is already sufficient, recommend only 1 region or none.
2. Do not invent content, data, images, details, or hidden information that is not present on the page.
3. Recommend only one primary interaction for each region. Do not bundle multiple features.
4. Compare keeping the region static with adding interaction. Recommend interaction only when its value clearly outweighs the added operation and comprehension cost.
5. Judge the page at its current content scale. Do not justify a feature with hypothetical future content or invent a fixed numeric threshold.
6. Core information should remain visible by default. If filtering, disclosure, or switching hides information, explain how it is restored and the risk of omission.
7. Evaluate desktop and mobile separately. Do not use hover as the mobile behavior.
8. Avoid unsupported absolutes such as "best," "risk-free," "guaranteed improvement," or "no impact."
9. Do not generate code, Canvas, or a dynamic preview.

Applicability checks:

- A Before/After Slider only fits two views with matching dimensions, composition, and corresponding object positions.
- An Accordion only fits secondary content that actually exists and must not hide core information.
- Filtering or search only fits when the current amount of content creates a real finding cost.
- Tabs hide the other state. Prefer static side-by-side presentation when users must compare both states simultaneously.
- Linked highlighting requires a clear, reliable mapping and must support click and keyboard operation.

Use this response structure:

### Page assessment
- Main content and user tasks:
- Is the current static expression clear:
- Does the page genuinely need interaction:
- Evidence for the judgment:

### Candidate suggestions
For each candidate region:
- Page region:
- Information relationship and user task:
- Is keeping it static sufficient:
- Primary interaction:
- What the user does:
- Prerequisites:
- Are the prerequisites currently met:
- Real value compared with the static expression:
- Desktop and mobile behavior:
- Risk of hidden information or added operation cost:
- Conclusion: Recommend / Optional / Do not recommend / Not applicable

### Final conclusion
- The single most worthwhile change:
- Regions that should remain static:
- Risk of adding interaction for its own sake:

If no interaction clearly outperforms the static expression, explicitly answer: "Keep the page static."`;

const INTERACTION_SELECTION_EN = `I have selected one page region with Select from screen.

Analyze only this selected region. You may use its page context, but do not expand the response into a whole-page redesign. If you cannot identify the selected content accurately, say so instead of guessing.

Decide whether the region is already sufficient as a static expression and, only if interaction is genuinely worthwhile, which lightweight interaction fits best.

Rules:

1. Treat "keep it static" as Option 0. Do not assume interaction is better.
2. Propose at most 2 genuinely applicable interaction candidates. Do not fill a quota.
3. Do not invent content, data, images, details, or hidden information.
4. Each option must contain only one primary interaction.
5. Judge the current content and current scale. Do not invent fixed numeric thresholds or justify a feature with hypothetical future growth.
6. If an option only adds motion without reducing comprehension, finding, or comparison cost, mark it as not recommended.
7. Core information should remain visible by default. For hiding, filtering, or switching, explain how information is restored and the risk of omission.
8. Describe desktop, mobile, and keyboard operation separately.
9. Avoid unsupported absolute claims.
10. Do not generate code, Canvas, or a dynamic preview.

Check in particular:

- Whether a Slider's two views have matching dimensions, composition, and corresponding positions.
- Whether Tabs would harm simultaneous comparison.
- Whether secondary content for an Accordion actually exists.
- Whether filtering or search reduces a real finding cost at the current scale.
- Whether linked highlighting has a clear, reliable mapping.

Use this response structure:

### Selected-region assessment
- Identified region:
- Information relationship:
- User task:
- Is the current static expression clear:
- Does it genuinely need interaction:

### Option 0: Keep it static
- Benefits:
- Limitations:
- Conclusion: Recommend / Optional / Do not recommend

### Interaction candidates
For each genuinely applicable candidate:
- Name:
- What the user does:
- Specific problem it solves:
- Prerequisites:
- Are they currently met:
- Real value compared with the static expression:
- Desktop, mobile, and keyboard operation:
- Risk of hidden information or added operation cost:
- Conclusion: Recommend / Optional / Do not recommend / Not applicable

Only for an option concluded as "Recommend" or a genuinely applicable "Optional," add:
- Edit suggestion: describe the concrete change in no more than 20 English words, without code.

### Final conclusion
- Preferred option:
- Why it is better than the alternatives:
- Would omitting interaction hinder comprehension:
- Common interactions that do not fit, and why:

If the static expression is best, the preferred option must be "Keep it static," and you must not generate an edit suggestion.`;

export const askGeminiPrompts = {
  en: {
    flow: `${FLOW_FOCUS_EN}\n\n${COMMON_REQUIREMENTS_EN}`,
    focus: `${FOCUS_FOCUS_EN}\n\n${COMMON_REQUIREMENTS_EN}`,
    interaction: INTERACTION_PAGE_EN,
    "interaction-selection": INTERACTION_SELECTION_EN
  },
  zh: {
    flow: `${FLOW_FOCUS_ZH}\n\n${COMMON_REQUIREMENTS_ZH}`,
    focus: `${FOCUS_FOCUS_ZH}\n\n${COMMON_REQUIREMENTS_ZH}`,
    interaction: INTERACTION_PAGE_ZH,
    "interaction-selection": INTERACTION_SELECTION_ZH
  }
} as const;

export function getAskGeminiPrompt(key: AskGeminiPromptKey, language: AskGeminiPromptLanguage): string {
  return askGeminiPrompts[language][key];
}
