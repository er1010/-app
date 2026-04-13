import { chunk } from "./utils.js";

export function createScoringEngine({ dimensionSet, typeSet }) {
  const {
    dimensionOrder,
    levelMapping
  } = dimensionSet;

  const levelToNumber = typeSet?.vector?.levelToNumber ?? { L: 1, M: 2, H: 3 };
  const groupSize = Number(typeSet?.vector?.groupSize ?? 3);

  // 维度原始分 -> L/M/H 的统一分档规则。
  // 例如 SBTI 常见 2 题/维，单题 1~3 分，则每维总分范围是 2~6。
  // lowMax=3, midEquals=4, highMin=5 对应：
  // 2~3 => L，4 => M，5~6 => H。
  const scoreToLevel = (score) => {
    if (score <= Number(levelMapping.lowMax)) return "L";
    if (score === Number(levelMapping.midEquals)) return "M";
    return "H";
  };

  return {
    levelToNumber,
    score(answers, regularQuestions) {
      const rawScores = {};
      const levels = {};

      // 1) 初始化所有维度分数。
      dimensionOrder.forEach((dimensionId) => {
        rawScores[dimensionId] = 0;
      });

      // 2) 仅常规题参与维度累计分。
      // 条件/隐藏题由 ResultEngine 做特殊覆盖，不进入这里的维度分。
      regularQuestions.forEach((question) => {
        rawScores[question.dim] += Number(answers[question.id] || 0);
      });

      // 3) 将每个维度的原始分转成 L/M/H。
      dimensionOrder.forEach((dimensionId) => {
        levels[dimensionId] = scoreToLevel(rawScores[dimensionId]);
      });

      // 4) 生成用于匹配的“数值向量”和“可读模式串”。
      // vector 例：[3,2,1,...]
      // pattern 例：HHM-LML-...
      const vector = dimensionOrder.map((dimensionId) => levelToNumber[levels[dimensionId]]);
      const pattern = chunk(dimensionOrder.map((dimensionId) => levels[dimensionId]), groupSize)
        .map((group) => group.join(""))
        .join("-");

      return {
        rawScores,
        levels,
        vector,
        pattern
      };
    }
  };
}
