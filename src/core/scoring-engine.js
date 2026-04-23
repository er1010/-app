import { chunk } from "./utils.js";

export function createScoringEngine({ dimensionSet, typeSet }) {
  const { dimensionOrder, levelMapping, scoreScale } = dimensionSet;

  const levelToNumber = typeSet?.vector?.levelToNumber ?? { L: 1, M: 2, H: 3 };
  const groupSize = Number(typeSet?.vector?.groupSize ?? 3);
  const hasScoreScale = Boolean(scoreScale);

  const scoreToLevel = (score) => {
    if (score <= Number(levelMapping.lowMax)) return "L";
    if (levelMapping.midMax !== undefined && score <= Number(levelMapping.midMax)) return "M";
    if (levelMapping.midEquals !== undefined && score === Number(levelMapping.midEquals)) return "M";
    return "H";
  };

  const buildRangeMap = (regularQuestions) => {
    const rangeMap = {};

    dimensionOrder.forEach((dimensionId) => {
      rangeMap[dimensionId] = { min: 0, max: 0 };
    });

    regularQuestions.forEach((question) => {
      const optionValues = (question.options ?? []).map((option) => Number(option.value));
      const min = optionValues.length ? Math.min(...optionValues) : 0;
      const max = optionValues.length ? Math.max(...optionValues) : 0;

      rangeMap[question.dim].min += min;
      rangeMap[question.dim].max += max;
    });

    return rangeMap;
  };

  const scaleScore = (score, fromMin, fromMax) => {
    const targetMin = Number(scoreScale?.targetMin ?? 0);
    const targetMax = Number(scoreScale?.targetMax ?? 0);

    if (fromMax <= fromMin) {
      return targetMin;
    }

    const normalized =
      ((Number(score) - Number(fromMin)) / (Number(fromMax) - Number(fromMin))) *
        (targetMax - targetMin) +
      targetMin;

    return Math.round(normalized);
  };

  return {
    levelToNumber,
    score(answers, regularQuestions) {
      const rawScores = {};
      const normalizedScores = {};
      const levels = {};
      const rangeMap = buildRangeMap(regularQuestions);

      dimensionOrder.forEach((dimensionId) => {
        rawScores[dimensionId] = 0;
      });

      regularQuestions.forEach((question) => {
        rawScores[question.dim] += Number(answers[question.id] || 0);
      });

      dimensionOrder.forEach((dimensionId) => {
        if (hasScoreScale) {
          const range = rangeMap[dimensionId] ?? { min: 0, max: 0 };
          normalizedScores[dimensionId] = scaleScore(rawScores[dimensionId], range.min, range.max);
        }

        const scoreForLevel =
          scoreScale?.levelSource === "normalized"
            ? normalizedScores[dimensionId]
            : rawScores[dimensionId];

        levels[dimensionId] = scoreToLevel(scoreForLevel);
      });

      const vector = dimensionOrder.map((dimensionId) => levelToNumber[levels[dimensionId]]);
      const pattern = chunk(dimensionOrder.map((dimensionId) => levels[dimensionId]), groupSize)
        .map((group) => group.join(""))
        .join("-");

      return {
        rawScores,
        normalizedScores,
        displayScores: hasScoreScale ? normalizedScores : rawScores,
        scoreRange: {
          min: hasScoreScale ? Number(scoreScale?.targetMin ?? 0) : null,
          max: hasScoreScale ? Number(scoreScale?.targetMax ?? 0) : null
        },
        levels,
        vector,
        pattern
      };
    }
  };
}
