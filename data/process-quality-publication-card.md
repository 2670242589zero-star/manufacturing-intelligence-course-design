---
license: cc0-1.0
task_categories:
- tabular-regression
- anomaly-detection
language:
- zh
- en
tags:
- manufacturing
- quality-prediction
- process-data
- course-design
pretty_name: Manufacturing Quality Process Sample
size_categories:
- n<1K
configs:
- config_name: default
  data_files:
  - split: train
    path: process-quality-sample.csv
---

# Manufacturing Quality Process Sample

## 数据集简介

这是一个用于制造智能课程设计的 10 行工艺质量教学样例。数据来自公开的矿石浮选过程质量数据，经过字段筛选、格式规范化和聚合处理，用于演示表格回归、异常检测、接口联调和数据治理文档。

This is a 10-row educational process-quality sample for a manufacturing intelligence course project. It supports tabular regression, anomaly-detection demonstrations, API integration, and data-governance review.

## 原始来源与许可

- 原始数据集：[Quality Prediction in a Mining Process](https://www.kaggle.com/datasets/edumagalhaes/quality-prediction-in-a-mining-process)
- 原始数据许可：`CC0: Public Domain`（以 Kaggle 数据集元数据为准）
- 加工样例公开地址：[GitHub 中的 10 行 CSV](https://github.com/2670242589zero-star/manufacturing-intelligence-course-design/blob/main/data/process-quality-sample.csv)
- 课程设计代码仓库：[manufacturing-intelligence-course-design](https://github.com/2670242589zero-star/manufacturing-intelligence-course-design)

## 处理方法

1. 校验原始 24 列表头，抽取不含表头的第 `1-4,188-193` 行。
2. 将原始分号分隔和逗号小数格式转换为标准 CSV。
3. 将日期规范化为 UTC ISO 8601 时间字符串。
4. 选择工艺质量分析所需的代表性字段。
5. 将 7 列浮选柱气流和液位字段分别聚合为均值。
6. 增加确定性 `sample_id`，并生成包含输入/输出 SHA-256 的预处理索引。

复现命令：`npm run dataset:preprocess`。

## 预测任务

- 目标字段：`silica_concentrate_pct`
- 建议基线：`RandomForestRegressor`
- 异常检测基线：`IsolationForest`
- 泄漏控制：默认从基线特征中排除 `iron_concentrate_pct`

## 文件

- `process-quality-sample.csv`：10 行规范化样例数据。
- `process-quality-schema.json`：字段类型、单位和目标定义。
- `process-quality-index.json`：来源哈希、抽取行号、转换规则和输出统计。

## 使用限制

该数据集只是基于 CC0 原始公开数据加工的 10 行教学样例，不是完整训练集或企业生产数据。任何模型指标仅能说明公开数据分布上的实验结果，不能直接外推为生产现场性能；特征重要性也不等同于因果关系。
