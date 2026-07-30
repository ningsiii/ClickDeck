export type InteractionLibraryLanguage = "en" | "zh";

export type InteractionRelationId =
  | "peer-browsing"
  | "category-finding"
  | "progressive-detail"
  | "sequence-progression"
  | "comparison-change"
  | "claim-evidence";

export type InteractionDemoRenderer =
  | "carousel"
  | "preview"
  | "spotlight"
  | "filter"
  | "tabs"
  | "live-filter"
  | "sort"
  | "disclosure"
  | "drawer"
  | "dialog"
  | "master-detail"
  | "timeline"
  | "stepper"
  | "progressive-reveal"
  | "view-switcher"
  | "compare-slider"
  | "linked-compare"
  | "linked-highlight"
  | "cross-links"
  | "popover";

export type InteractionPattern = {
  id: string;
  relationId: InteractionRelationId;
  nameZh: string;
  nameEn: string;
  taskZh: string;
  taskEn: string;
  summaryZh: string;
  summaryEn: string;
  prerequisitesZh: string[];
  prerequisitesEn: string[];
  avoidWhenZh: string[];
  avoidWhenEn: string[];
  mobileNoteZh: string;
  mobileNoteEn: string;
  demoRenderer: InteractionDemoRenderer;
};

type InteractionRelation = {
  id: InteractionRelationId;
  nameZh: string;
  nameEn: string;
  taskZh: string;
  taskEn: string;
};

export const interactionRelations: readonly InteractionRelation[] = [
  { id: "peer-browsing", nameZh: "同级浏览", nameEn: "Peer browsing", taskZh: "逐项浏览同级内容", taskEn: "Browse peer items" },
  { id: "category-finding", nameZh: "分类查找", nameEn: "Category finding", taskZh: "缩小范围并定位内容", taskEn: "Narrow and find content" },
  { id: "progressive-detail", nameZh: "主次展开", nameEn: "Progressive detail", taskZh: "从摘要进入补充细节", taskEn: "Move from summary to detail" },
  { id: "sequence-progression", nameZh: "先后递进", nameEn: "Sequence", taskZh: "理解顺序或推进任务", taskEn: "Understand or advance a sequence" },
  { id: "comparison-change", nameZh: "对比变化", nameEn: "Comparison", taskZh: "比较两个状态或结构", taskEn: "Compare states or structures" },
  { id: "claim-evidence", nameZh: "主张与证据", nameEn: "Claim and evidence", taskZh: "验证主张与依据的对应", taskEn: "Connect claims with evidence" }
] as const;

export const interactionPatterns: readonly InteractionPattern[] = [
  {
    id: "carousel-pagination",
    relationId: "peer-browsing",
    nameZh: "分页轮播",
    nameEn: "Carousel / Pagination",
    taskZh: "一次聚焦一个同级项目",
    taskEn: "Focus on one peer item at a time",
    summaryZh: "通过上一项、下一项或分页点浏览同级内容。",
    summaryEn: "Browse peer content with previous, next, or pagination controls.",
    prerequisitesZh: ["内容彼此同级，单项值得获得主要空间。"],
    prerequisitesEn: ["Items are peers and each deserves primary space."],
    avoidWhenZh: ["所有内容必须同时可见，或关键内容不能被隐藏。"],
    avoidWhenEn: ["All items must remain visible or contain critical information."],
    mobileNoteZh: "按钮和分页点必须可触摸，不能只自动播放。",
    mobileNoteEn: "Controls must be touchable; never rely on autoplay alone.",
    demoRenderer: "carousel"
  },
  {
    id: "preview-linkage",
    relationId: "peer-browsing",
    nameZh: "快速预览",
    nameEn: "Hover / Focus / Click Preview",
    taskZh: "扫读列表时查看补充预览",
    taskEn: "Inspect previews while scanning a list",
    summaryZh: "选择条目后，在固定区域显示该项的补充预览。",
    summaryEn: "Selecting an item updates a fixed supplementary preview area.",
    prerequisitesZh: ["摘要默认可见，预览只是补充信息。"],
    prerequisitesEn: ["Summaries remain visible and previews are supplementary."],
    avoidWhenZh: ["关键信息只存在于预览中，或只能依赖 Hover。"],
    avoidWhenEn: ["Critical information exists only in preview or requires hover."],
    mobileNoteZh: "移动端使用点击选择，不依赖 Hover。",
    mobileNoteEn: "Use tap selection on mobile instead of hover.",
    demoRenderer: "preview"
  },
  {
    id: "spotlight-selection",
    relationId: "peer-browsing",
    nameZh: "聚焦查看",
    nameEn: "Select-to-Spotlight",
    taskZh: "突出当前项目并降低其他项目噪声",
    taskEn: "Emphasize the current item and quiet the rest",
    summaryZh: "点击卡片后突出当前项，其余同级项适度降噪。",
    summaryEn: "Selecting a card emphasizes it while softly reducing competing items.",
    prerequisitesZh: ["用户需要逐项查看，当前选中状态足够明显。"],
    prerequisitesEn: ["Users inspect items one by one and selection is obvious."],
    avoidWhenZh: ["项目很少，或降噪会让其他内容难以阅读。"],
    avoidWhenEn: ["There are few items or de-emphasis harms readability."],
    mobileNoteZh: "点击后保持选中态，再次点击或选择其他项切换。",
    mobileNoteEn: "Keep a persistent selected state after tap.",
    demoRenderer: "spotlight"
  },
  {
    id: "filter-chips",
    relationId: "category-finding",
    nameZh: "分类筛选",
    nameEn: "Filter Chips",
    taskZh: "按明确类别缩小结果",
    taskEn: "Narrow results by clear categories",
    summaryZh: "点击类别，只显示符合条件的项目，并可恢复全部。",
    summaryEn: "Choose a category to show matching items, with a clear reset.",
    prerequisitesZh: ["当前内容量已经产生查找成本，分类边界清楚。"],
    prerequisitesEn: ["Current volume creates finding cost and categories are clear."],
    avoidWhenZh: ["项目很少，或项目无法稳定分类。"],
    avoidWhenEn: ["There are few items or categories are ambiguous."],
    mobileNoteZh: "标签可换行或横向滚动，必须保留“全部”。",
    mobileNoteEn: "Allow wrapping or horizontal scrolling and retain an All option.",
    demoRenderer: "filter"
  },
  {
    id: "tabs",
    relationId: "category-finding",
    nameZh: "同级切换",
    nameEn: "Tabs",
    taskZh: "切换少量互斥内容组",
    taskEn: "Switch between a few peer groups",
    summaryZh: "在同一展示区域切换几个互斥、同层级的内容组。",
    summaryEn: "Switch a shared view between a few mutually exclusive peer groups.",
    prerequisitesZh: ["分组少、标签短、内容层级一致。"],
    prerequisitesEn: ["Groups are few, labels are short, and hierarchy is equal."],
    avoidWhenZh: ["用户需要同时看到全部内容进行比较。"],
    avoidWhenEn: ["Users need simultaneous comparison."],
    mobileNoteZh: "标签过多时不要压缩成难点的小按钮。",
    mobileNoteEn: "Do not squeeze many tabs into tiny controls.",
    demoRenderer: "tabs"
  },
  {
    id: "live-filter",
    relationId: "category-finding",
    nameZh: "即时查找",
    nameEn: "Live Filter / Search Filter",
    taskZh: "通过关键词快速定位条目",
    taskEn: "Find entries by keyword",
    summaryZh: "输入关键词后实时缩小当前结果范围。",
    summaryEn: "Typing a keyword narrows the current result set immediately.",
    prerequisitesZh: ["内容较多且文本可搜索，用户知道可能的关键词。"],
    prerequisitesEn: ["Content is substantial and users know searchable terms."],
    avoidWhenZh: ["内容很少，或可用关键词不可预测。"],
    avoidWhenEn: ["Content is small or useful terms are unpredictable."],
    mobileNoteZh: "输入框需有清除入口，避免遮挡结果。",
    mobileNoteEn: "Provide a clear action and keep results visible above the keyboard.",
    demoRenderer: "live-filter"
  },
  {
    id: "sort-control",
    relationId: "category-finding",
    nameZh: "顺序切换",
    nameEn: "Sort Control",
    taskZh: "按真实字段改变浏览顺序",
    taskEn: "Reorder content by a real field",
    summaryZh: "按时间、热度或其他明确字段调整项目顺序。",
    summaryEn: "Reorder items by time, popularity, or another explicit field.",
    prerequisitesZh: ["存在用户能理解且真实可计算的排序字段。"],
    prerequisitesEn: ["A meaningful, computable sort field exists."],
    avoidWhenZh: ["条目很少，或排序字段含义模糊。"],
    avoidWhenEn: ["There are few items or the sort meaning is unclear."],
    mobileNoteZh: "使用清楚的按钮或下拉框，显示当前排序。",
    mobileNoteEn: "Use a clear control that exposes the active order.",
    demoRenderer: "sort"
  },
  {
    id: "accordion-disclosure",
    relationId: "progressive-detail",
    nameZh: "折叠展开",
    nameEn: "Accordion / Disclosure",
    taskZh: "从可独立理解的摘要进入细节",
    taskEn: "Open detail from a sufficient summary",
    summaryZh: "默认显示标题或摘要，用户主动展开补充细节。",
    summaryEn: "Show a title or summary by default and disclose secondary detail on demand.",
    prerequisitesZh: ["细节较长，摘要本身可以独立理解。"],
    prerequisitesEn: ["Detail is substantial and the summary stands alone."],
    avoidWhenZh: ["内容很短，或被折叠的是核心信息。"],
    avoidWhenEn: ["Content is short or the hidden content is essential."],
    mobileNoteZh: "整行可点击，并显示明确的展开状态。",
    mobileNoteEn: "Make the full row tappable and expose expanded state.",
    demoRenderer: "disclosure"
  },
  {
    id: "drawer",
    relationId: "progressive-detail",
    nameZh: "侧边详情",
    nameEn: "Drawer",
    taskZh: "保留当前上下文并查看补充详情",
    taskEn: "Inspect detail without losing context",
    summaryZh: "从边缘打开当前对象的补充详情，关闭后回到原位置。",
    summaryEn: "Open supplementary detail from an edge while preserving page context.",
    prerequisitesZh: ["详情长度适中，用户需要保留原页面上下文。"],
    prerequisitesEn: ["Detail is moderate and page context must remain visible."],
    avoidWhenZh: ["内容很长、任务复杂或移动端空间极窄。"],
    avoidWhenEn: ["Content is long, the task is complex, or mobile space is tight."],
    mobileNoteZh: "移动端通常改为底部抽屉或全屏详情。",
    mobileNoteEn: "Prefer a bottom sheet or full-screen detail on mobile.",
    demoRenderer: "drawer"
  },
  {
    id: "modal-dialog",
    relationId: "progressive-detail",
    nameZh: "聚焦详情",
    nameEn: "Modal / Dialog",
    taskZh: "短暂集中注意力完成单一动作",
    taskEn: "Focus briefly on one action",
    summaryZh: "临时覆盖当前页面，让用户处理或关闭一个明确任务。",
    summaryEn: "Temporarily cover the page for one focused task that can be completed or dismissed.",
    prerequisitesZh: ["内容需要短暂集中注意力，打开和关闭路径明确。"],
    prerequisitesEn: ["The task needs focus and has obvious open and close paths."],
    avoidWhenZh: ["只是普通阅读详情，或用户需要频繁打开多个对象。"],
    avoidWhenEn: ["It is ordinary reading detail or must be opened repeatedly."],
    mobileNoteZh: "保证关闭入口可见，并正确管理键盘焦点。",
    mobileNoteEn: "Keep close visible and manage keyboard focus.",
    demoRenderer: "dialog"
  },
  {
    id: "master-detail",
    relationId: "progressive-detail",
    nameZh: "列表与详情联动",
    nameEn: "Master–Detail / Detail Panel",
    taskZh: "连续比较多个对象的详情",
    taskEn: "Compare details across several objects",
    summaryZh: "选择列表对象，另一侧持续显示对应详情。",
    summaryEn: "Selecting a list item updates a persistent detail panel.",
    prerequisitesZh: ["对象较多，用户需要连续查看或比较详情。"],
    prerequisitesEn: ["There are several objects and users compare their details."],
    avoidWhenZh: ["对象很少，或窄屏无法自然容纳双栏。"],
    avoidWhenEn: ["There are few objects or the screen cannot support two panes."],
    mobileNoteZh: "移动端通常切换为列表到详情的两层导航。",
    mobileNoteEn: "Use list-to-detail navigation on narrow screens.",
    demoRenderer: "master-detail"
  },
  {
    id: "interactive-timeline",
    relationId: "sequence-progression",
    nameZh: "时间节点查看",
    nameEn: "Interactive Timeline",
    taskZh: "按时间定位事件或状态",
    taskEn: "Locate events or states in time",
    summaryZh: "选择时间节点，查看该时点对应的事件或状态。",
    summaryEn: "Select a time node to inspect the corresponding event or state.",
    prerequisitesZh: ["时间顺序是理解核心，节点数量可控。"],
    prerequisitesEn: ["Time order is central and the number of nodes is manageable."],
    avoidWhenZh: ["内容只是普通并列，时间不是主要关系。"],
    avoidWhenEn: ["Items are merely peers and time is not the main relationship."],
    mobileNoteZh: "节点需要足够大的点击区域，并保留时间标签。",
    mobileNoteEn: "Give nodes generous tap targets and retain time labels.",
    demoRenderer: "timeline"
  },
  {
    id: "stepper",
    relationId: "sequence-progression",
    nameZh: "分步完成",
    nameEn: "Stepper",
    taskZh: "按顺序完成一个多步任务",
    taskEn: "Complete a multi-step task in order",
    summaryZh: "逐步进入下一项，并持续显示当前位置与剩余步骤。",
    summaryEn: "Advance through a task while exposing current position and remaining steps.",
    prerequisitesZh: ["用户必须依次完成任务，步骤之间存在依赖。"],
    prerequisitesEn: ["Users must proceed in order and steps depend on each other."],
    avoidWhenZh: ["页面只是在说明一段静态流程。"],
    avoidWhenEn: ["The page merely explains a static process."],
    mobileNoteZh: "保持上一步、下一步按钮稳定，避免步骤指示过密。",
    mobileNoteEn: "Keep navigation stable and avoid dense indicators.",
    demoRenderer: "stepper"
  },
  {
    id: "progressive-reveal",
    relationId: "sequence-progression",
    nameZh: "逐步揭示",
    nameEn: "Progressive Reveal",
    taskZh: "按理解顺序逐层接收信息",
    taskEn: "Receive information in a useful sequence",
    summaryZh: "用户推进后才显示下一层信息，前一步为后一步提供上下文。",
    summaryEn: "Reveal the next layer only after the previous one provides needed context.",
    prerequisitesZh: ["递进能降低理解负担，用户不需要快速总览。"],
    prerequisitesEn: ["Sequencing reduces cognitive load and overview is not essential."],
    avoidWhenZh: ["内容需要快速总览，或只是人为制造悬念。"],
    avoidWhenEn: ["Users need an overview or the sequence only creates suspense."],
    mobileNoteZh: "已揭示内容保持可见，并允许回看。",
    mobileNoteEn: "Keep revealed content visible and reviewable.",
    demoRenderer: "progressive-reveal"
  },
  {
    id: "view-switcher",
    relationId: "comparison-change",
    nameZh: "前后视图切换",
    nameEn: "View Switcher / Segmented Control",
    taskZh: "在同一空间查看两个状态",
    taskEn: "Inspect two states in one view",
    summaryZh: "在共用展示区域切换两个状态或模式。",
    summaryEn: "Switch a shared viewport between two states or modes.",
    prerequisitesZh: ["两个状态可共用展示区，用户可以依赖短期记忆比较。"],
    prerequisitesEn: ["States share a view and memory-based comparison is acceptable."],
    avoidWhenZh: ["用户必须同时看到两边才能判断。"],
    avoidWhenEn: ["Users must see both states simultaneously."],
    mobileNoteZh: "分段按钮保持短标签和清楚选中态。",
    mobileNoteEn: "Use short labels and an obvious selected segment.",
    demoRenderer: "view-switcher"
  },
  {
    id: "compare-slider",
    relationId: "comparison-change",
    nameZh: "重叠拖动比较",
    nameEn: "Before–After Compare Slider",
    taskZh: "比较同一对象同一视角的变化",
    taskEn: "Compare the same object from the same view",
    summaryZh: "拖动分隔线，揭示同一对象的前后两个状态。",
    summaryEn: "Drag a divider to reveal two aligned states of the same object.",
    prerequisitesZh: ["对象、尺寸、视角和关键位置可以精确对应。"],
    prerequisitesEn: ["Object, dimensions, viewpoint, and key positions align."],
    avoidWhenZh: ["布局结构不同、长文字较多或画面无法对齐。"],
    avoidWhenEn: ["Layouts differ, contain long text, or cannot align."],
    mobileNoteZh: "拖动区域要足够宽，避免与页面纵向滚动冲突。",
    mobileNoteEn: "Use a generous handle and avoid conflict with vertical scrolling.",
    demoRenderer: "compare-slider"
  },
  {
    id: "synchronized-comparison",
    relationId: "comparison-change",
    nameZh: "并排联动比较",
    nameEn: "Synchronized Side-by-Side Highlight",
    taskZh: "比较两侧内容的一一映射",
    taskEn: "Compare mapped items side by side",
    summaryZh: "保持两侧同时可见，选择一侧时高亮另一侧对应项。",
    summaryEn: "Keep both sides visible and highlight the mapped item across them.",
    prerequisitesZh: ["两侧存在明确、可解释的一一映射。"],
    prerequisitesEn: ["Both sides have a clear, explainable mapping."],
    avoidWhenZh: ["对应关系模糊，需要用户自行猜测。"],
    avoidWhenEn: ["The mapping is ambiguous or must be guessed."],
    mobileNoteZh: "窄屏堆叠后仍要让对应关系可追踪。",
    mobileNoteEn: "Mappings must remain traceable when panes stack.",
    demoRenderer: "linked-compare"
  },
  {
    id: "linked-highlight",
    relationId: "claim-evidence",
    nameZh: "证据联动高亮",
    nameEn: "Linked Highlight",
    taskZh: "把能力主张与对应证据连接起来",
    taskEn: "Connect a claim with its evidence",
    summaryZh: "选择主张时高亮对应证据，反向选择同样成立。",
    summaryEn: "Selecting a claim highlights its evidence, and vice versa.",
    prerequisitesZh: ["主张和证据存在明确映射，默认状态完整可读。"],
    prerequisitesEn: ["Claims map clearly to evidence and remain readable by default."],
    avoidWhenZh: ["映射模糊，或只能依赖颜色表达关系。"],
    avoidWhenEn: ["Mapping is vague or conveyed by color alone."],
    mobileNoteZh: "使用点击选择，并提供编号或文字等非颜色线索。",
    mobileNoteEn: "Use tap selection plus a non-color cue such as labels.",
    demoRenderer: "linked-highlight"
  },
  {
    id: "anchor-cross-links",
    relationId: "claim-evidence",
    nameZh: "跳转到证据",
    nameEn: "Anchor Links / Cross-links",
    taskZh: "在相距较远的主张与证据间导航",
    taskEn: "Navigate between distant claims and evidence",
    summaryZh: "从主张跳到页面较远的证据位置，并提供返回路径。",
    summaryEn: "Jump from a claim to distant evidence and provide a return path.",
    prerequisitesZh: ["主张与证据距离较远，目标位置稳定。"],
    prerequisitesEn: ["Claim and evidence are distant and destinations are stable."],
    avoidWhenZh: ["内容本来相邻，跳转反而打断阅读。"],
    avoidWhenEn: ["Content is already adjacent and navigation interrupts reading."],
    mobileNoteZh: "跳转后明确标记目标，并保留返回入口。",
    mobileNoteEn: "Mark the destination and provide a return control.",
    demoRenderer: "cross-links"
  },
  {
    id: "tooltip-popover",
    relationId: "claim-evidence",
    nameZh: "局部解释",
    nameEn: "Tooltip / Popover",
    taskZh: "查看术语或数据的简短补充说明",
    taskEn: "Inspect a short explanation for a term",
    summaryZh: "聚焦、点击或指向术语时显示简短补充说明。",
    summaryEn: "Focus, click, or point at a term to reveal a brief explanation.",
    prerequisitesZh: ["补充内容短、不影响主线，触发对象清楚。"],
    prerequisitesEn: ["Supplementary content is short and the trigger is obvious."],
    avoidWhenZh: ["内容很长、属于核心信息，或只能依赖 Hover。"],
    avoidWhenEn: ["Content is long, essential, or accessible only on hover."],
    mobileNoteZh: "点击打开，点击外部关闭，不能只使用 Hover。",
    mobileNoteEn: "Open on tap and close outside; never rely on hover alone.",
    demoRenderer: "popover"
  }
] as const;

export type InteractionLibraryView = {
  element: HTMLDivElement;
  destroy: () => void;
  focusInitial: () => void;
};

export type InteractionLibraryOptions = {
  onSelect?: (pattern: InteractionPattern, intentText: string) => void;
};

export function getInteractionIntentText(
  pattern: InteractionPattern,
  language: InteractionLibraryLanguage
): string {
  if (language === "zh") {
    return `将此区域改为${pattern.nameZh}（${pattern.nameEn}），${pattern.summaryZh}保留现有内容和视觉风格，不添加页面中不存在的内容，并支持点击、触摸和键盘操作。`;
  }
  return `Change this region to ${pattern.nameEn}: ${pattern.summaryEn} Preserve the existing content and visual style, invent no new content, and support click, touch, and keyboard operation.`;
}

const libraryStyles = `
  .clickdeck-interaction-library {
    position: fixed;
    inset: 0;
    z-index: 2147483646;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgba(49, 33, 18, 0.54);
    box-sizing: border-box;
  }
  .clickdeck-interaction-library * { box-sizing: border-box; }
  .clickdeck-interaction-library__dialog {
    width: min(980px, calc(100vw - 36px));
    height: min(720px, calc(100vh - 36px));
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e3cfaa;
    border-radius: 16px;
    background: #fffaf3;
    color: #3d2f24;
    box-shadow: 0 24px 70px rgba(49, 33, 18, 0.3);
  }
  .clickdeck-interaction-library__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 18px 12px;
    border-bottom: 1px solid #eadcc2;
  }
  .clickdeck-interaction-library__title {
    margin: 0;
    color: #3d2f24;
    font-size: 18px;
    line-height: 1.25;
  }
  .clickdeck-interaction-library__subtitle {
    margin: 5px 0 0;
    color: #806b58;
    font-size: 12px;
    line-height: 1.45;
  }
  .clickdeck-interaction-library__close {
    width: 34px;
    height: 34px;
    flex: 0 0 auto;
    border: 1px solid #ddc9a6;
    border-radius: 9px;
    background: #fff;
    color: #5b4634;
    font-size: 18px;
    cursor: pointer;
  }
  .clickdeck-interaction-library__filters {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding: 10px 18px;
    border-bottom: 1px solid #eadcc2;
    scrollbar-width: thin;
  }
  .clickdeck-interaction-library__filter {
    flex: 0 0 auto;
    min-height: 30px;
    padding: 5px 10px;
    border: 1px solid #dec9a6;
    border-radius: 999px;
    background: #fff;
    color: #6d5743;
    font-size: 12px;
    cursor: pointer;
  }
  .clickdeck-interaction-library__filter[aria-pressed="true"] {
    border-color: #f97316;
    background: #fff1e6;
    color: #a7440c;
    font-weight: 700;
  }
  .clickdeck-interaction-library__body {
    min-height: 0;
    flex: 1;
    display: grid;
    grid-template-columns: minmax(220px, 0.75fr) minmax(0, 2fr);
  }
  .clickdeck-interaction-library__list-pane {
    min-height: 0;
    padding: 12px;
    overflow-y: auto;
    border-right: 1px solid #eadcc2;
    background: #fff7ec;
  }
  .clickdeck-interaction-library__count {
    margin: 0 2px 8px;
    color: #8b7662;
    font-size: 11px;
  }
  .clickdeck-interaction-library__list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .clickdeck-interaction-library__item {
    width: 100%;
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 9px;
    align-items: center;
    padding: 8px;
    border: 1px solid transparent;
    border-radius: 9px;
    background: transparent;
    color: #4e3b2c;
    text-align: left;
    cursor: pointer;
  }
  .clickdeck-interaction-library__item[data-filter-match="false"] {
    opacity: 0.3;
  }
  .clickdeck-interaction-library__item:focus-visible {
    outline: 2px solid #f2b37f;
    outline-offset: -2px;
  }
  .clickdeck-interaction-library__item[aria-current="true"] {
    opacity: 1;
    border-color: transparent;
    border-left-color: #f97316;
    background: rgba(249, 115, 22, 0.06);
  }
  .clickdeck-interaction-library__item-index {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: #f2e5d2;
    color: #9b6f45;
    font-size: 11px;
    font-weight: 800;
  }
  .clickdeck-interaction-library__item[aria-current="true"] .clickdeck-interaction-library__item-index {
    background: #f97316;
    color: #fff;
  }
  .clickdeck-interaction-library__item-copy {
    min-width: 0;
  }
  .clickdeck-interaction-library__item-name {
    display: block;
    font-size: 13px;
    font-weight: 700;
  }
  .clickdeck-interaction-library__item-meta {
    display: block;
    margin-top: 3px;
    color: #907b67;
    font-size: 10px;
    line-height: 1.35;
  }
  .clickdeck-interaction-library__detail {
    min-width: 0;
    overflow-y: auto;
    padding: 18px;
  }
  .clickdeck-interaction-library__eyebrow {
    color: #d85f13;
    font-size: 11px;
    font-weight: 700;
  }
  .clickdeck-interaction-library__detail-title {
    margin: 4px 0 2px;
    color: #3d2f24;
    font-size: 21px;
    line-height: 1.25;
  }
  .clickdeck-interaction-library__detail-en {
    color: #8a7561;
    font-size: 12px;
  }
  .clickdeck-interaction-library__summary {
    margin: 12px 0;
    color: #5c4938;
    font-size: 13px;
    line-height: 1.55;
  }
  .clickdeck-interaction-library__demo-wrap {
    margin: 12px 0 16px;
    min-height: 218px;
    padding: 16px;
    overflow: hidden;
    border: 1px solid #29443b;
    border-radius: 14px;
    background:
      radial-gradient(circle at 88% 8%, rgba(241, 199, 91, 0.18), transparent 30%),
      radial-gradient(circle at 8% 96%, rgba(249, 115, 22, 0.16), transparent 34%),
      #17231f;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 12px 30px rgba(23, 35, 31, 0.15);
  }
  .clickdeck-interaction-library__demo-wrap:focus-visible {
    outline: 3px solid rgba(249, 115, 22, 0.72);
    outline-offset: 3px;
  }
  .clickdeck-interaction-library__demo-label {
    margin-bottom: 10px;
    color: #f1c75b;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .clickdeck-interaction-library__facts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .clickdeck-interaction-library__fact {
    min-width: 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: #fff5e9;
  }
  .clickdeck-interaction-library__fact--avoid { background: #f6f2ed; }
  .clickdeck-interaction-library__fact--mobile { grid-column: 1 / -1; background: #eef6f2; }
  .clickdeck-interaction-library__fact-title {
    margin-bottom: 4px;
    color: #705943;
    font-size: 11px;
    font-weight: 700;
  }
  .clickdeck-interaction-library__fact p {
    margin: 0;
    color: #5c4938;
    font-size: 11px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
  .clickdeck-interaction-library__selection {
    display: flex;
    justify-content: flex-end;
    padding: 12px 18px;
    border-top: 1px solid #eadcc2;
    background: #fffaf3;
  }
  .clickdeck-interaction-library__select {
    min-height: 36px;
    padding: 7px 14px;
    border: 1px solid #e86512;
    border-radius: 9px;
    background: #f97316;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .cd-demo {
    min-height: 150px;
    color: #f7f4eb;
    font-size: 11px;
  }
  .cd-demo.is-previewing {
    animation: cd-demo-preview-enter 280ms ease both;
  }
  @keyframes cd-demo-preview-enter {
    from { opacity: 0.55; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .cd-demo button,
  .cd-demo input {
    font: inherit;
  }
  .cd-demo button {
    min-height: 28px;
    padding: 4px 9px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.08);
    color: #f7f4eb;
    cursor: pointer;
    transition: transform 180ms ease, color 180ms ease, background 180ms ease, border-color 180ms ease, opacity 180ms ease;
  }
  .cd-demo button:hover,
  .cd-demo button:focus-visible {
    border-color: #f1c75b;
    transform: translateY(-2px);
    outline: none;
  }
  .cd-demo button[aria-pressed="true"],
  .cd-demo button[aria-selected="true"],
  .cd-demo .is-active {
    border-color: #f1c75b;
    background: #f1c75b;
    color: #17231f;
    box-shadow: 0 8px 20px rgba(241, 199, 91, 0.18);
  }
  .cd-demo__row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
  .cd-demo__stack { display: flex; flex-direction: column; gap: 7px; }
  .cd-demo__surface {
    min-height: 86px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 10px;
    background: linear-gradient(135deg, #205b48, #2c8065);
    color: #fff;
    font-size: 13px;
    font-weight: 750;
    text-align: center;
    box-shadow: 0 12px 28px rgba(8, 19, 15, 0.3);
  }
  .cd-demo__surface.is-changing {
    animation: cd-demo-state-change 360ms ease both;
  }
  @keyframes cd-demo-state-change {
    0% { opacity: 0.45; transform: scale(0.96); filter: saturate(0.7); }
    65% { transform: scale(1.025); }
    100% { opacity: 1; transform: scale(1); filter: saturate(1); }
  }
  .cd-demo__muted { color: rgba(247, 244, 235, 0.64); }
  .cd-demo__cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
  .cd-demo__card { min-height: 58px; padding: 8px; border: 1px solid rgba(255,255,255,.16); border-radius: 8px; background: #205b48; color: #fff; transition: opacity 220ms, transform 220ms, background 220ms, box-shadow 220ms; }
  .cd-demo__card:nth-child(2n) { background: #bc572f; }
  .cd-demo__card:nth-child(3n) { background: #9a7b2d; }
  .cd-demo__card.is-dimmed { opacity: 0.24; transform: scale(0.92); filter: saturate(0.45); }
  .cd-demo__card.is-active { opacity: 1; transform: translateY(-4px) scale(1.04); background: #f1c75b; color: #17231f; box-shadow: 0 12px 24px rgba(0,0,0,.24); }
  .cd-demo__split { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .cd-demo__panel { min-height: 72px; padding: 9px; border: 1px solid rgba(255,255,255,.16); border-radius: 8px; background: linear-gradient(145deg, rgba(255,255,255,.12), rgba(255,255,255,.04)); color: #fff; }
  .cd-demo__bar { height: 8px; margin: 5px 0; border-radius: 999px; background: rgba(255,255,255,.22); }
  .cd-demo__bar--accent { background: #f97316; box-shadow: 0 0 18px rgba(249,115,22,.3); }
  .cd-demo__drawer-stage, .cd-demo__dialog-stage, .cd-demo__compare {
    position: relative;
    min-height: 128px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.16);
    border-radius: 9px;
    background: linear-gradient(135deg, #203a32, #10231d);
  }
  .cd-demo__drawer {
    position: absolute;
    inset: 0 0 0 44%;
    padding: 10px;
    background: linear-gradient(145deg, #f97316, #c64d16);
    color: #fff;
    border-left: 1px solid rgba(255,255,255,.26);
    transform: translateX(102%);
    box-shadow: -14px 0 30px rgba(0,0,0,.26);
    transition: transform 320ms cubic-bezier(.2,.8,.2,1);
  }
  .cd-demo__drawer.is-open { transform: translateX(0); }
  .cd-demo__scrim {
    position: absolute;
    inset: 0;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 12px;
    background: rgba(4, 12, 9, 0.72);
  }
  .cd-demo__scrim.is-open { display: flex; }
  .cd-demo__mini-dialog { width: min(220px, 90%); padding: 12px; border-radius: 9px; background: #f1c75b; color: #17231f; box-shadow: 0 18px 38px rgba(0,0,0,.34); animation: cd-demo-dialog-in 260ms ease both; }
  @keyframes cd-demo-dialog-in { from { opacity: 0; transform: translateY(10px) scale(.94); } }
  .cd-demo__nodes { display: flex; align-items: center; justify-content: space-between; gap: 4px; margin: 12px 0; }
  .cd-demo__node { width: 30px; height: 30px; padding: 0 !important; border-radius: 50% !important; }
  .cd-demo__compare-layer {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 12px 18px;
    background: linear-gradient(135deg, #205b48, #4a9f7e);
    color: #fff;
  }
  .cd-demo__compare-layer--after {
    justify-content: flex-start;
    overflow: hidden;
    background: linear-gradient(135deg, #f97316, #f1c75b);
    color: #17231f;
    border-right: 3px solid #fff;
    transition: width 520ms cubic-bezier(.2,.8,.2,1);
  }
  .cd-demo__compare-control { width: 100%; margin-top: 8px; accent-color: #f1c75b; }
  .cd-demo__pair { padding: 7px; border: 1px solid rgba(255,255,255,.17); border-radius: 7px; background: rgba(255,255,255,.08); color: #fff; transition: transform 220ms, background 220ms, border-color 220ms, box-shadow 220ms; }
  .cd-demo__pair.is-linked { border-color: #f1c75b; background: #f1c75b; color: #17231f; transform: translateX(4px); box-shadow: 0 8px 20px rgba(241,199,91,.2); }
  .cd-demo__reveal-item { display: none; padding: 7px; border-left: 3px solid #f97316; background: rgba(249,115,22,.18); color: #fff; animation: cd-demo-reveal-in 260ms ease both; }
  @keyframes cd-demo-reveal-in { from { opacity: 0; transform: translateX(-8px); } }
  .cd-demo__reveal-item.is-visible { display: block; }
  .cd-demo__popover-stage { position: relative; min-height: 110px; padding: 24px 8px; }
  .cd-demo__popover {
    position: absolute;
    left: 50%;
    bottom: 4px;
    width: min(230px, 90%);
    padding: 8px;
    border: 1px solid #f1c75b;
    border-radius: 8px;
    background: #f1c75b;
    color: #17231f;
    box-shadow: 0 12px 28px rgba(0,0,0,.3);
    transform: translateX(-50%);
  }
  @media (prefers-reduced-motion: reduce) {
    .cd-demo.is-previewing { animation: none; }
    .cd-demo__card,
    .cd-demo__drawer,
    .cd-demo__compare-layer--after,
    .cd-demo__pair { transition: none; }
    .cd-demo__surface.is-changing,
    .cd-demo__mini-dialog,
    .cd-demo__reveal-item { animation: none; }
  }
  @media (max-width: 720px) {
    .clickdeck-interaction-library { padding: 8px; }
    .clickdeck-interaction-library__dialog { width: calc(100vw - 16px); height: calc(100vh - 16px); }
    .clickdeck-interaction-library__body { grid-template-columns: 1fr; }
    .clickdeck-interaction-library__list-pane { max-height: 190px; border-right: 0; border-bottom: 1px solid #eadcc2; }
    .clickdeck-interaction-library__list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .clickdeck-interaction-library__facts { grid-template-columns: 1fr; }
    .clickdeck-interaction-library__fact--mobile { grid-column: auto; }
  }
`;

function pick(language: InteractionLibraryLanguage, zh: string, en: string): string {
  return language === "zh" ? zh : en;
}

function relationFor(id: InteractionRelationId): InteractionRelation {
  const relation = interactionRelations.find((item) => item.id === id);
  if (!relation) {
    throw new Error(`Unknown interaction relation: ${id}`);
  }
  return relation;
}

function patternName(pattern: InteractionPattern, language: InteractionLibraryLanguage): string {
  return pick(language, pattern.nameZh, pattern.nameEn);
}

function patternTask(pattern: InteractionPattern, language: InteractionLibraryLanguage): string {
  return pick(language, pattern.taskZh, pattern.taskEn);
}

function renderDemo(renderer: InteractionDemoRenderer, language: InteractionLibraryLanguage): string {
  const t = (zh: string, en: string): string => pick(language, zh, en);

  switch (renderer) {
    case "carousel":
      return `<div class="cd-demo cd-demo__stack" data-demo-renderer="carousel" data-index="0">
        <div class="cd-demo__surface" data-demo-output>${t("A · 当前项", "A · current")}</div>
        <div class="cd-demo__row">
          <button type="button" data-demo-action="carousel-prev" aria-label="${t("上一项", "Previous")}">←</button>
          <button type="button" data-demo-action="carousel-dot" data-index="0" aria-pressed="true">1</button>
          <button type="button" data-demo-action="carousel-dot" data-index="1" aria-pressed="false">2</button>
          <button type="button" data-demo-action="carousel-dot" data-index="2" aria-pressed="false">3</button>
          <button type="button" data-demo-action="carousel-next" aria-label="${t("下一项", "Next")}">→</button>
        </div>
      </div>`;
    case "preview":
      return `<div class="cd-demo cd-demo__split" data-demo-renderer="preview">
        <div class="cd-demo__stack">
          <button type="button" data-demo-action="preview" data-value="${t("A 的预览", "Preview A")}" aria-pressed="true">A</button>
          <button type="button" data-demo-action="preview" data-value="${t("B 的预览", "Preview B")}" aria-pressed="false">B</button>
          <button type="button" data-demo-action="preview" data-value="${t("C 的预览", "Preview C")}" aria-pressed="false">C</button>
        </div>
        <div class="cd-demo__surface" data-demo-output>${t("A 的预览", "Preview A")}</div>
      </div>`;
    case "spotlight":
      return `<div class="cd-demo cd-demo__cards" data-demo-renderer="spotlight">
        ${["A", "B", "C"].map((key, index) => `<button class="cd-demo__card${index === 0 ? " is-active" : " is-dimmed"}" type="button" data-demo-action="spotlight" data-index="${index}" aria-pressed="${index === 0}">${key}</button>`).join("")}
      </div>`;
    case "filter":
      return `<div class="cd-demo cd-demo__stack" data-demo-renderer="filter">
        <div class="cd-demo__row">
          <button type="button" data-demo-action="filter" data-kind="all" aria-pressed="true">${t("全部", "All")}</button>
          <button type="button" data-demo-action="filter" data-kind="type-1" aria-pressed="false">${t("类型 1", "Type 1")}</button>
          <button type="button" data-demo-action="filter" data-kind="type-2" aria-pressed="false">${t("类型 2", "Type 2")}</button>
        </div>
        <div class="cd-demo__cards">
          <div class="cd-demo__card" data-demo-kind="type-1">A</div>
          <div class="cd-demo__card" data-demo-kind="type-2">B</div>
          <div class="cd-demo__card" data-demo-kind="type-1">C</div>
        </div>
      </div>`;
    case "tabs":
      return `<div class="cd-demo cd-demo__stack" data-demo-renderer="tabs">
        <div class="cd-demo__row" role="tablist">
          <button type="button" role="tab" data-demo-action="tab" data-value="${t("逻辑一", "Logic 1")}" aria-selected="true">${t("逻辑一", "Logic 1")}</button>
          <button type="button" role="tab" data-demo-action="tab" data-value="${t("逻辑二", "Logic 2")}" aria-selected="false">${t("逻辑二", "Logic 2")}</button>
          <button type="button" role="tab" data-demo-action="tab" data-value="${t("逻辑三", "Logic 3")}" aria-selected="false">${t("逻辑三", "Logic 3")}</button>
        </div>
        <div class="cd-demo__surface" role="tabpanel" data-demo-output>${t("逻辑一", "Logic 1")}</div>
      </div>`;
    case "live-filter":
      return `<div class="cd-demo cd-demo__stack" data-demo-renderer="live-filter">
        <input data-demo-action="live-filter" type="search" placeholder="${t("输入 A", "Type A")}" aria-label="${t("筛选条目", "Filter entries")}" />
        <div class="cd-demo__stack">
          <div class="cd-demo__panel" data-demo-search="a1">A1</div>
          <div class="cd-demo__panel" data-demo-search="b1">B1</div>
          <div class="cd-demo__panel" data-demo-search="a2">A2</div>
        </div>
      </div>`;
    case "sort":
      return `<div class="cd-demo cd-demo__stack" data-demo-renderer="sort" data-direction="desc">
        <div class="cd-demo__row"><button type="button" data-demo-action="sort">${t("顺序：3 → 1", "Order: 3 → 1")}</button></div>
        <div class="cd-demo__stack" data-demo-list>
          <div class="cd-demo__panel" data-value="3">3 · C</div>
          <div class="cd-demo__panel" data-value="2">2 · B</div>
          <div class="cd-demo__panel" data-value="1">1 · A</div>
        </div>
      </div>`;
    case "disclosure":
      return `<div class="cd-demo cd-demo__stack" data-demo-renderer="disclosure">
        <details open><summary>${t("逻辑一", "Logic 1")}</summary><p>${t("补充 A", "Detail A")}</p></details>
        <details><summary>${t("逻辑二", "Logic 2")}</summary><p>${t("补充 B", "Detail B")}</p></details>
      </div>`;
    case "drawer":
      return `<div class="cd-demo cd-demo__drawer-stage" data-demo-renderer="drawer">
        <div style="padding:12px"><button type="button" data-demo-action="drawer-open">${t("展开 A", "Open A")}</button></div>
        <div class="cd-demo__drawer" data-demo-drawer><strong>${t("A 的详情", "Detail A")}</strong><p>${t("左侧 A 保持可见", "A remains visible")}</p><button type="button" data-demo-action="drawer-close">${t("关闭", "Close")}</button></div>
      </div>`;
    case "dialog":
      return `<div class="cd-demo cd-demo__dialog-stage" data-demo-renderer="dialog">
        <div style="padding:12px"><button type="button" data-demo-action="dialog-open">${t("确认 A", "Confirm A")}</button></div>
        <div class="cd-demo__scrim" data-demo-dialog>
          <div class="cd-demo__mini-dialog" role="dialog" aria-modal="true"><strong>${t("A → B？", "A → B?")}</strong><p>${t("确认单一步骤", "Confirm one step")}</p><button type="button" data-demo-action="dialog-close">${t("完成", "Done")}</button></div>
        </div>
      </div>`;
    case "master-detail":
      return `<div class="cd-demo cd-demo__split" data-demo-renderer="master-detail">
        <div class="cd-demo__stack">
          <button type="button" data-demo-action="master-detail" data-value="${t("A 的详情", "Detail A")}" aria-pressed="true">A</button>
          <button type="button" data-demo-action="master-detail" data-value="${t("B 的详情", "Detail B")}" aria-pressed="false">B</button>
          <button type="button" data-demo-action="master-detail" data-value="${t("C 的详情", "Detail C")}" aria-pressed="false">C</button>
        </div>
        <div class="cd-demo__surface" data-demo-output>${t("A 的详情", "Detail A")}</div>
      </div>`;
    case "timeline":
      return `<div class="cd-demo cd-demo__stack" data-demo-renderer="timeline">
        <div class="cd-demo__nodes">
          ${["1", "2", "3", "4"].map((label, index) => `<button class="cd-demo__node" type="button" data-demo-action="timeline" data-value="${t(`节点 ${label}`, `Point ${label}`)}" aria-pressed="${index === 0}">${label}</button>`).join("")}
        </div>
        <div class="cd-demo__surface" data-demo-output>${t("节点 1", "Point 1")}</div>
      </div>`;
    case "stepper":
      return `<div class="cd-demo cd-demo__stack" data-demo-renderer="stepper" data-step="0">
        <div class="cd-demo__row">${[1, 2, 3].map((index) => `<span class="cd-demo__pair${index === 1 ? " is-linked" : ""}" data-demo-step-indicator="${index - 1}">${index}</span>`).join("")}</div>
        <div class="cd-demo__surface" data-demo-output>${t("步骤 1 · A", "Step 1 · A")}</div>
        <div class="cd-demo__row"><button type="button" data-demo-action="step-prev">←</button><button type="button" data-demo-action="step-next">→</button></div>
      </div>`;
    case "progressive-reveal":
      return `<div class="cd-demo cd-demo__stack" data-demo-renderer="progressive-reveal" data-revealed="1">
        <div class="cd-demo__reveal-item is-visible" data-demo-reveal="1">${t("1 · 原因", "1 · Cause")}</div>
        <div class="cd-demo__reveal-item" data-demo-reveal="2">${t("2 · 过程", "2 · Process")}</div>
        <div class="cd-demo__reveal-item" data-demo-reveal="3">${t("3 · 结果", "3 · Result")}</div>
        <button type="button" data-demo-action="reveal-next">${t("继续揭示", "Reveal next")}</button>
      </div>`;
    case "view-switcher":
      return `<div class="cd-demo cd-demo__stack" data-demo-renderer="view-switcher">
        <div class="cd-demo__row">
          <button type="button" data-demo-action="view-switcher" data-value="${t("状态 A · 结构一", "State A · Structure 1")}" aria-pressed="true">${t("状态 A", "State A")}</button>
          <button type="button" data-demo-action="view-switcher" data-value="${t("状态 B · 结构二", "State B · Structure 2")}" aria-pressed="false">${t("状态 B", "State B")}</button>
        </div>
        <div class="cd-demo__surface" data-demo-output>${t("状态 A · 结构一", "State A · Structure 1")}</div>
      </div>`;
    case "compare-slider":
      return `<div class="cd-demo cd-demo__stack" data-demo-renderer="compare-slider">
        <div class="cd-demo__compare">
          <div class="cd-demo__compare-layer">${t("状态 B", "State B")}</div>
          <div class="cd-demo__compare-layer cd-demo__compare-layer--after" data-demo-compare style="width:50%">${t("状态 A", "State A")}</div>
        </div>
        <input class="cd-demo__compare-control" data-demo-action="compare-slider" type="range" min="10" max="90" value="50" aria-label="${t("调整对比分隔线", "Adjust comparison divider")}" />
      </div>`;
    case "linked-compare":
      return `<div class="cd-demo cd-demo__split" data-demo-renderer="linked-compare">
        <div class="cd-demo__stack">${[1, 2, 3].map((index) => `<button class="cd-demo__pair${index === 1 ? " is-linked" : ""}" type="button" data-demo-action="link-pair" data-pair="${index}">A${index}</button>`).join("")}</div>
        <div class="cd-demo__stack">${[1, 2, 3].map((index) => `<button class="cd-demo__pair${index === 1 ? " is-linked" : ""}" type="button" data-demo-action="link-pair" data-pair="${index}">B${index}</button>`).join("")}</div>
      </div>`;
    case "linked-highlight":
      return `<div class="cd-demo cd-demo__split" data-demo-renderer="linked-highlight">
        <div class="cd-demo__stack">${["A", "B", "C"].map((key, index) => `<button class="cd-demo__pair${index === 0 ? " is-linked" : ""}" type="button" data-demo-action="link-pair" data-pair="${key}">${t(`因 ${key}`, `Cause ${key}`)}</button>`).join("")}</div>
        <div class="cd-demo__stack">${["A", "B", "C"].map((key, index) => `<button class="cd-demo__pair${index === 0 ? " is-linked" : ""}" type="button" data-demo-action="link-pair" data-pair="${key}">${t(`果 ${key}`, `Effect ${key}`)}</button>`).join("")}</div>
      </div>`;
    case "cross-links":
      return `<div class="cd-demo cd-demo__stack" data-demo-renderer="cross-links">
        <button type="button" data-demo-action="cross-link" data-target="2">${t("逻辑 A → 逻辑 B ↓", "Logic A → Logic B ↓")}</button>
        <div class="cd-demo__panel">${t("中间层 1", "Middle 1")}</div>
        <div class="cd-demo__pair" data-demo-cross-target="2">${t("逻辑 B → 逻辑 A", "Logic B → Logic A")}</div>
      </div>`;
    case "popover":
      return `<div class="cd-demo cd-demo__popover-stage" data-demo-renderer="popover">
        <div class="cd-demo__row">
          <span>${t("符号说明", "Symbol note")}</span>
          <button type="button" data-demo-action="popover" aria-expanded="false">A ?</button>
        </div>
        <div class="cd-demo__popover" data-demo-popover hidden>${t("A = 1 + 2", "A = 1 + 2")}</div>
      </div>`;
  }
}

export function createInteractionLibrary(
  language: InteractionLibraryLanguage,
  options: InteractionLibraryOptions = {}
): InteractionLibraryView {
  const t = (zh: string, en: string): string => pick(language, zh, en);
  const element = document.createElement("div");
  element.className = "clickdeck-interaction-library";
  element.dataset.clickdeck = "true";
  element.innerHTML = `
    <style>${libraryStyles}</style>
    <section class="clickdeck-interaction-library__dialog" role="dialog" aria-modal="true" aria-labelledby="clickdeck-interaction-library-title">
      <header class="clickdeck-interaction-library__header">
        <div>
          <h2 class="clickdeck-interaction-library__title" id="clickdeck-interaction-library-title">${t("交互小字典 · 20 种", "Interaction dictionary · 20 patterns")}</h2>
          <p class="clickdeck-interaction-library__subtitle">${options.onSelect
            ? t("点击左侧选择一种方式；鼠标移入右侧演示区可观看完整动效。确认后写入的文字仍可继续编辑。", "Click a pattern on the left, then hover over the demo on the right to watch the full motion. The inserted description remains editable.")
            : t("点击左侧名称切换方式，鼠标移入右侧演示区即可观看完整动效。它只用于理解，不会修改当前页面。", "Click a pattern on the left, then hover over the demo on the right to watch the full motion. Nothing is applied to the page.")}</p>
        </div>
        <button class="clickdeck-interaction-library__close" data-library-action="close" type="button" aria-label="${t("关闭交互小字典", "Close interaction dictionary")}">×</button>
      </header>
      <nav class="clickdeck-interaction-library__filters" aria-label="${t("按信息关系筛选", "Filter by information relationship")}"></nav>
      <div class="clickdeck-interaction-library__body">
        <aside class="clickdeck-interaction-library__list-pane">
          <div class="clickdeck-interaction-library__count"></div>
          <div class="clickdeck-interaction-library__list"></div>
        </aside>
        <main class="clickdeck-interaction-library__detail"></main>
      </div>
      ${options.onSelect ? `
        <footer class="clickdeck-interaction-library__selection">
          <button class="clickdeck-interaction-library__select" data-library-action="select" type="button">${t("写入这条修改意见", "Use in this suggestion")}</button>
        </footer>
      ` : ""}
    </section>
  `;

  let activeRelation: InteractionRelationId | "all" = "all";
  let selectedId = interactionPatterns[0].id;
  let previewTimers: number[] = [];
  const filtersElement = element.querySelector<HTMLElement>(".clickdeck-interaction-library__filters");
  const countElement = element.querySelector<HTMLElement>(".clickdeck-interaction-library__count");
  const listElement = element.querySelector<HTMLElement>(".clickdeck-interaction-library__list");
  const detailElement = element.querySelector<HTMLElement>(".clickdeck-interaction-library__detail");

  const matchingPatterns = (): readonly InteractionPattern[] => (
    activeRelation === "all"
      ? interactionPatterns
      : interactionPatterns.filter((pattern) => pattern.relationId === activeRelation)
  );

  const renderFilters = (): void => {
    if (!filtersElement) return;
    const allButton = `<button class="clickdeck-interaction-library__filter" type="button" data-library-relation="all" aria-pressed="${activeRelation === "all"}">${t("全部 20", "All 20")}</button>`;
    filtersElement.innerHTML = allButton + interactionRelations.map((relation) => {
      const count = interactionPatterns.filter((pattern) => pattern.relationId === relation.id).length;
      return `<button class="clickdeck-interaction-library__filter" type="button" data-library-relation="${relation.id}" aria-pressed="${activeRelation === relation.id}">${pick(language, relation.nameZh, relation.nameEn)} ${count}</button>`;
    }).join("");
  };

  const renderList = (): void => {
    if (!listElement || !countElement) return;
    listElement.innerHTML = interactionPatterns.map((pattern, index) => {
      const relation = relationFor(pattern.relationId);
      return `<button class="clickdeck-interaction-library__item" type="button" data-library-pattern="${pattern.id}" data-filter-match="true" aria-current="${pattern.id === selectedId}">
        <span class="clickdeck-interaction-library__item-index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
        <span class="clickdeck-interaction-library__item-copy">
          <span class="clickdeck-interaction-library__item-name">${patternName(pattern, language)}</span>
          <span class="clickdeck-interaction-library__item-meta">${pick(language, relation.nameZh, relation.nameEn)} · ${patternTask(pattern, language)}</span>
        </span>
      </button>`;
    }).join("");
  };

  const updateListState = (): void => {
    const matches = matchingPatterns();
    if (countElement) {
      countElement.textContent = activeRelation === "all"
        ? t("固定目录 · 20 种", "Fixed index · 20 patterns")
        : t(`固定目录 · ${matches.length} 种匹配`, `Fixed index · ${matches.length} matches`);
    }
    listElement?.querySelectorAll<HTMLElement>("[data-library-pattern]").forEach((item) => {
      const pattern = interactionPatterns.find((candidate) => candidate.id === item.dataset.libraryPattern);
      const isMatch = activeRelation === "all" || pattern?.relationId === activeRelation;
      item.dataset.filterMatch = String(isMatch);
      item.setAttribute("aria-current", String(item.dataset.libraryPattern === selectedId));
    });
  };

  const renderDetail = (): void => {
    if (!detailElement) return;
    const pattern = interactionPatterns.find((item) => item.id === selectedId) ?? interactionPatterns[0];
    const relation = relationFor(pattern.relationId);
    const prerequisites = language === "zh" ? pattern.prerequisitesZh : pattern.prerequisitesEn;
    const avoidWhen = language === "zh" ? pattern.avoidWhenZh : pattern.avoidWhenEn;
    detailElement.innerHTML = `
      <div class="clickdeck-interaction-library__eyebrow">${pick(language, relation.nameZh, relation.nameEn)} · ${pick(language, relation.taskZh, relation.taskEn)}</div>
      <h3 class="clickdeck-interaction-library__detail-title">${patternName(pattern, language)}</h3>
      <div class="clickdeck-interaction-library__detail-en">${language === "zh" ? pattern.nameEn : pattern.nameZh}</div>
      <p class="clickdeck-interaction-library__summary">${pick(language, pattern.summaryZh, pattern.summaryEn)}</p>
      <div class="clickdeck-interaction-library__demo-wrap" data-library-demo-stage tabindex="0" aria-label="${t("鼠标移入或按回车播放完整演示", "Hover or press Enter to play the full demo")}">
        <div class="clickdeck-interaction-library__demo-label">${t("移入这里 · 自动播放完整动效", "Hover here · full motion autoplay")}</div>
        ${renderDemo(pattern.demoRenderer, language)}
      </div>
      <div class="clickdeck-interaction-library__facts">
        <section class="clickdeck-interaction-library__fact">
          <div class="clickdeck-interaction-library__fact-title">${t("适合什么时候", "Use when")}</div>
          ${prerequisites.map((item) => `<p>✓ ${item}</p>`).join("")}
        </section>
        <section class="clickdeck-interaction-library__fact clickdeck-interaction-library__fact--avoid">
          <div class="clickdeck-interaction-library__fact-title">${t("不适合什么时候", "Avoid when")}</div>
          ${avoidWhen.map((item) => `<p>× ${item}</p>`).join("")}
        </section>
        <section class="clickdeck-interaction-library__fact clickdeck-interaction-library__fact--mobile">
          <div class="clickdeck-interaction-library__fact-title">${t("移动端提醒", "Mobile note")}</div>
          <p>${pick(language, pattern.mobileNoteZh, pattern.mobileNoteEn)}</p>
        </section>
      </div>
    `;
  };

  const render = (): void => {
    renderFilters();
    renderList();
    updateListState();
    renderDetail();
  };

  const clearPreviewTimers = (): void => {
    previewTimers.forEach((timer) => window.clearTimeout(timer));
    previewTimers = [];
  };

  const close = (): void => {
    clearPreviewTimers();
    document.removeEventListener("keydown", handleKeydown);
    element.remove();
  };

  const setSinglePressed = (container: Element, selected: Element, selector: string, attribute = "aria-pressed"): void => {
    container.querySelectorAll<HTMLElement>(selector).forEach((item) => item.setAttribute(attribute, String(item === selected)));
  };

  const setOutput = (demo: Element, value: string): void => {
    const output = demo.querySelector<HTMLElement>("[data-demo-output]");
    if (!output) return;
    output.textContent = value;
    output.classList.remove("is-changing");
    void output.offsetWidth;
    output.classList.add("is-changing");
  };

  const handleDemoClick = (button: HTMLElement, demo: HTMLElement): void => {
    const action = button.dataset.demoAction;
    if (!action) return;

    if (action === "carousel-prev" || action === "carousel-next" || action === "carousel-dot") {
      const labels = [t("A · 当前项", "A · current"), t("B · 当前项", "B · current"), t("C · 当前项", "C · current")];
      const current = Number(demo.dataset.index ?? 0);
      const next = action === "carousel-dot"
        ? Number(button.dataset.index ?? 0)
        : (current + (action === "carousel-next" ? 1 : -1) + labels.length) % labels.length;
      demo.dataset.index = String(next);
      setOutput(demo, labels[next]);
      demo.querySelectorAll<HTMLElement>("[data-demo-action='carousel-dot']").forEach((dot) => dot.setAttribute("aria-pressed", String(Number(dot.dataset.index) === next)));
    } else if (["preview", "master-detail", "timeline", "view-switcher"].includes(action)) {
      setOutput(demo, button.dataset.value ?? "");
      setSinglePressed(demo, button, `[data-demo-action="${action}"]`);
    } else if (action === "tab") {
      setOutput(demo, button.dataset.value ?? "");
      setSinglePressed(demo, button, "[data-demo-action='tab']", "aria-selected");
    } else if (action === "spotlight") {
      demo.querySelectorAll<HTMLElement>("[data-demo-action='spotlight']").forEach((card) => {
        const active = card === button;
        card.classList.toggle("is-active", active);
        card.classList.toggle("is-dimmed", !active);
        card.setAttribute("aria-pressed", String(active));
      });
    } else if (action === "filter") {
      const kind = button.dataset.kind ?? "all";
      setSinglePressed(demo, button, "[data-demo-action='filter']");
      demo.querySelectorAll<HTMLElement>("[data-demo-kind]").forEach((item) => {
        item.hidden = kind !== "all" && item.dataset.demoKind !== kind;
      });
    } else if (action === "sort") {
      const list = demo.querySelector<HTMLElement>("[data-demo-list]");
      if (!list) return;
      const direction = demo.dataset.direction === "desc" ? "asc" : "desc";
      demo.dataset.direction = direction;
      const items = Array.from(list.children) as HTMLElement[];
      items.sort((left, right) => direction === "asc"
        ? Number(left.dataset.value) - Number(right.dataset.value)
        : Number(right.dataset.value) - Number(left.dataset.value));
      items.forEach((item) => list.appendChild(item));
      button.textContent = direction === "asc" ? t("顺序：1 → 3", "Order: 1 → 3") : t("顺序：3 → 1", "Order: 3 → 1");
    } else if (action === "drawer-open" || action === "drawer-close") {
      demo.querySelector("[data-demo-drawer]")?.classList.toggle("is-open", action === "drawer-open");
    } else if (action === "dialog-open" || action === "dialog-close") {
      demo.querySelector("[data-demo-dialog]")?.classList.toggle("is-open", action === "dialog-open");
    } else if (action === "step-prev" || action === "step-next") {
      const labels = [t("步骤 1 · A", "Step 1 · A"), t("步骤 2 · B", "Step 2 · B"), t("步骤 3 · C", "Step 3 · C")];
      const current = Number(demo.dataset.step ?? 0);
      const next = Math.max(0, Math.min(labels.length - 1, current + (action === "step-next" ? 1 : -1)));
      demo.dataset.step = String(next);
      setOutput(demo, labels[next]);
      demo.querySelectorAll<HTMLElement>("[data-demo-step-indicator]").forEach((indicator) => indicator.classList.toggle("is-linked", Number(indicator.dataset.demoStepIndicator) === next));
    } else if (action === "reveal-next") {
      const current = Number(demo.dataset.revealed ?? 1);
      const next = current >= 3 ? 1 : current + 1;
      demo.dataset.revealed = String(next);
      demo.querySelectorAll<HTMLElement>("[data-demo-reveal]").forEach((item) => item.classList.toggle("is-visible", Number(item.dataset.demoReveal) <= next));
      button.textContent = next >= 3 ? t("重新演示", "Replay") : t("继续揭示", "Reveal next");
    } else if (action === "link-pair") {
      const pair = button.dataset.pair;
      demo.querySelectorAll<HTMLElement>("[data-pair]").forEach((item) => item.classList.toggle("is-linked", item.dataset.pair === pair));
    } else if (action === "cross-link") {
      const target = demo.querySelector<HTMLElement>(`[data-demo-cross-target="${button.dataset.target}"]`);
      demo.querySelectorAll(".is-linked").forEach((item) => item.classList.remove("is-linked"));
      target?.classList.add("is-linked");
      target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else if (action === "popover") {
      const popover = demo.querySelector<HTMLElement>("[data-demo-popover]");
      if (!popover) return;
      const willOpen = popover.hidden;
      popover.hidden = !willOpen;
      button.setAttribute("aria-expanded", String(willOpen));
    }
  };

  const prefersReducedMotion = (): boolean => (
    typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const playCurrentPreview = (): void => {
    clearPreviewTimers();
    const demo = detailElement?.querySelector<HTMLElement>("[data-demo-renderer]");
    if (!demo || prefersReducedMotion()) return;

    demo.classList.add("is-previewing");
    demo.dataset.previewStep = "0";

    const clickAction = (selector: string): void => {
      const control = demo.querySelector<HTMLElement>(selector);
      if (control) handleDemoClick(control, demo);
    };
    const setInput = (selector: string, value: string): void => {
      const input = demo.querySelector<HTMLInputElement>(selector);
      if (!input) return;
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const steps: Array<() => void> = [];
    const renderer = demo.dataset.demoRenderer as InteractionDemoRenderer;

    if (renderer === "carousel") {
      steps.push(
        () => clickAction("[data-demo-action='carousel-next']"),
        () => clickAction("[data-demo-action='carousel-next']"),
        () => clickAction("[data-demo-action='carousel-dot'][data-index='0']")
      );
    } else if (renderer === "preview" || renderer === "master-detail" || renderer === "timeline" || renderer === "view-switcher") {
      const action = renderer === "view-switcher" ? "view-switcher" : renderer;
      const controls = Array.from(demo.querySelectorAll<HTMLElement>(`[data-demo-action='${action}']`));
      controls.slice(1).forEach((control) => steps.push(() => handleDemoClick(control, demo)));
      if (controls[0]) steps.push(() => handleDemoClick(controls[0], demo));
    } else if (renderer === "spotlight") {
      ["1", "2", "0"].forEach((index) => steps.push(() => clickAction(`[data-demo-action='spotlight'][data-index='${index}']`)));
    } else if (renderer === "filter") {
      ["type-1", "type-2", "all"].forEach((kind) => steps.push(() => clickAction(`[data-demo-action='filter'][data-kind='${kind}']`)));
    } else if (renderer === "tabs") {
      const controls = Array.from(demo.querySelectorAll<HTMLElement>("[data-demo-action='tab']"));
      controls.slice(1).forEach((control) => steps.push(() => handleDemoClick(control, demo)));
      if (controls[0]) steps.push(() => handleDemoClick(controls[0], demo));
    } else if (renderer === "live-filter") {
      ["A", "B", ""].forEach((value) => steps.push(() => setInput("[data-demo-action='live-filter']", value)));
    } else if (renderer === "sort") {
      steps.push(
        () => clickAction("[data-demo-action='sort']"),
        () => clickAction("[data-demo-action='sort']")
      );
    } else if (renderer === "disclosure") {
      const disclosures = Array.from(demo.querySelectorAll<HTMLDetailsElement>("details"));
      steps.push(
        () => {
          if (disclosures[0]) disclosures[0].open = false;
          if (disclosures[1]) disclosures[1].open = true;
        },
        () => {
          if (disclosures[1]) disclosures[1].open = false;
          if (disclosures[0]) disclosures[0].open = true;
        }
      );
    } else if (renderer === "drawer") {
      steps.push(
        () => clickAction("[data-demo-action='drawer-open']"),
        () => clickAction("[data-demo-action='drawer-close']")
      );
    } else if (renderer === "dialog") {
      steps.push(
        () => clickAction("[data-demo-action='dialog-open']"),
        () => clickAction("[data-demo-action='dialog-close']")
      );
    } else if (renderer === "stepper") {
      steps.push(
        () => clickAction("[data-demo-action='step-next']"),
        () => clickAction("[data-demo-action='step-next']"),
        () => clickAction("[data-demo-action='step-prev']"),
        () => clickAction("[data-demo-action='step-prev']")
      );
    } else if (renderer === "progressive-reveal") {
      steps.push(
        () => clickAction("[data-demo-action='reveal-next']"),
        () => clickAction("[data-demo-action='reveal-next']"),
        () => clickAction("[data-demo-action='reveal-next']")
      );
    } else if (renderer === "compare-slider") {
      ["28", "76", "50"].forEach((value) => steps.push(() => setInput("[data-demo-action='compare-slider']", value)));
    } else if (renderer === "linked-compare") {
      ["2", "3", "1"].forEach((pair) => steps.push(() => clickAction(`[data-demo-action='link-pair'][data-pair='${pair}']`)));
    } else if (renderer === "linked-highlight") {
      ["B", "C", "A"].forEach((pair) => steps.push(() => clickAction(`[data-demo-action='link-pair'][data-pair='${pair}']`)));
    } else if (renderer === "cross-links") {
      steps.push(
        () => clickAction("[data-demo-action='cross-link']"),
        () => demo.querySelectorAll(".is-linked").forEach((item) => item.classList.remove("is-linked"))
      );
    } else if (renderer === "popover") {
      steps.push(
        () => clickAction("[data-demo-action='popover']"),
        () => clickAction("[data-demo-action='popover']")
      );
    }

    steps.forEach((step, index) => {
      const timer = window.setTimeout(() => {
        previewTimers = previewTimers.filter((candidate) => candidate !== timer);
        if (!detailElement?.contains(demo)) return;
        step();
        demo.dataset.previewStep = String(index + 1);
        if (index === steps.length - 1) demo.classList.remove("is-previewing");
      }, 240 + index * 420);
      previewTimers.push(timer);
    });
  };

  const resetCurrentPreview = (): void => {
    clearPreviewTimers();
    renderDetail();
  };

  const activatePattern = (patternId: string): void => {
    if (!interactionPatterns.some((pattern) => pattern.id === patternId)) return;
    clearPreviewTimers();
    selectedId = patternId;
    listElement?.querySelectorAll<HTMLElement>("[data-library-pattern]").forEach((item) => {
      item.setAttribute("aria-current", String(item.dataset.libraryPattern === selectedId));
    });
    renderDetail();
  };

  const handleClick = (event: Event): void => {
    const target = event.target as HTMLElement;
    if (target === element || target.closest("[data-library-action='close']")) {
      close();
      return;
    }

    if (target.closest("[data-library-action='select']")) {
      const pattern = interactionPatterns.find((item) => item.id === selectedId) ?? interactionPatterns[0];
      options.onSelect?.(pattern, getInteractionIntentText(pattern, language));
      close();
      return;
    }

    const relationButton = target.closest<HTMLElement>("[data-library-relation]");
    if (relationButton) {
      activeRelation = relationButton.dataset.libraryRelation as InteractionRelationId | "all";
      renderFilters();
      const firstMatch = matchingPatterns()[0] ?? interactionPatterns[0];
      selectedId = firstMatch.id;
      updateListState();
      renderDetail();
      return;
    }

    const patternButton = target.closest<HTMLElement>("[data-library-pattern]");
    if (patternButton?.dataset.libraryPattern) {
      activatePattern(patternButton.dataset.libraryPattern);
      return;
    }

    const demoButton = target.closest<HTMLElement>("[data-demo-action]");
    const demo = demoButton?.closest<HTMLElement>("[data-demo-renderer]");
    if (demoButton && demo) {
      clearPreviewTimers();
      handleDemoClick(demoButton, demo);
      return;
    }

    if (target.closest("[data-library-demo-stage]")) {
      playCurrentPreview();
    }
  };

  const handleInput = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    const demo = target.closest<HTMLElement>("[data-demo-renderer]");
    if (!demo) return;
    if (event.isTrusted) clearPreviewTimers();

    if (target.dataset.demoAction === "live-filter") {
      const query = target.value.trim().toLocaleLowerCase();
      demo.querySelectorAll<HTMLElement>("[data-demo-search]").forEach((item) => {
        item.hidden = !item.dataset.demoSearch?.toLocaleLowerCase().includes(query);
      });
    } else if (target.dataset.demoAction === "compare-slider") {
      const layer = demo.querySelector<HTMLElement>("[data-demo-compare]");
      if (layer) layer.style.width = `${target.value}%`;
    }
  };

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      close();
      return;
    }
    const target = event.target as HTMLElement;
    if ((event.key === "Enter" || event.key === " ") && target.matches("[data-library-demo-stage]")) {
      event.preventDefault();
      playCurrentPreview();
    }
  }

  const handleDemoStageEnter = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const stage = target.closest<HTMLElement>("[data-library-demo-stage]");
    if (!stage) return;
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && stage.contains(relatedTarget)) return;
    playCurrentPreview();
  };

  const handleDemoStageLeave = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const stage = target.closest<HTMLElement>("[data-library-demo-stage]");
    if (!stage) return;
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && stage.contains(relatedTarget)) return;
    resetCurrentPreview();
  };

  element.addEventListener("click", handleClick);
  element.addEventListener("input", handleInput);
  element.addEventListener("mouseover", handleDemoStageEnter);
  element.addEventListener("mouseout", handleDemoStageLeave);
  document.addEventListener("keydown", handleKeydown);
  render();

  return {
    element,
    destroy: close,
    focusInitial: () => element.querySelector<HTMLButtonElement>("[data-library-action='close']")?.focus()
  };
}
