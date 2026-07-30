import { describe, expect, it } from "vitest";
import { askGeminiPrompts, getAskGeminiPrompt } from "./ask-gemini";

describe("askGeminiPrompts", () => {
  it("provides four distinct prompts per language", () => {
    for (const prompts of [askGeminiPrompts.en, askGeminiPrompts.zh]) {
      expect(new Set(Object.values(prompts))).toHaveLength(4);
    }
  });

  it("returns language-specific prompt text for every mode", () => {
    expect(getAskGeminiPrompt("flow", "en")).toContain("Review the current page from the \"Check Flow\" perspective.");
    expect(getAskGeminiPrompt("flow", "en")).not.toContain("请从“看逻辑”视角评审当前页面");
    expect(getAskGeminiPrompt("flow", "zh")).toContain("请从“看逻辑”视角评审当前页面");
    expect(getAskGeminiPrompt("interaction-selection", "en")).toContain("I have selected one page region with Select from screen.");
    expect(getAskGeminiPrompt("interaction-selection", "zh")).toContain("我已经通过 Select from screen 框选了一个页面区域");
  });

  const genericZhPrompts = [
    { name: "flow", prompt: askGeminiPrompts.zh.flow },
    { name: "focus", prompt: askGeminiPrompts.zh.focus }
  ];

  for (const { name, prompt } of genericZhPrompts) {
    it(`${name} zh prompt retains the general review constraints and output format`, () => {
      expect(prompt).toContain("请先根据当前网页判断它更像哪种类型：方案/PPT、产品界面、营销页、工具页、文章页或其他");
      expect(prompt).toContain("页面类型判断：");
      expect(prompt).toContain("最多输出 3 条建议");
      expect(prompt).toContain("执行难度判断标准：");
      expect(prompt).toContain("执行难度：\n低 / 中 / 高");
      expect(prompt).toContain("推荐程度判断标准：");
      expect(prompt).toContain("推荐程度：\n★☆☆☆☆ 到 ★★★★★");
      expect(prompt).toContain("给 coding AI 的修改 prompt：");
      expect(prompt).toContain("写一段可以直接复制给 coding AI 的执行指令");
      expect(prompt).toContain("不建议复杂后台、数据库、AI API、上传服务或重做整站");
      expect(prompt).toContain("优先推荐低成本、少改文案、少加交互的方案");
      expect(prompt).toContain("如果一个建议需要新增较多 JS、改变业务表达或引入复杂动效，请降低推荐星级");
    });
  }

  const genericEnPrompts = [
    { name: "flow", prompt: askGeminiPrompts.en.flow },
    { name: "focus", prompt: askGeminiPrompts.en.focus }
  ];

  for (const { name, prompt } of genericEnPrompts) {
    it(`${name} en prompt retains the general review constraints and output format`, () => {
      expect(prompt).toContain("First decide what type of page this is");
      expect(prompt).toContain("Page type judgment:");
      expect(prompt).toContain("Output at most 3 suggestions");
      expect(prompt).toContain("Implementation difficulty scale:");
      expect(prompt).toContain("Implementation difficulty:\nLow / Medium / High");
      expect(prompt).toContain("Recommendation rating scale:");
      expect(prompt).toContain("Recommendation:\n★☆☆☆☆ to ★★★★★");
      expect(prompt).toContain("Prompt for coding AI:");
      expect(prompt).toContain("Write one directly copyable instruction for a coding AI");
      expect(prompt).toContain("Do not suggest complex backend work, databases, AI APIs, upload services, or rebuilding the whole site/app");
      expect(prompt).toContain("Prefer low-cost changes that keep copy mostly intact and avoid adding unnecessary interaction");
      expect(prompt).toContain("If a suggestion requires substantial JS, changes business messaging, or adds complex motion, lower its recommendation rating");
    });
  }

  it("constrains whole-page interaction review in Chinese and English", () => {
    const zh = askGeminiPrompts.zh.interaction;
    const en = askGeminiPrompts.en.interaction;

    expect(zh).toContain("最多推荐 3 个位置");
    expect(zh).toContain("不得虚构页面中不存在的内容");
    expect(zh).toContain("不要自行设定固定数量阈值");
    expect(zh).toContain("Before/After Slider 只适合");
    expect(zh).toContain("建议保持静态");
    expect(zh).toContain("不生成代码、Canvas 或动态预览");

    expect(en).toContain("Recommend at most 3 regions");
    expect(en).toContain("Do not invent content, data, images, details, or hidden information");
    expect(en).toContain("invent a fixed numeric threshold");
    expect(en).toContain("A Before/After Slider only fits");
    expect(en).toContain("Keep the page static");
    expect(en).toContain("Do not generate code, Canvas, or a dynamic preview");
  });

  it("constrains selected-region review and edit suggestions in Chinese and English", () => {
    const zh = askGeminiPrompts.zh["interaction-selection"];
    const en = askGeminiPrompts.en["interaction-selection"];

    expect(zh).toContain("只分析本次框选区域");
    expect(zh).toContain("保持静态”作为方案 0");
    expect(zh).toContain("最多提出 2 个真正成立的交互候选");
    expect(zh).toContain("只有结论为“建议”或真正成立的“可选”方案");
    expect(zh).toContain("不超过 35 个汉字");
    expect(zh).toContain("并且不要生成修改意见");

    expect(en).toContain("Analyze only this selected region");
    expect(en).toContain("keep it static\" as Option 0");
    expect(en).toContain("at most 2 genuinely applicable interaction candidates");
    expect(en).toContain("Only for an option concluded as \"Recommend\"");
    expect(en).toContain("no more than 20 English words");
    expect(en).toContain("must not generate an edit suggestion");
  });
});
