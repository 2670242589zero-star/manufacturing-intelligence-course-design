# 工作进度

## 2026-08-24

- 已完成任务书分析、选题确定、公开仓库和 B/S Demo。
- 已实现图像特征、质量评分、风险分级、数据存储、Dashboard 和模型适配接口。
- 已完成 NEU-DET 数据下载与检查：1800 张图像、6 类缺陷、图片与标签一一对应。
- 已整理训练/验证/测试集：1440/180/180。
- 已复用现有 `cv_tutorial` CUDA 环境完成 YOLO11n 100 轮迁移训练。
- 验证集：Precision 0.685、Recall 0.764、mAP50 0.765、mAP50-95 0.451。
- 独立测试集：Precision 0.676、Recall 0.692、mAP50 0.747、mAP50-95 0.402。
- 已导出 320×320 ONNX，结构校验和 ONNX Runtime 推理通过。
- 已创建本地模型卡、训练报告和 `_backups/step-05-yolo` 阶段备份。
- 按用户要求，本阶段未提交 Git，也未上传 GitHub。

## 2026-08-26

- 根据班级选题名单重新进行去重分析，确认原“视觉质检与质量异常分析”标题与多名同学存在场景或方法重合。
- 将项目题目调整为“面向制造质量异常的多源证据融合与知识增强处置推荐平台”。
- 创建 `选题说明.md`，明确与表面缺陷检测、预测性维护、RUL、工艺优化和生产调度题目的差异。
- 创建 `方案设计.md`，补充需求、系统架构、数据集、算法、知识库、前后端、计划和验收标准。
- 同步更新 README、task_plan 和本进度文件；本阶段只做本地备份，不提交、不推送。

## 下一阶段

- 下载并检查工艺参数质量数据集，完成时间聚合和数据泄漏检查。
- 训练 RandomForestRegressor 工艺参数质量模型，导出 joblib/ONNX 并验证一致性。
- 将本地 YOLO11n 权重封装为 `/infer` 模型服务并接入平台真实图片链路。
- 建立知识库、证据融合和处置推荐接口，补充真实推理截图、性能测试和课程设计报告。

## 2026-08-26：阶段 5.2 数据与交流记录

- 创建 `data/README.md`，明确公开样例、完整原始数据和模型产物的边界。
- 新增 `process-quality-sample.csv`、`process-quality-schema.json` 和 `process-quality-data-card.md`，为工艺参数回归与异常检测准备可公开、可审查的最小样例。
- 创建 `prompt/README.md` 和 `prompt/2026-08-26-stage-03-data-and-prompt.json`，记录任务书分析、选题去重、YOLO11n 训练、工艺参数模型规划以及本阶段文件变更。
- 扩展 `data/data-dictionary.md` 和 `data/dataset-sources.json`，同步登记工艺质量字段与公开数据源。
- 已确认本地 `quality-prediction.zip` 无法按标准 ZIP 展开；完整原始数据仍留在 `data/local/`，不作为公开仓库输入。
- JSON 文件解析、CSV 结构和样例源数据逐行对照均通过。
- `npm test` 通过 13/13；新增数据记录测试，并将数据源 API 断言从 3 个同步为 4 个。
- 已创建 `_backups/step-07-data-and-prompts` 本地快照，共 106 个文件，排除原始数据、模型权重和运行输出。
- Git 暂存路径与常见凭据模式检查通过，未包含原始数据、模型权重、运行输出或本地备份。
- 主阶段内容已提交为 `b56884c` 并推送至 `origin/main`。

## 已知边界

- 当前指标只代表 NEU-DET 数据分布，不代表生产现场精度。
- crazing 类别性能较弱，需要补充样本或调整增强策略。
- 根因分析仍为候选因素排序，不代表确定因果关系。

## 2026-08-28：阶段 5.3 第三阶段数据收口

- 已验证 `Quality Prediction in a Mining Process` 公开页面有效，许可为 `CC0: Public Domain`；NEU-DET、Severstal 和 DAGM 参考链接也可访问。
- 已实现 `scripts/preprocess-process-quality.js`，通过 `npm run dataset:preprocess` 从本地忽略的公开数据镜像确定性生成 10 行、13 列样例。
- 已生成 `data/process-quality-index.json`，记录原始 SHA-256、抽取行号 `1-4,188-193`、转换规则、输出 SHA-256、记录数和字段数。
- 已将加工样例准确表述为“基于 CC0 原始公开数据加工的 10 行教学样例”，公开地址指向 GitHub 仓库中的 CSV。
- 已补充根 README、`data/README.md`、两份数据卡、数据源登记和 `第三阶段自查.md`。
- 已更新 `prompt/2026-08-28-stage-03-public-dataset.json`，记录 Codex、GPT-5.6sol、预处理、来源、安全边界、备份和上传状态。
- 已新增预处理与索引一致性测试，并修复 API 测试失败时未关闭服务句柄的问题。
- `npm test` 已通过 17/17；最终 Git 检查、本地备份、提交和 GitHub 推送正在执行。
## 2026-08-28：阶段 5.3 收尾检查点

- 已创建 `_backups/step-08-public-dataset/context-checkpoint-2026-08-28`，备份 20 个关键文件，包含 `prompt/`、规划文档、数据说明、预处理脚本和测试。
- 已确认 `data/local/`、`models/`、`runs/`、`training/runs/` 和 `_backups/` 均被 `.gitignore` 排除，且未被 Git 跟踪。
- 本地命令运行器的默认沙箱刷新失败，已改用经批准的项目范围命令继续检查；一次凭据扫描因 PowerShell 正则引号解析失败，随后已改用分组模式并通过复查。

## 2026-08-28：阶段 5.3 最终验证

- `npm run dataset:preprocess` 成功，重新生成 10 行、13 列样例与预处理索引。
- 样例 SHA-256 为 `650bbc0bd169aab1cb6824ca2f91e8702fe53eac6e31cbed96c117ab4344e5bd`，与索引记录一致；原始公开数据镜像 SHA-256 为 `35fd3bea70843d59f14845a415ab7567744b4dbf75e6b9b64a9ad8a6293ca9cf`。
- `npm test` 通过 17/17；6 个公开 JSON 文件均可解析；未发现过期发布占位文本。
- 待提交范围内未发现超过 10 MB 的非忽略文件，也未发现常见私钥、GitHub Token、OpenAI Key 或 AWS Key 签名。

## 2026-08-28：阶段 5.3 最终本地备份

- 已创建 `_backups/step-08-public-dataset/final`，备份第三阶段 20 个关键文件；该目录受 `.gitignore` 保护，不上传 GitHub。
- 最终备份包含公开样例、索引与数据卡、预处理脚本、测试、提示词记录、规划文件和自查文件。
