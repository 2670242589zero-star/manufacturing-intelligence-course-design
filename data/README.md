# 数据目录说明

本目录保存课程设计可复现所需的**小规模公开样例、字段说明和数据源元数据**。完整原始数据、下载包、图片、标注、训练权重和训练运行目录仅保存在本地 `data/local/`、`models/` 和 `training/runs/`，这些路径已加入 `.gitignore`，不随公开仓库提交。

## 文件

| 文件 | 用途 | 是否用于训练 |
| --- | --- | --- |
| `process-quality-sample.csv` | 从公开矿石浮选过程数据中抽取并规范化的演示样例 | 仅用于接口联调和示例，不代表完整训练集 |
| `process-quality-schema.json` | 过程质量样例的字段、类型、单位和目标定义 | 用于数据校验和文档生成 |
| `process-quality-index.json` | 原始文件哈希、抽取行号、转换规则和输出统计 | 用于复现和审计预处理结果 |
| `process-quality-data-card.md` | 来源、处理、划分、许可证和使用边界 | 用于报告和复现实验说明 |
| `process-quality-publication-card.md` | 加工样例的独立数据卡 | 用于 GitHub 引用，也可作为外部数据平台发布说明 |
| `sample-process-data.csv` | 平台早期的最小过程参数演示数据 | 用于 API 和 Dashboard 冒烟测试 |
| `data-dictionary.md` | 视觉、过程和追溯字段总字典 | 用于前后端字段对照 |
| `dataset-sources.json` | 外部公开数据集的元数据登记 | 用于下载和引用记录 |

## 数据边界

- `process-quality-sample.csv` 是脱敏、缩减后的公开数据样例，不应被解释为完整生产数据。
- `% Silica Concentrate` 是当前工艺参数回归任务的预测目标。
- `% Iron Concentrate` 与目标存在明显的后验质量关联，可能造成目标泄漏；基线模型默认排除该字段，只有在对照实验中才允许显式使用。
- 样例文件采用逗号分隔、小数点表示，便于 Node.js、Python 和常见表格工具直接读取。
- 模型指标仅描述公开数据分布，不能直接外推为现场精度；处置建议仍需人工复核。

## 来源与公开副本

- 原始公开数据：[Quality Prediction in a Mining Process](https://www.kaggle.com/datasets/edumagalhaes/quality-prediction-in-a-mining-process)，Kaggle 元数据许可为 `CC0: Public Domain`。
- 本仓库样例：`process-quality-sample.csv`，共 10 行，用于课程设计接口联调和字段说明。
- 加工样例公开副本：[GitHub 中的 10 行 CSV](https://github.com/2670242589zero-star/manufacturing-intelligence-course-design/blob/main/data/process-quality-sample.csv)。
- 公开仓库只包含 CSV 样例、JSON Schema、预处理索引和数据卡，不包含完整 Kaggle 下载包、NEU-DET 图片、模型权重或运行目录。

## 数据预处理

本地准备好 `data/local/mining-mirror-a/Book1.csv` 后运行：

```bash
npm run dataset:preprocess
```

脚本校验 24 列原始表头，抽取不含表头的第 `1-4,188-193` 行，将分号分隔与逗号小数转换为标准 CSV，将时间转换为 UTC ISO 8601，并计算 7 个浮选柱气流和液位的均值。生成结果为 `process-quality-sample.csv`，审计索引为 `process-quality-index.json`。

## 本地原始数据

完整数据下载残片、镜像文件以及 NEU-DET 图片/标签位于 `data/local/`。公开仓库只提交本目录中的可审查文本和小型样例，避免大文件、来源条款不明确的数据和敏感信息进入仓库。
