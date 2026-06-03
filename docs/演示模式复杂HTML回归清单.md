# 演示模式复杂 HTML 回归清单

本文档用于沉淀 ClickDeck 演示模式在复杂 HTML PPT 上的回归验收方法。目标不是保存真实用户文件，而是把真实反馈抽象成可重复验证的模式，避免之后只靠记忆判断“好像修好了”。

## 使用边界

- 本清单只覆盖符合 PPT / slide 场景的 HTML 页面。
- `feedback/` 中的原始文件仅作为本地排查参考，不应复制到公开 fixture。
- 自动测试 fixture 必须脱敏、最小化，只保留 DOM/CSS/JS 机制。
- 如果页面有自己的公开切页 API，ClickDeck 应优先走公开 API 或宿主协议，不读取闭包私有变量。

## 总体验收步骤

每个样本都按以下步骤检查：

1. 打开样本页面。
2. 使用 `Alt+Shift+C` 启用 ClickDeck。
3. 点击面板里的“演示”。
4. 检查进入演示模式后第一页是否完整显示。
5. 按右方向键或 PageDown 到下一页，检查正文、图片、动画完成态是否显示。
6. 按左方向键或 PageUp 回上一页，检查状态是否恢复。
7. 检查底部点、页码或导航状态是否与当前页同步。
8. 使用鼠标滚轮，确认单次滚动只翻一页，不连续乱跳。
9. 如设备支持触摸，滑动一次，确认只翻一页。
10. 按 `Esc` 退出演示模式，确认页面恢复可编辑，ClickDeck 面板恢复可见。

## 模式一：active/prev 叠片型

### 典型特征

- 多个 `.slide` 重叠在同一舞台内。
- 默认 slide `opacity: 0` 或不可见。
- `.slide.active` 显示当前页。
- `.slide.prev` 表示已经经过的页。
- 有 `.nav-dot`、`#currentSlide`、`#totalSlides` 一类状态元素。

### 真实反馈样本

- `feedback/案例1.html`
- 可能也覆盖部分 AI 生成 PPT 样式页面。

### 脱敏 fixture

- `fixtures/presentation-active-prev-fixture.html`

### 期望 ClickDeck 行为

- 进入演示模式时，当前 slide 同时具有 ClickDeck 的 presenting class 和宿主需要的 `.active`。
- 下一页后，上一页变为 `.prev`，当前页变为 `.active`。
- nav dot 和页码同步到当前页。
- 不依赖页面闭包变量。

### 常见失败现象

- 只有背景，没有正文。
- 点或页码停留在第一页。
- 第二页实际切到了，但宿主 CSS 仍认为第一页 active。
- 返回第一页后正文不再显示。

### 归因建议

- 如果 `.active/.prev` 没同步，优先检查任务 52A 的 common slide state。
- 如果 dot 数量与 slide 数量不一致，ClickDeck 不应强行同步 dot，避免误伤。
- 如果页面另有私有状态，建议页面提供 `window.__clickdeckSyncPresentationState(detail)`。

## 模式二：transform + animation hook 型

### 典型特征

- slide 外层容器如 `#deck` 使用 `transform: translate(...)` 切换位置。
- 内容初始隐藏，需要页面自己的动画函数或 hook 才显示。
- 可能暴露 `window.__playSlide(index)`。
- 可能使用 `will-change`、opacity animation、延迟 reveal。

### 真实反馈样本

- `feedback/天津活动.html`
- `feedback/天津活动-clickdeck-hook-test.html`
- `feedback/天津活动-no-deck-transform-test.html`
- `feedback/天津活动-no-motion-test.html`
- `feedback/天津活动-no-will-change-test.html`

### 脱敏 fixture

- `fixtures/presentation-transform-hook-fixture.html`

### 期望 ClickDeck 行为

- 进入演示模式时，ClickDeck 可临时中和导致 fixed 定位错乱的 transformed ancestor。
- 每次切页后调用 `window.__playSlide(index)`。
- hook 抛错时不应导致演示模式崩溃。
- 如果宿主实现 `window.__clickdeckSyncPresentationState(detail)`，ClickDeck 应传入结构化 detail。

### 常见失败现象

- 第一页等待一两秒后显示，第二页及之后只有背景。
- 返回第一页后正文也消失。
- 底部进度点不更新或无法点击。
- 导出 16:9 图片 PDF 时只捕获背景。

### 归因建议

- 如果 `__playSlide` 或宿主协议没有被调用，检查任务 52B 的 host sync。
- 如果 hook 已调用但内容仍不显示，可能是宿主动画状态在闭包私有变量或动画库内部，ClickDeck 无法直接同步。
- 如果 transformed ancestor 仍影响定位，记录为 transform 与 ClickDeck presentation stage 冲突。

## 模式三：scrollIntoView 纵向滚动型

### 典型特征

- slide 是文档流中的纵向 section。
- 页面通过 `scrollIntoView`、scroll listener 或 IntersectionObserver 更新 `.visible`。
- 没有单独 deck stage，视觉上更像长页面切片。

### 真实反馈样本

- `feedback/销售AI培训.html`
- 其他纵向滚动式 HTML 汇报页。

### 脱敏 fixture

- `fixtures/presentation-scroll-fixture.html`

### 期望 ClickDeck 行为

- 进入演示模式后，ClickDeck 仍能把当前 slide 固定到演示舞台。
- 上一页/下一页只翻一页，不被宿主滚动监听重复触发。
- 退出后页面滚动位置和编辑能力恢复。

### 常见失败现象

- 键盘一次触发宿主滚动和 ClickDeck 翻页，导致跳两页。
- 退出后页面停在错误滚动位置。
- ClickDeck 面板没有恢复。

### 归因建议

- 如果单次键盘/滚轮跳多页，检查 ClickDeck 是否在 capture 阶段阻止宿主事件继续传播。
- 如果退出后位置错误，检查 presentation controller 的原始 scrollY 保存和恢复。
- 如果宿主只依赖 IntersectionObserver，可能需要页面监听 `clickdeck:presentationchange` 或实现宿主协议。

## 每次发布前的最小检查表

| 检查项 | active/prev | transform + hook | scrollIntoView |
| --- | --- | --- | --- |
| 第一页完整显示 | 待测 | 待测 | 待测 |
| 下一页正文显示 | 待测 | 待测 | 待测 |
| 上一页恢复 | 待测 | 待测 | 待测 |
| 点/页码同步 | 待测 | 待测 | 待测 |
| 键盘单次只翻一页 | 待测 | 待测 | 待测 |
| 鼠标滚轮单次只翻一页 | 待测 | 待测 | 待测 |
| 触摸滑动可用 | 待测 | 待测 | 待测 |
| 退出后可编辑 | 待测 | 待测 | 待测 |
| ClickDeck 面板恢复 | 待测 | 待测 | 待测 |

## 自动化覆盖

当前自动化覆盖：

- `tests/e2e/clickdeck-extension.spec.ts` 中的 active/prev fixture 演示模式测试。

后续如继续加强，可再添加：

- transform + hook fixture：断言 `__playSlide` 调用后隐藏内容显示。
- scroll fixture：断言滚轮/键盘不会连续跳页，退出后 scrollY 恢复。
