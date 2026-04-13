# SBTI 仿制版（模块化可复用）

该项目已按 PRD 重构为“文件级引擎 + JSON 数据驱动”：

- 还原 SBTI 首页/答题/结果流程
- 还原饮酒隐藏分支、DRUNK 覆盖、HHHH 兜底
- 将题库、维度、人格、规则拆为独立 JSON
- 新增结果分享图导出（PNG 下载）

## 目录结构

- `index.html`：页面入口
- `app.css`：样式
- `src/main.js`：渲染与交互编排
- `src/core/question-bank.js`
- `src/core/flow-engine.js`
- `src/core/scoring-engine.js`
- `src/core/result-engine.js`
- `src/core/share-image.js`
- `src/theme-loader.js`
- `data/sbti/question-set.json`
- `data/sbti/dimension-set.json`
- `data/sbti/type-set.json`
- `data/sbti/rule-set.json`
- `data/sbti/theme-set.json`
- `data/primary-student/question-set.json`
- `data/primary-student/dimension-set.json`
- `data/primary-student/type-set.json`
- `data/primary-student/rule-set.json`
- `data/primary-student/theme-set.json`

## 本地运行

```powershell
python -m http.server 5173
```

浏览器打开：

`http://localhost:5173/`

主题切换（通过 URL 参数）：

- `http://localhost:5173/?theme=sbti`
- `http://localhost:5173/?theme=primary-student`
- `http://localhost:5173/?theme=当前小学生类型`（中文别名）

## JSON 数据生成脚本

如果需要从 `sbti-cli` 快照重新生成 JSON 主题包：

```powershell
node tools/build-theme-json.mjs
```
