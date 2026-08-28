# 工艺质量样例数据卡

## 数据集定位

该样例服务于“面向制造质量异常的多源证据融合与知识增强处置推荐平台”的工艺参数分析链路，用来演示时间序列整理、质量回归、异常检测和 Dashboard 字段联调。它不是企业生产数据，也不是完整训练集。

## 来源与许可

- 原始数据集：[Quality Prediction in a Mining Process](https://www.kaggle.com/datasets/edumagalhaes/quality-prediction-in-a-mining-process)。
- 公开来源标识：`edumagalhaes/quality-prediction-in-a-mining-process`；Kaggle 元数据许可为 `CC0: Public Domain`。
- 本仓库提交内容：从公开镜像抽取的 10 行规范化文本样例，不包含完整下载包。
- 加工样例公开副本：[GitHub 中的 10 行 CSV](https://github.com/2670242589zero-star/manufacturing-intelligence-course-design/blob/main/data/process-quality-sample.csv)。
- 本项目只将样例用于课程设计演示、测试和方法说明；引用时应同时保留原始 Kaggle 来源链接与加工说明。

## 处理规则

1. 将原始分号分隔、逗号小数格式转换为标准逗号分隔和小数点格式。
2. 将日期字段规范化为 ISO 8601 时间字符串。
3. 原始镜像中的时间精度只到小时，同一小时内的记录保留相同时间，并增加 `sample_id` 作为仓库样例标识，不人为补造分钟或秒。
4. 保留与工艺参数质量预测相关的代表性字段，并将 7 个浮选柱气流/液位字段分别聚合为均值字段。
5. 完整实验应按时间排序后按 70%/15%/15% 划分训练、验证和测试集，不能随机打乱时间顺序。
6. 计划以 `% Silica Concentrate` 为回归目标，使用 RandomForestRegressor 建立可解释基线，并以 Isolation Forest 做异常检测基线。

可复现命令为 `npm run dataset:preprocess`。脚本默认抽取不含表头的第 `1-4,188-193` 行，并将原始文件与输出文件 SHA-256、字段数、记录数和转换规则写入 `process-quality-index.json`。

## 泄漏与解释边界

`% Iron Concentrate` 是质量结果相关字段，可能属于目标产生之后或同一质量检验环节的后验信息。为避免目标泄漏，基线模型默认不使用该列；它保留在样例中是为了展示数据卡和对照实验如何标记风险。特征重要性只能表示数据关联，不等于确定因果关系。

## 已知限制

- 公开样例只有 10 行，不能用于宣称模型泛化能力。
- 当前样例主要来自相邻时间段，类别覆盖和工况变化不足。
- 真实部署还需要设备量程、采样周期、缺失值机制、报警阈值和人工复核记录。
- 任何处置推荐都必须由质量工程师结合现场记录和复检结果确认。
