import { loadThemePack } from "./theme-loader.js";
import { createQuestionBank } from "./core/question-bank.js";
import { createFlowEngine } from "./core/flow-engine.js";
import { createScoringEngine } from "./core/scoring-engine.js";
import { createResultEngine } from "./core/result-engine.js";
import { downloadResultShareImage } from "./core/share-image.js";

const OPTION_CODES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const state = {
  themePack: null,
  themeId: "sbti",
  questionBank: null,
  flowEngine: null,
  scoringEngine: null,
  resultEngine: null,
  result: null,
  currentResultImageUrl: null
};

const dom = {
  homeScreen: document.getElementById("home-screen"),
  testScreen: document.getElementById("test-screen"),
  resultScreen: document.getElementById("result-screen"),
  homeTitle: document.getElementById("home-title"),
  startTestBtn: document.getElementById("start-test-btn"),
  homeAuthorLine: document.getElementById("home-author-line"),
  progressText: document.getElementById("progress-text"),
  answerGateText: document.getElementById("answer-gate-text"),
  metaLabel: document.getElementById("meta-label"),
  questionTitle: document.getElementById("question-title"),
  optionsWrap: document.getElementById("options-wrap"),
  backHomeBtn: document.getElementById("back-home-btn"),
  submitBtn: document.getElementById("submit-btn"),
  resultIntro: document.getElementById("result-intro"),
  resultRoleTitle: document.getElementById("result-role-title"),
  resultTypeCode: document.getElementById("result-type-code"),
  resultBadge: document.getElementById("result-badge"),
  resultNote: document.getElementById("result-note"),
  resultSecondaryCard: document.getElementById("result-secondary-card"),
  resultSecondaryTitle: document.getElementById("result-secondary-title"),
  resultSecondaryType: document.getElementById("result-secondary-type"),
  resultSecondaryNote: document.getElementById("result-secondary-note"),
  resultImage: document.getElementById("result-image"),
  resultInterpretationTitle: document.getElementById("result-interpretation-title"),
  resultDesc: document.getElementById("result-desc"),
  resultStrengthsSection: document.getElementById("result-strengths-section"),
  resultStrengthsTitle: document.getElementById("result-strengths-title"),
  resultStrengthsList: document.getElementById("result-strengths-list"),
  resultDimensionsTitle: document.getElementById("result-dimensions-title"),
  dimensionList: document.getElementById("dimension-list"),
  resultGuidanceSection: document.getElementById("result-guidance-section"),
  resultGuidanceTitle: document.getElementById("result-guidance-title"),
  resultGuidanceList: document.getElementById("result-guidance-list"),
  resultTipTitle: document.getElementById("result-tip-title"),
  resultTipContent: document.getElementById("result-tip-content"),
  resultAuthorTitle: document.getElementById("result-author-title"),
  resultAuthorLines: document.getElementById("result-author-lines"),
  shareImageBtn: document.getElementById("share-image-btn"),
  restartBtn: document.getElementById("restart-btn"),
  resultHomeBtn: document.getElementById("result-home-btn"),
  shareStatus: document.getElementById("share-status"),
  themeButtons: Array.from(document.querySelectorAll(".theme-btn"))
};

function showScreen(screen) {
  dom.homeScreen.classList.toggle("active", screen === "home");
  dom.testScreen.classList.toggle("active", screen === "test");
  dom.resultScreen.classList.toggle("active", screen === "result");
}

function formatOptionCode(index) {
  return OPTION_CODES[index] ?? String(index + 1);
}

function applyThemeTexts(themeSet) {
  dom.homeTitle.textContent = themeSet.hero.title;
  dom.startTestBtn.textContent = themeSet.hero.startButton;
  dom.homeAuthorLine.textContent = themeSet.hero.authorLine;

  dom.answerGateText.textContent = themeSet.hints.answerGate;
  dom.backHomeBtn.textContent = themeSet.actions.backHome;
  dom.submitBtn.textContent = themeSet.actions.submit;

  dom.resultRoleTitle.textContent = themeSet.resultText.roleTitle;
  dom.resultInterpretationTitle.textContent = themeSet.resultText.simpleInterpretation;
  dom.resultSecondaryTitle.textContent = themeSet.resultText.secondaryTitle ?? "副类型参考";
  dom.resultStrengthsTitle.textContent = themeSet.resultText.strengthsTitle ?? "画像亮点";
  dom.resultDimensionsTitle.textContent = themeSet.resultText.dimensions;
  dom.resultGuidanceTitle.textContent = themeSet.resultText.guidanceTitle ?? "成长建议";
  dom.resultTipTitle.textContent = themeSet.resultText.tipTitle;
  dom.resultTipContent.textContent = themeSet.resultText.tipContent;
  dom.resultAuthorTitle.textContent = themeSet.resultText.authorTitle;

  dom.resultAuthorLines.innerHTML = "";
  (themeSet.resultText.authorParagraphs ?? []).forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    dom.resultAuthorLines.appendChild(p);
  });

  dom.shareImageBtn.textContent = themeSet.actions.shareImage;
  dom.restartBtn.textContent = themeSet.actions.restart;
  dom.resultHomeBtn.textContent = themeSet.actions.resultHome;
}

function updateThemeButtons() {
  dom.themeButtons.forEach((button) => {
    const buttonThemeId = button.dataset.themeId;
    const active = buttonThemeId === state.themeId;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function buildOptionButton(question, option, optionIndex) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "option-btn";
  button.textContent = `${formatOptionCode(optionIndex)} ${option.label}`;
  button.addEventListener("click", () => {
    state.flowEngine.answerQuestion(question.id, option.value);
    renderTest();
  });
  return button;
}

function renderTest() {
  showScreen("test");

  const progress = state.flowEngine.getProgress();
  const question = state.flowEngine.getCurrentQuestion();

  dom.progressText.textContent = `${progress.done} / ${progress.total}`;
  dom.submitBtn.disabled = !progress.complete;
  dom.optionsWrap.innerHTML = "";

  if (!question) {
    dom.metaLabel.textContent = state.themePack.themeSet.hints.complete;
    dom.questionTitle.textContent = state.themePack.themeSet.hints.completeTip;
    return;
  }

  dom.metaLabel.textContent = question.special
    ? state.themePack.themeSet.hints.specialQuestion
    : state.themePack.themeSet.hints.hiddenDimension;

  dom.questionTitle.textContent = question.text;

  question.options.forEach((option, index) => {
    dom.optionsWrap.appendChild(buildOptionButton(question, option, index));
  });
}

function createInsightListItems(listElement, items) {
  listElement.innerHTML = "";

  items.forEach((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    listElement.appendChild(item);
  });
}

function getRankedDimensions(result) {
  const { dimensionSet } = state.themePack;
  const scoreMap = result.scoring.displayScores ?? result.scoring.rawScores;

  return dimensionSet.dimensionOrder
    .map((dimensionId) => ({
      id: dimensionId,
      meta: dimensionSet.dimensionMeta[dimensionId],
      score: Number(scoreMap?.[dimensionId] ?? 0),
      level: result.scoring.levels[dimensionId]
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.id.localeCompare(right.id);
    });
}

function renderInsightSections(result) {
  const { themeSet, dimensionSet } = state.themePack;
  const rankedDimensions = getRankedDimensions(result);

  const strengths = rankedDimensions.slice(0, 3).map((item) => {
    const hint =
      item.meta?.strengthHint ??
      dimensionSet.explanations?.[item.id]?.[item.level] ??
      "这是你比较突出的一个维度。";
    return `${item.meta.name}：${hint}`;
  });

  const watchDimensions = [...rankedDimensions]
    .sort((left, right) => left.score - right.score)
    .slice(0, 3);

  const guidance = [
    ...(result.finalType.growthTips ?? []),
    ...watchDimensions.map((item) => {
      const hint = item.meta?.coachingHint ?? "可以从更小的练习目标开始，慢慢把这一项抬起来。";
      return `${item.meta.name}：${hint}`;
    })
  ].slice(0, Number(themeSet.resultText.guidanceLimit ?? 4));

  dom.resultStrengthsSection.hidden = strengths.length === 0;
  dom.resultGuidanceSection.hidden = guidance.length === 0;

  createInsightListItems(dom.resultStrengthsList, strengths);
  createInsightListItems(dom.resultGuidanceList, guidance);
}

function renderDimensionList(result) {
  const { dimensionSet } = state.themePack;
  const scoreMap = result.scoring.displayScores ?? result.scoring.rawScores;
  const defaultMax = Math.max(1, ...Object.values(scoreMap).map((value) => Number(value)));
  const maxScore = Number(result.scoring.scoreRange?.max ?? defaultMax);

  dom.dimensionList.innerHTML = "";

  dimensionSet.dimensionOrder.forEach((dimensionId) => {
    const item = document.createElement("li");
    item.className = "dimension-item";

    const meta = dimensionSet.dimensionMeta[dimensionId];
    const level = result.scoring.levels[dimensionId];
    const score = Number(scoreMap?.[dimensionId] ?? 0);
    const explanation = dimensionSet.explanations?.[dimensionId]?.[level] ?? "";
    const percentage = Math.max(0, Math.min(100, Math.round((score / maxScore) * 100)));

    const header = document.createElement("div");
    header.className = "dimension-topline";

    const name = document.createElement("strong");
    name.className = "dimension-name";
    name.textContent = meta.name;

    const stat = document.createElement("span");
    stat.className = "dimension-score";
    stat.textContent = `${score} / ${maxScore} · ${level}`;

    const meter = document.createElement("div");
    meter.className = "dimension-meter";

    const fill = document.createElement("span");
    fill.className = "dimension-fill";
    fill.style.width = `${percentage}%`;

    const desc = document.createElement("p");
    desc.className = "dimension-explanation";
    desc.textContent = explanation;

    header.appendChild(name);
    header.appendChild(stat);
    meter.appendChild(fill);
    item.appendChild(header);
    item.appendChild(meter);
    item.appendChild(desc);
    dom.dimensionList.appendChild(item);
  });
}

function renderResult() {
  showScreen("result");
  dom.shareStatus.textContent = "";

  const { themeSet, imageMap } = state.themePack;
  const result = state.result;
  const type = result.finalType;

  dom.resultIntro.textContent = type.intro;
  dom.resultTypeCode.textContent = `${type.code}（${type.cn}）`;
  dom.resultBadge.textContent = result.badge;
  dom.resultNote.textContent = result.note;
  dom.resultDesc.textContent = type.desc;

  if (result.secondaryType) {
    dom.resultSecondaryCard.hidden = false;
    dom.resultSecondaryType.textContent = `${result.secondaryType.code}（${result.secondaryType.cn}）`;
    dom.resultSecondaryNote.textContent =
      themeSet.resultText.secondaryNoteTemplate
        ? themeSet.resultText.secondaryNoteTemplate
            .replace("{secondaryCode}", result.secondaryType.code)
            .replace("{secondaryCn}", result.secondaryType.cn)
        : `你身上也带着 ${result.secondaryType.cn} 的风格。`;
  } else {
    dom.resultSecondaryCard.hidden = true;
    dom.resultSecondaryType.textContent = "";
    dom.resultSecondaryNote.textContent = "";
  }

  const fileName = imageMap.get(type.code);
  if (fileName) {
    state.currentResultImageUrl = `${themeSet.assets.imageBasePath}${fileName}`;
    dom.resultImage.hidden = false;
    dom.resultImage.src = state.currentResultImageUrl;
    dom.resultImage.alt = `${type.code} ${type.cn}`;
  } else {
    state.currentResultImageUrl = null;
    dom.resultImage.hidden = true;
    dom.resultImage.removeAttribute("src");
  }

  renderInsightSections(result);
  renderDimensionList(result);
}

function startTest() {
  state.flowEngine.start();
  state.result = null;
  state.currentResultImageUrl = null;
  renderTest();
}

function submitResult() {
  const progress = state.flowEngine.getProgress();
  if (!progress.complete) {
    return;
  }

  const answers = state.flowEngine.getAnswers();
  const scoring = state.scoringEngine.score(answers, state.questionBank.regularQuestions);
  const resolved = state.resultEngine.resolveResult({ answers, scoring });

  state.result = {
    ...resolved,
    scoring
  };

  renderResult();
}

async function handleShareImage() {
  if (!state.result) {
    return;
  }

  dom.shareImageBtn.disabled = true;
  dom.shareStatus.textContent = "正在生成分享图...";

  try {
    await downloadResultShareImage({
      result: state.result,
      imageUrl: state.currentResultImageUrl,
      title: `${state.themePack.themeSet.name} 结果`
    });
    dom.shareStatus.textContent = "分享图已生成并开始下载。";
  } catch {
    dom.shareStatus.textContent = "分享图生成失败，请稍后重试。";
  } finally {
    dom.shareImageBtn.disabled = false;
  }
}

function bindEvents() {
  dom.startTestBtn.addEventListener("click", startTest);
  dom.backHomeBtn.addEventListener("click", () => showScreen("home"));
  dom.submitBtn.addEventListener("click", submitResult);
  dom.restartBtn.addEventListener("click", startTest);
  dom.resultHomeBtn.addEventListener("click", () => showScreen("home"));
  dom.shareImageBtn.addEventListener("click", handleShareImage);
  dom.themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextThemeId = button.dataset.themeId;
      if (!nextThemeId || nextThemeId === state.themeId) {
        return;
      }

      const url = new URL(window.location.href);
      url.searchParams.set("theme", nextThemeId);
      window.location.assign(url.toString());
    });
  });
}

function getRequestedThemeId() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("theme");
  if (!requested) {
    return "sbti";
  }

  const normalized = requested.trim();
  if (!normalized) {
    return "sbti";
  }

  const aliasMap = {
    sbti: "sbti",
    "primary-student": "primary-student",
    xiaoxuesheng: "primary-student",
    "current-primary-student": "primary-student",
    "当前小学生类型": "primary-student"
  };

  return aliasMap[normalized] ?? aliasMap[normalized.toLowerCase()] ?? "sbti";
}

async function init() {
  const themeId = getRequestedThemeId();
  let themePack;

  try {
    themePack = await loadThemePack(`./data/${themeId}`);
  } catch (error) {
    if (themeId !== "sbti") {
      console.warn(`Theme "${themeId}" load failed, fallback to sbti.`, error);
      themePack = await loadThemePack("./data/sbti");
    } else {
      throw error;
    }
  }

  state.themePack = themePack;
  state.themeId = themePack?.themeSet?.id ?? "sbti";

  state.questionBank = createQuestionBank(themePack.questionSet);
  state.flowEngine = createFlowEngine({ questionBank: state.questionBank });
  state.scoringEngine = createScoringEngine({
    dimensionSet: themePack.dimensionSet,
    typeSet: themePack.typeSet
  });
  state.resultEngine = createResultEngine({
    dimensionSet: themePack.dimensionSet,
    typeSet: themePack.typeSet,
    ruleSet: themePack.ruleSet,
    themeSet: themePack.themeSet
  });

  applyThemeTexts(themePack.themeSet);
  updateThemeButtons();
  document.title = `${themePack.themeSet.name} 测试`;
  bindEvents();
  showScreen("home");
}

init().catch((error) => {
  console.error(error);
  dom.homeTitle.textContent = "应用加载失败，请刷新重试";
});
