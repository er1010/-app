import { shuffle } from "./utils.js";

function matchesCondition(answers, condition) {
  const value = answers?.[condition?.questionId];
  return Number(value) === Number(condition?.equals);
}

export function createFlowEngine({ questionBank, random = Math.random }) {
  // FlowEngine 只负责“题目流转与可见性”，不参与任何计分。
  // 核心职责：初始化题序、计算可见题、维护进度、约束作答顺序。
  const state = {
    shuffledQuestions: [],
    answers: {}
  };

  const buildInitialQueue = () => {
    const regularQuestions = shuffle(questionBank.regularQuestions, random);
    const { insertQuestionId, insertMode } = questionBank.flow;

    if (!insertQuestionId || insertMode === "none") {
      return regularQuestions;
    }

    const insertQuestion = questionBank.getQuestionById(insertQuestionId);
    if (!insertQuestion) {
      return regularQuestions;
    }

    // random_after_first:
    // 插入位置在 [1, regularQuestions.length]，不会成为开场第一题。
    if (insertMode === "random_after_first") {
      const insertIndex = Math.floor(random() * regularQuestions.length) + 1;
      return [
        ...regularQuestions.slice(0, insertIndex),
        insertQuestion,
        ...regularQuestions.slice(insertIndex)
      ];
    }

    return [...regularQuestions, insertQuestion];
  };

  const getVisibleQuestions = () => {
    const visible = [...state.shuffledQuestions];

    // 条件题规则：满足时插入，不满足时移除。
    // 这使得“门槛题决定是否出现下一题”的流程可配置化。
    (questionBank.flow.conditionalQuestions ?? []).forEach((rule) => {
      const question = questionBank.getQuestionById(rule.id);
      if (!question) {
        return;
      }

      const shouldShow = matchesCondition(state.answers, rule.when);
      const existingIndex = visible.findIndex((item) => item.id === question.id);

      if (!shouldShow) {
        if (existingIndex !== -1) {
          visible.splice(existingIndex, 1);
        }
        return;
      }

      if (existingIndex !== -1) {
        return;
      }

      const insertAfterIndex = visible.findIndex((item) => item.id === rule.insertAfter);
      if (insertAfterIndex === -1) {
        visible.push(question);
      } else {
        visible.splice(insertAfterIndex + 1, 0, question);
      }
    });

    return visible;
  };

  const cleanupInvisibleAnswers = () => {
    const visibleIds = new Set(getVisibleQuestions().map((question) => question.id));

    // 如果题目变成不可见，必须删除对应答案，避免污染后续判定。
    Object.keys(state.answers).forEach((questionId) => {
      if (!visibleIds.has(questionId)) {
        delete state.answers[questionId];
      }
    });
  };

  const getProgress = () => {
    const visible = getVisibleQuestions();
    const done = visible.filter((question) => state.answers[question.id] !== undefined).length;

    return {
      done,
      total: visible.length,
      complete: visible.length > 0 && done === visible.length
    };
  };

  const getCurrentQuestion = () => {
    return getVisibleQuestions().find((question) => state.answers[question.id] === undefined) ?? null;
  };

  return {
    start() {
      state.answers = {};
      state.shuffledQuestions = buildInitialQueue();
    },
    getVisibleQuestions,
    getCurrentQuestion,
    getProgress,
    getAnswers() {
      return { ...state.answers };
    },
    answerQuestion(questionId, value) {
      const current = getCurrentQuestion();

      // 顺序保护：只能回答“当前待答题”。
      if (!current || current.id !== questionId) {
        throw new Error("Question order mismatch.");
      }

      state.answers[questionId] = Number(value);
      cleanupInvisibleAnswers();

      return getProgress();
    }
  };
}
