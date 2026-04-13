import { applyTemplate } from "./utils.js";

export function createResultEngine({ typeSet, ruleSet, themeSet }) {
  const typeLibrary = typeSet.typeLibrary;
  const normalTypes = typeSet.normalTypes;
  const levelToNumber = typeSet?.vector?.levelToNumber ?? { L: 1, M: 2, H: 3 };

  const parsePattern = (pattern) => String(pattern).replace(/-/g, "").split("").map((letter) => levelToNumber[letter]);

  const rankNormalTypes = (vector) => {
    return normalTypes
      .map((type) => {
        const typeVector = parsePattern(type.pattern);
        let distance = 0;
        let exact = 0;

        // distance: 所有维度差值绝对值之和（越小越像）
        // exact: 差值为 0 的维度数量（越大越像）
        for (let index = 0; index < typeVector.length; index += 1) {
          const diff = Math.abs(vector[index] - typeVector[index]);
          distance += diff;
          if (diff === 0) {
            exact += 1;
          }
        }

        // 相似度标准化：
        // similarity = max(0, round((1 - distance / denominator) * 100))
        // denominator 由主题规则配置决定（SBTI=30，当前小学生=12）。
        const similarity = Math.max(
          0,
          Math.round((1 - distance / Number(ruleSet.similarityDistanceDenominator)) * 100)
        );

        return {
          ...type,
          ...typeLibrary[type.code],
          distance,
          exact,
          similarity
        };
      })
      .sort((left, right) => {
        // 排序优先级（从高到低）：
        // 1) distance 升序
        // 2) exact 降序
        // 3) similarity 降序
        if (left.distance !== right.distance) return left.distance - right.distance;
        if (right.exact !== left.exact) return right.exact - left.exact;
        return right.similarity - left.similarity;
      });
  };

  const resolveResult = ({ answers, scoring }) => {
    const ranked = rankNormalTypes(scoring.vector);
    const bestNormal = ranked[0];

    let finalType = bestNormal;
    let secondaryType = null;

    let badge = applyTemplate(themeSet.resultText.defaultBadge, {
      similarity: bestNormal.similarity
    });

    let note = themeSet.resultText.defaultNote;

    // 第一层：强制覆盖规则（例如 DRUNK / GAME+）
    // 满足条件时直接覆盖最终类型，可选保留常规第一名作为 secondaryType。
    const forcedRule = (ruleSet.specialOverrides ?? []).find((rule) => {
      if (rule.type !== "force_result") {
        return false;
      }
      return Number(answers[rule.when.questionId]) === Number(rule.when.equals);
    });

    if (forcedRule) {
      finalType = typeLibrary[forcedRule.resultCode] ?? bestNormal;
      if (forcedRule.keepBestNormalAsSecondary) {
        secondaryType = bestNormal;
      }
      badge = applyTemplate(forcedRule.badgeTemplate, {
        similarity: bestNormal.similarity
      });
      note = forcedRule.note;
    } else {
      // 第二层：兜底规则（相似度过低时切到 fallback 类型）
      const fallbackRule = ruleSet.fallbackRule;
      const fallbackThreshold = Number(
        fallbackRule?.threshold ?? ruleSet.fallbackSimilarityThreshold
      );

      if (
        fallbackRule?.type === "min_similarity" &&
        Number(bestNormal.similarity) < fallbackThreshold
      ) {
        finalType = typeLibrary[fallbackRule.fallbackResultCode] ?? bestNormal;
        badge = applyTemplate(fallbackRule.badgeTemplate, {
          similarity: bestNormal.similarity
        });
        note = fallbackRule.note;
      }
    }

    return {
      ranked,
      bestNormal,
      finalType,
      secondaryType,
      badge,
      note
    };
  };

  return {
    resolveResult
  };
}
