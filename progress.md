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
- `npm test` 已通过 17/17；最终 Git 检查、本地备份、提交和 GitHub 推送已完成。
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
## 2026-08-28：阶段 5.3 GitHub 发布确认

- 第三阶段主体提交为 `725dc13`，已推送至 `origin/main`。
- 推送后本地 `HEAD` 与 `origin/main` 均为 `725dc13d3d04c7d9a426d5b4eae1fc74e8992b8f`。
- GitHub 仓库主页与 `data/process-quality-sample.csv` 页面均返回 HTTP 200，公开样例链接可访问。
- 已将提示词记录更新为 `published` / `uploaded`，并完成阶段 5.3 与第三阶段自查勾选。

## 2026-08-29：阶段 6 启动

- 已确认阶段 6 目标为将浏览器原图接入本地 YOLO11n 推理链路，并保留无模型服务时的可解释规则降级模式。
- 已创建 _backups/step-09-yolo-inference/context-start-2026-08-29 起始检查点，备份当前服务端、算法适配器、前端、测试和规划文件。
- 计划新增本地 Python/Ultralytics /infer 服务，Node /api/inspect 通过 JSON imageData 转发原图，前端根据返回检测框绘制结果。
- 模型权重、原始 NEU-DET 数据和运行输出继续保留在 .gitignore 路径，不上传 GitHub。

## 2026-08-30：阶段 6 完成

- 已创建 `inference/yolo_service.py` 和启动文档，使用 OpenCV 解码图片并调用已训练的 YOLO11n 权重。
- 已扩展前端、Node `/api/inspect` 和推理适配器，使浏览器原图能够以受限 Base64 data URL 传递到本地模型服务。
- 已增加图片格式与大小校验、真实检测框绘制，并保留远程失败后的可解释规则降级模式。
- 已将 Ultralytics 配置目录默认重定向到项目内 `.ultralytics/`，解决受限环境无法读取用户配置目录的问题；该目录不上传 GitHub。
- 已增加 `/api/inspect` 图片转发与非法图片数据测试，并修复 Windows CRLF 检出时公开样例哈希测试不一致的问题。
- `npm test` 通过 19/19；Node、前端 JavaScript 和 Python 语法检查通过；`git diff --check` 通过。
- 已用 `crazing_271.jpg` 完成 Node 到 Python YOLO11n 的真实端到端联调：HTTP 201、质量分 39、中风险、2 个裂纹候选。
- 原始图片、模型权重、训练输出、Ultralytics 配置、测试日志和本地备份均未纳入公开提交。

## 2026-08-30：阶段 1-5 Prompt 追溯补齐

- 核对 `prompt/` 后确认阶段 1、2、4、5 缺少独立 JSON，阶段 3 的早期实施记录也仅存在于后续汇总中。
- 新增阶段 1-5 各自独立的 `reconstructed_summary`，依据用户要求、Git 提交、代码、测试、训练报告和本地备份线索重建。
- 每份记录明确声明不是逐字聊天导出，并列出证据、无法恢复的内容和阶段编号体系，避免把事后概括冒充原始会话。
- 更新 `prompt/README.md` 和自动化测试，使五份早期记录的阶段编号、重建类型、证据与限制字段可自动检查。

## 2026-08-30：阶段 1-5 Prompt 远端验收

- `npm test` 通过 19/19；8 个既有 prompt JSON 全部解析成功；凭据扫描与 `git diff --check` 通过。
- 一次 PowerShell JSON 汇总命令因空管道语法失败，随后改用 Node.js 逐文件解析完成替代验证，文件内容未受影响。
- 三次直接从 PowerShell 调用 `apply_patch` 因参数编码或换行失败，随后通过 Node.js 以 UTF-8 参数调用同一补丁工具完成编辑，文件内容未受影响。
- 通过 GitHub MCP 将五份阶段 1-5 独立重建记录、目录说明、三份既有阶段记录和自动化测试上传到 `main`。
- GitHub 提交为 `af8d5198c83ca9f2479c6917ef3ecd7e4e13cd4c`；已逐文件读取阶段 1-5 记录，确认远端存在且内容包含 `reconstructed_summary`、证据和限制声明。
- 新增 `prompt/2026-08-30-prompt-history-backfill.json`，记录本次修正过程，避免修复 Prompt 追溯问题的过程本身再次缺少记录。
