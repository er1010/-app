import { applyTemplate } from "./utils.js";

export function createResultEngine({ dimensionSet, typeSet, ruleSet, themeSet }) {
  const typeLibrary = typeSet.typeLibrary;
  const normalTypes = typeSet.normalTypes;
  const dimensionOrder = dimensionSet?.dimensionOrder ?? [];
  const levelToNumber = typeSet?.vector?.levelToNumber ?? { L: 1, M: 2, H: 3 };
  const matching = typeSet?.matching ?? { mode: "pattern", source: "vector" };

  const parsePattern = (pattern) =>
    String(pattern)
      .replace(/-/g, "")
      .split("")
      .map((letter) => levelToNumber[letter]);

  const getCandidateVector = (scoring) => {
    if (matching.source === "displayScores") {
      return dimensionOrder.map((dimensionId) => Number(scoring.displayScores?.[dimensionId] ?? 0));
    }

    if (matching.source === "rawScores") {
      return dimensionOrder.map((dimensionId) => Number(scoring.rawScores?.[dimensionId] ?? 0));
    }

    return scoring.vector ?? [];
  };

  const getTypeVector = (type) => {
    if (matching.mode === "dimension_scores") {
      return dimensionOrder.map((dimensionId) => Number(type.scores?.[dimensionId] ?? 0));
    }

    return parsePattern(type.pattern);
  };

  const rankNormalTypes = (scoring) => {
    const candidateVector = getCandidateVector(scoring);
    const similarityDistanceDenominator = Number(
      matching.similarityDistanceDenominator ?? ruleSet.similarityDistanceDenominator
    );

    return normalTypes
      .map((type) => {
        const typeVector = getTypeVector(type);
        const compareLength = Math.min(candidateVector.length, typeVector.length);
        let distance = 0;
        let exact = 0;

        for (let index = 0; index < compareLength; index += 1) {
          const diff = Math.abs(candidateVector[index] - typeVector[index]);
          distance += diff;
          if (diff === 0) {
            exact += 1;
          }
        }

        const similarity = Math.max(
          0,
          Math.round((1 - distance / similarityDistanceDenominator) * 100)
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
        if (left.distance !== right.distance) return left.distance - right.distance;
        if (right.exact !== left.exact) return right.exact - left.exact;
        return right.similarity - left.similarity;
      });
  };

  const shouldShowSecondaryType = (bestNormal, nextType) => {
    if (!nextType) {
      return false;
    }

    const secondaryRule = ruleSet.secondaryTypeRule;
    if (!secondaryRule) {
      return false;
    }

    if (secondaryRule.type === "always") {
      return true;
    }

    if (secondaryRule.type === "similarity_gap") {
      return bestNormal.similarity - nextType.similarity <= Number(secondaryRule.maxGap ?? 0);
    }

    if (secondaryRule.type === "distance_gap") {
      return nextType.distance - bestNormal.distance <= Number(secondaryRule.maxDistanceGap ?? 0);
    }

    return false;
  };

  const resolveResult = ({ answers, scoring }) => {
    const ranked = rankNormalTypes(scoring);
    const bestNormal = ranked[0];
    const nextType = ranked[1] ?? null;

    let finalType = bestNormal;
    let secondaryType = shouldShowSecondaryType(bestNormal, nextType) ? nextType : null;

    let badge = applyTemplate(themeSet.resultText.defaultBadge, {
      similarity: bestNormal.similarity
    });

    let note = themeSet.resultText.defaultNote;

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
      const fallbackRule = ruleSet.fallbackRule;
      const fallbackThreshold = Number(
        fallbackRule?.threshold ?? ruleSet.fallbackSimilarityThreshold
      );

      if (
        fallbackRule?.type === "min_similarity" &&
        Number(bestNormal.similarity) < fallbackThreshold
      ) {
        finalType = typeLibrary[fallbackRule.fallbackResultCode] ?? bestNormal;
        secondaryType = null;
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
