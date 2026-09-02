# 面向制造质量异常的多源证据融合与知识增强处置推荐平台

这是《制造智能技术》课程设计的可运行 B/S Demo。系统面向离散制造质量控制场景，将视觉检测结果、工艺参数质量预测、异常模式、质量知识和人工复核串成一条可追溯的处置推荐链路。

## 运行

```bash
npm test
npm run dataset:preprocess
npm start
```

启动后访问 `http://localhost:4173`。

需要启用真实工艺参数模型时，先在一个 PowerShell 终端启动 Python 服务：

```powershell
npm run process:serve
```

再在另一个终端配置模型地址并启动平台：

```powershell
$env:PROCESS_QUALITY_MODEL_ENDPOINT = "http://127.0.0.1:8010"
npm start
```

模型二进制默认读取 `models/process-quality-rf/model.joblib`，该目录被 Git 忽略。完整训练与复现命令见 `training/README.md`，服务接口见 `inference/README.md`。

## 系统结构

```text
智能视觉质检平台
  ├─ 图像预处理       Canvas metrics adapter / OpenCV
  ├─ 缺陷检测模型     规则适配器 / YOLO11n
  ├─ 工艺质量模型     RandomForestRegressor / ONNX
  ├─ 质量分析模型     多源评分与证据排序
  └─ 质量决策         风险分级、证据融合、知识检索、处置推荐
                       ↓
                 JSON 数据库 + 可视化 Dashboard
```

视觉链路默认使用浏览器 Canvas 指标和可解释规则评分；配置 `inference/yolo_service.py` 后，可将真实图片交给本地训练的 YOLO11n 推理。工艺链路已经实现完整公开数据预处理、RandomForestRegressor 训练、joblib/ONNX 导出、Python 推理服务、Node 适配器和 Dashboard 交互。GPT-5.6sol 仅作为课程开发与知识增强方案中的 AI 工具披露，不冒充本地预测模型。系统输出是“异常证据与处置候选辅助分析”，不宣称自动确定因果关系。

工艺模型使用 737453 条原始记录按小时聚合为 4097 条样本，并按时间顺序切分为 2867/615/615。独立测试结果为 MAE `0.87194`、RMSE `1.11653`、R² `0.13100`，相对训练集目标中位数基线的 MAE 改善为 `10.21%`。该结果只证明课程基线和部署链路可复现，不代表生产现场高精度。

## 数据集与引用

项目只在 GitHub 中保存小型、可审查的样例和元数据。完整原始下载、NEU-DET 图片与标签、训练权重和运行输出均保留在本地忽略目录，不随代码仓库分发。

| 数据集 | 项目用途 | 来源与许可 |
| --- | --- | --- |
| [NEU Surface Defect Database](http://faculty.neu.edu.cn/songkechen/zh_CN/zdylm/263270/list/index.htm) | YOLO11n 钢材表面缺陷检测训练与验证 | 使用前核对来源页当前条款；本仓库不再分发原始图片和标签 |
| [Severstal: Steel Defect Detection](https://www.kaggle.com/c/severstal-steel-defect-detection) | 可选的钢材缺陷分割扩展 | Kaggle 账号、竞赛规则和数据条款适用 |
| [DAGM 2007 Competition Dataset](https://hci.iwr.uni-heidelberg.de/content/weakly-supervised-learning-industrial-optical-inspection) | 可选的工业表面异常检测实验 | 使用前核对来源页当前条款 |
| [Quality Prediction in a Mining Process](https://www.kaggle.com/datasets/edumagalhaes/quality-prediction-in-a-mining-process) | 工艺参数回归与异常检测基线 | Kaggle 元数据标注为 `CC0: Public Domain` |

[`data/process-quality-sample.csv`](https://github.com/2670242589zero-star/manufacturing-intelligence-course-design/blob/main/data/process-quality-sample.csv) 是基于上述矿石浮选公开数据加工的 10 行教学样例：统一时间、分隔符和小数格式，对 7 个浮选柱气流/液位字段分别取均值，并增加确定性的 `sample_id`。运行 `npm run dataset:preprocess` 可从本地忽略的公开数据镜像重新生成样例及 `data/process-quality-index.json`；索引记录原始 SHA-256、抽取行号 `1-4,188-193`、转换规则和输出 SHA-256。该样例仅用于接口联调、字段审查和方法演示，不能替代完整训练集，也不能据此宣称生产现场精度。

## 目录

- `public/`：Dashboard、图像输入和检测历史
- `server.js`：Node 内置 HTTP 服务与 REST API
- `algorithm/`：视觉分析算法、模型适配、知识检索和证据融合接口
- `knowledge/`：带来源、适用边界、检查项和处置项的本地规则知识库
- `training/`：YOLO11n 与工艺 RandomForest 模型的训练、评估和导出脚本
- `inference/`：本地 YOLO11n 与工艺质量模型推理服务及启动说明
- `docs/`：模型接入文档、训练报告和模型卡
- `data/`：公开样例、数据字典、数据卡、数据源元数据和检测记录；完整原始数据保留在被忽略的 `data/local/`
- `test/`：算法单元测试与 API 集成测试
- `学习笔记.md`：AI 工具、Harness、模型、Git 原理、调研和过程记录
- `选题说明.md`：与班级已有题目去重后的选题目标、技术方向和边界
- `方案设计.md`：需求、架构、数据集、算法、界面、计划和验收方案
- `task_plan.md`、`findings.md`、`progress.md`：课程设计过程档案
- `prompt/`：按阶段保存的 AI 交流摘要、工具/模型披露和上下文恢复记录

## API

- `GET /api/health`：服务健康检查
- `GET /api/pipeline`：系统流水线和模型适配状态
- `GET /api/model-status`：YOLO/视觉推理适配器状态
- `GET /api/process-quality/status`：工艺质量模型配置、在线状态和测试指标
- `GET /api/summary`：检测数量、平均质量分、风险分布和主要贡献因素
- `GET /api/dataset`：样例数据集说明和字段信息
- `GET /api/inspections`：检测历史
- `GET /api/knowledge`：按 `query`、`defectType`、`processSignal`、`riskLevel` 检索知识条目
- `POST /api/process-quality/predict`：提交 9 个泄漏控制后的工艺特征，返回二氧化硅预测、风险、范围告警和全局重要性
- `POST /api/inspect`：提交图像指标与过程参数，返回检测结果并入库
- `POST /api/recommendations`：提交视觉结果、工艺预测结果和可选历史记录，返回融合风险、证据清单、知识命中和人工确认的处置候选

### 6.2 知识库、证据融合与处置推荐

阶段 6.2 使用 `knowledge/entries.json` 作为可审计的轻量规则库。每条知识记录都包含 `source`、`scope`、`evidenceGrade`、检查动作、处置动作和停止条件，便于在课程设计答辩中追溯“为什么推荐”。`algorithm/knowledge-base.js` 采用标签与关键词匹配，`algorithm/evidence-fusion.js` 将视觉候选、视觉风险、工艺预测风险、训练范围告警和近期历史风险转成带来源及权重的证据列表，`algorithm/recommendation.js` 负责生成推荐。

推荐接口不会自动调用现场控制设备，也不会把特征重要性或规则匹配解释成确定根因。综合风险达到中风险及以上、证据不足、证据源不一致或存在分布外输入时，响应会设置 `humanReviewRequired=true` 并返回具体复核原因。没有知识命中时返回 `fallback=true` 和人工判断提示，不生成无来源的处置动作。

## 选题边界

本项目定位为“多源生产数据驱动的质量异常解释与知识增强处置推荐”。推荐结果只表示当前数据范围内的候选措施，最终处置需要质量工程师结合现场、工艺记录和复检结果确认。
