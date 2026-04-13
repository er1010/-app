# 计分与评判标准详解

更新时间：2026-04-12

本文对应代码实现，解释“如何从作答到最终类型结果”。

## 1. 相关实现文件

- 流程引擎：`src/core/flow-engine.js`
- 计分引擎：`src/core/scoring-engine.js`
- 结果引擎：`src/core/result-engine.js`
- 页面编排：`src/main.js`
- 主题规则（SBTI）：`data/sbti/rule-set.json`
- 主题规则（当前小学生类型）：`data/primary-student/rule-set.json`

## 2. 全链路概览

1. 用户按题序作答（FlowEngine）。
2. 仅常规题进入维度累计（ScoringEngine）。
3. 维度总分映射为 L/M/H。
4. L/M/H 再转数值向量（L=1, M=2, H=3）。
5. 与所有常规模板做距离计算并排序（ResultEngine）。
6. 先应用“强制覆盖规则”，再应用“兜底规则”。
7. 输出最终类型 + 匹配度 + 解释文案。

## 3. 题目流程与可见性（FlowEngine）

### 3.1 初始题序

- 常规题先随机打散。
- 若配置了 `insertQuestionId` 且 `insertMode = random_after_first`：
  - 特殊门槛题会随机插入到第 2 题及以后位置（不会成为第 1 题）。

### 3.2 条件题显示规则

- 读取 `conditionalQuestions`：
  - `when.questionId` 的作答值等于 `when.equals` 时，显示该题。
  - 否则隐藏该题。
- 若题目被隐藏，会同步删除该题答案，防止影响后续判定。

## 4. 维度计分规则（ScoringEngine）

### 4.1 原始分累计

- 只统计 `regularQuestions`（常规题）。
- 每题把 `value` 加到所属维度 `question.dim`。

### 4.2 分档（L/M/H）

按 `dimension-set.json -> levelMapping`：

- `score <= lowMax` => `L`
- `score == midEquals` => `M`
- 其他 => `H`

当前两个主题都使用：

- `lowMax = 3`
- `midEquals = 4`
- `highMin = 5`（语义字段，代码以 else 处理）

### 4.3 向量与模式串

- 字母转数值：`L=1, M=2, H=3`
- `vector`：按 `dimensionOrder` 生成，如 `[3,2,1,...]`
- `pattern`：按 `groupSize` 分组拼接，如 `HHM-LML-...`

## 5. 模板匹配与排序（ResultEngine）

### 5.1 距离与命中数

对每个常规模板：

- `diff_i = abs(userVector_i - typeVector_i)`
- `distance = sum(diff_i)`
- `exact = count(diff_i == 0)`

### 5.2 相似度计算

```text
similarity = max(0, round((1 - distance / denominator) * 100))
```

其中 `denominator = ruleSet.similarityDistanceDenominator`。

### 5.3 排序优先级

1. `distance` 升序（越小越相似）
2. `exact` 降序（完全命中维度越多越优）
3. `similarity` 降序

排序第一名记为 `bestNormal`。

## 6. 最终评判规则（覆盖与兜底）

### 6.1 强制覆盖（最高优先级）

遍历 `specialOverrides`，当满足条件时：

- `finalType = resultCode`
- 可选保留 `secondaryType = bestNormal`
- 徽章与备注使用覆盖规则模板

### 6.2 兜底规则（仅在未触发强制覆盖时）

若 `fallbackRule.type = min_similarity` 且：

- `bestNormal.similarity < threshold`

则使用 `fallbackResultCode` 作为最终类型。

> 代码优先取 `fallbackRule.threshold`，若缺失则回退到 `fallbackSimilarityThreshold`（兼容字段）。

## 7. 两个主题的参数差异

### 7.1 SBTI 主题

- `denominator = 30`
- 强制覆盖：`drink_gate_q2 == 2 => DRUNK`
- 兜底阈值：`60`
- 兜底类型：`HHHH`

### 7.2 当前小学生类型（模拟）

- `denominator = 12`
- 强制覆盖：`game_gate_q2 == 2 => GAME+`
- 兜底阈值：`58`
- 兜底类型：`WILD`

## 8. 页面层如何调用

在 `src/main.js` 的 `submitResult()`：

1. `flowEngine.getAnswers()` 取当前有效答案。
2. `scoringEngine.score(...)` 计算维度结果。
3. `resultEngine.resolveResult(...)` 得到最终类型。
4. 渲染结果页（类型、匹配度、维度解释等）。

## 9. 读源码建议顺序

1. `src/core/flow-engine.js`（先理解题目可见性）
2. `src/core/scoring-engine.js`（再理解维度分档）
3. `src/core/result-engine.js`（最后看匹配/覆盖/兜底）
4. `src/main.js`（看页面如何串联引擎）
