# 面向制造质量异常的多源证据融合与知识增强处置推荐平台

这是《制造智能技术》课程设计的可运行 B/S Demo。系统面向离散制造质量控制场景，将视觉检测结果、工艺参数质量预测、异常模式、质量知识和人工复核串成一条可追溯的处置推荐链路。

## 运行

```bash
npm test
npm run dataset:preprocess
npm start
```

启动后访问 `http://localhost:4173`。

## 系统结构

```text
智能视觉质检平台
  ├─ 图像预处理       Canvas metrics adapter / OpenCV-ready
  ├─ 缺陷检测模型     defect adapter / YOLO-ready
  ├─ 质量分析模型     quality scoring / classification-ready
  └─ 质量决策         风险分级、贡献因素、人工复核建议
                       ↓
                 JSON 数据库 + 可视化 Dashboard
```

当前 Demo 默认使用浏览器 Canvas 指标和可解释规则评分；阶段 6 新增 `inference/yolo_service.py`，配置本地服务后可将真实图片交给已训练的 YOLO11n 推理。工艺参数模型和 GPT-5.6sol 辅助摘要仍保留接口边界。系统输出是“异常证据与处置候选辅助分析”，不宣称自动确定因果关系。

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
- `algorithm/`：视觉分析算法和模型适配接口
- `inference/`：本地 YOLO11n 推理服务与启动说明
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
- `GET /api/summary`：检测数量、平均质量分、风险分布和主要贡献因素
- `GET /api/dataset`：样例数据集说明和字段信息
- `GET /api/inspections`：检测历史
- `POST /api/inspect`：提交图像指标与过程参数，返回检测结果并入库

## 选题边界

本项目定位为“多源生产数据驱动的质量异常解释与知识增强处置推荐”。推荐结果只表示当前数据范围内的候选措施，最终处置需要质量工程师结合现场、工艺记录和复检结果确认。
