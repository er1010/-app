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
  resultImage: document.getElementById("result-image"),
  resultInterpretationTitle: document.getElementById("result-interpretation-title"),
  resultDesc: document.getElementById("result-desc"),
  resultDimensionsTitle: document.getElementById("result-dimensions-title"),
  dimensionList: document.getElementById("dimension-list"),
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
  dom.resultDimensionsTitle.textContent = themeSet.resultText.dimensions;
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

function renderDimensionList(result) {
  const { dimensionSet } = state.themePack;
  dom.dimensionList.innerHTML = "";

  dimensionSet.dimensionOrder.forEach((dimensionId) => {
    const item = document.createElement("li");
    const meta = dimensionSet.dimensionMeta[dimensionId];
    const level = result.scoring.levels[dimensionId];
    const score = result.scoring.rawScores[dimensionId];
    const explanation = dimensionSet.explanations?.[dimensionId]?.[level] ?? "";
    item.textContent = `${meta.name}：${level} / ${score}分。${explanation}`;
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
  dom.resultNote.textContent = result.secondaryType
    ? `${result.note} ${themeSet.resultText.normalTopPrefix}：${result.secondaryType.code}（${result.secondaryType.cn}）`
    : result.note;
  dom.resultDesc.textContent = type.desc;

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
  // 结果计算两段式：
  // 1) ScoringEngine 产出维度原始分/LMH/向量；
  // 2) ResultEngine 基于向量做模板匹配 + 特殊覆盖/兜底。
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
      imageUrl: state.currentResultImageUrl
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
