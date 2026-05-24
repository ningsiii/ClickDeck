# ClickDeck Agent Instructions

This file is the entry point for any coding agent working in this repository.

## Must Read Before Work

Before making changes, read these files in order:

1. `AGENTS.md`
2. `docs/工程执行原则与协作规则.md`
3. `docs/执行路线图.md`
4. `docs/执行代理操作手册.md`
5. The specific roadmap task section you were asked to execute

If no specific roadmap task is assigned, stop and ask for clarification. Do not choose a task yourself.

## Current Product Boundary

ClickDeck is an open-source Chrome/Edge extension for visually fine-tuning the current HTML page.

MVP does:

- Edit the current page in place.
- Provide visual/semantic controls for style adjustments.
- Export edited HTML snapshots later.
- Export PDF later.

MVP does not:

- Add AI or LLM features.
- Generate content.
- Write changes back to source code.
- Build a free-form Figma-like canvas.
- Export editable PPT.

Do not reintroduce non-goals unless the user explicitly changes the roadmap.

## Single-Task Rule

Only execute the assigned task from `docs/执行路线图.md`.

Do not:

- Enter the next task.
- Add unrelated features.
- Refactor unrelated files.
- Reformat the whole project.
- Add dependencies unless the task explicitly requires it or validation is blocked.

If you discover an out-of-scope issue, record it under the task's "遗留问题" section in the roadmap execution record.

## Required Validation

For every implementation task, run:

```bash
npm run build
npm run typecheck
npm test
npm run e2e
```

If any command cannot be run, explain why in the execution record and final report.

## Roadmap Ledger

`docs/执行路线图.md` is both the plan and the execution ledger.

After finishing a task:

1. Commit the implementation first.
2. Copy the implementation commit hash.
3. Append an execution record to that task's section in `docs/执行路线图.md`.
4. Commit the roadmap execution record separately.

The roadmap record commit must only modify `docs/执行路线图.md`.

## Default Commit Pattern

Use two commits per completed task:

```text
<type>: <implementation summary>
docs: record task X execution
```

Example:

```text
refactor: split content script modules
docs: record task 1 execution
```

## Completion Definition

A task is complete only when:

- The assigned task goal is met.
- No out-of-scope feature was added.
- All required validation commands pass, or failures are clearly documented.
- The implementation commit exists.
- The roadmap execution record exists.
- The roadmap record commit exists.
- `git status --short` is clean.

## Minimal User Prompt

The user can assign work with:

```text
请阅读 AGENTS.md，并执行 docs/执行路线图.md 的任务 X。只做任务 X，不要进入下一个任务。
```

For task 1, use:

```text
请阅读 AGENTS.md，并执行 docs/执行路线图.md 的任务 1：拆分 content script。只做任务 1，不要进入任务 2。
```
