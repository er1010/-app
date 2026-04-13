import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUNDLED_SBTI_SNAPSHOT } from "../sbti-cli/src/bundled-data.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data", "sbti");

await mkdir(dataDir, { recursive: true });

const {
  questions,
  specialQuestions,
  dimensionMeta,
  DIM_EXPLANATIONS,
  TYPE_LIBRARY,
  NORMAL_TYPES,
  dimensionOrder,
  DRUNK_TRIGGER_QUESTION_ID
} = BUNDLED_SBTI_SNAPSHOT;

const questionSet = {
  regularQuestions: questions,
  specialQuestions,
  flow: {
    insertQuestionId: "drink_gate_q1",
    insertMode: "random_after_first",
    conditionalQuestions: [
      {
        id: "drink_gate_q2",
        when: {
          questionId: "drink_gate_q1",
          equals: 3
        },
        insertAfter: "drink_gate_q1"
      }
    ]
  }
};

const dimensionSet = {
  dimensionMeta,
  dimensionOrder,
  explanations: DIM_EXPLANATIONS,
  levelMapping: {
    lowMax: 3,
    midEquals: 4,
    highMin: 5
  }
};

const typeSet = {
  typeLibrary: TYPE_LIBRARY,
  normalTypes: NORMAL_TYPES,
  vector: {
    groupSize: 3,
    levelToNumber: {
      L: 1,
      M: 2,
      H: 3
    }
  }
};

const ruleSet = {
  similarityDistanceDenominator: 30,
  fallbackSimilarityThreshold: 60,
  specialOverrides: [
    {
      type: "force_result",
      when: {
        questionId: DRUNK_TRIGGER_QUESTION_ID,
        equals: 2
      },
      resultCode: "DRUNK",
      keepBestNormalAsSecondary: true,
      badgeTemplate: "匹配度 100%",
      note: "隐藏人格已激活：酒精异常因子已接管，常规人格仅供参考。"
    }
  ],
  fallbackRule: {
    type: "min_similarity",
    threshold: 60,
    fallbackResultCode: "HHHH",
    badgeTemplate: "标准人格库最高匹配仅 {similarity}%",
    note: "系统强制兜底：标准人格库匹配偏低，已分配到 HHHH。"
  }
};

const themeSet = {
  id: "sbti",
  name: "SBTI",
  hero: {
    title: "MBTI已经过时，SBTI来了。",
    startButton: "开始测试",
    authorLine: "原作者：B站@蛆肉儿串儿"
  },
  hints: {
    answerGate: "全选完才会放行。世界已经够乱了，起码把题做完整。",
    hiddenDimension: "维度已隐藏",
    specialQuestion: "补充题",
    complete: "测试已完成",
    completeTip: "全部题目已答完，点击“提交并查看结果”。"
  },
  actions: {
    backHome: "返回首页",
    submit: "提交并查看结果",
    restart: "重新测试",
    resultHome: "回到首页",
    shareImage: "生成分享图"
  },
  resultText: {
    roleTitle: "你的主类型",
    defaultBadge: "匹配度 {similarity}%",
    defaultNote: "维度命中度较高，当前结果可视为你的第一人格画像。",
    simpleInterpretation: "该人格的简单解读",
    dimensions: "十五维度评分",
    tipTitle: "友情提示",
    tipContent: "本测试仅供娱乐，别拿它当诊断、面试、相亲、分手、招魂、算命或人生判决书。",
    authorTitle: "作者的话",
    authorParagraphs: [
      "本测试首发于b站up主蛆肉儿串儿（UID417038183），初衷是劝诫一位爱喝酒的朋友戒酒。",
      "关于这个测试，我没法很好的平衡娱乐和专业性，因此对于一些人格的阐释较为模糊或完全不准，如有冒犯非常抱歉。",
      "再鉴于时间精力有限，就随便搞了一个先这样玩玩，后续会慢慢完善修改的，总之好玩为主，还请不要用于盈利呀。"
    ],
    normalTopPrefix: "常规人格第一名"
  },
  assets: {
    imageManifestPath: "./sbti-cli/assets/type-images/manifest.json",
    imageBasePath: "./sbti-cli/assets/type-images/"
  }
};

const writeJson = async (fileName, payload) => {
  await writeFile(path.join(dataDir, fileName), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

await Promise.all([
  writeJson("question-set.json", questionSet),
  writeJson("dimension-set.json", dimensionSet),
  writeJson("type-set.json", typeSet),
  writeJson("rule-set.json", ruleSet),
  writeJson("theme-set.json", themeSet)
]);

console.log("JSON theme pack generated at data/sbti");
