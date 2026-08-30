# AI 交流记录

本目录保存课程设计过程中与 AI 工具的可审查交流摘要，作为过程考核和 AI 使用披露的一部分。记录使用 JSON，便于后续检索、统计和生成报告。

## 记录完整性

- `original_summary`：在对应阶段进行过程中保存的交流摘要。
- `reconstructed_summary`：因早期没有独立 JSON，在后续依据用户要求、Git 提交、代码、测试、报告和备份线索重建的摘要。

重建记录不是逐字聊天导出，不能补写无法由仓库证据支持的提示词、回复或工具调用。每份重建记录必须包含 `integrityNotice`、`evidence` 和 `limitations`，明确其来源和边界。

`stageSystem: task_plan implementation stages` 表示项目实施规划中的阶段编号；它与课程考核中“第三阶段数据提交”等阶段名称不是同一套编号。

## 文件命名

```text
YYYY-MM-DD-stage-NN-topic.json
```

一个阶段可以有多个记录文件，但每次阶段结束至少要有一个汇总记录。记录不保存 Token、密码、Cookie、企业敏感数据或未经授权的原始数据内容。

## 推荐字段

- `recordId`：唯一记录编号。
- `date`、`stage`：日期和课程设计阶段。
- `harness`、`model`：使用的 AI 工具编排环境和模型。
- `userRequest`：用户目标的简要转述。
- `context`：仓库、分支和相关提交。
- `actions`：本阶段执行的检查、实现和验证动作。
- `findings`：重要发现、限制和决策依据。
- `artifacts`：创建或修改的文件。
- `backup`、`upload`：本地备份和远程同步状态。
- `nextSteps`：下一阶段待办。

## 同步流程

每个阶段结束时按以下顺序执行：

1. 更新本阶段 JSON 记录和 `progress.md`。
2. 更新 `task_plan.md`、`findings.md` 中的状态或发现。
3. 创建 `_backups/step-XX-*` 本地快照。
4. 检查 Git 暂存内容，排除 `data/local/`、`models/`、`runs/`、训练权重和密钥。
5. 运行测试后提交并推送；若用户要求暂缓，则保留本地修改并明确记录未上传状态。

上下文压缩前优先保存当前阶段 JSON、`progress.md` 和 `task_plan.md`，保证恢复后能从磁盘继续。

## 当前记录

- `2026-08-24-stage-01-planning-reconstructed.json`：阶段 1 任务书分析、AI/Git 学习、选题和方案设计重建记录。
- `2026-08-24-stage-02-platform-scaffold-reconstructed.json`：阶段 2 B/S 平台骨架重建记录。
- `2026-08-24-stage-03-quality-pipeline-reconstructed.json`：阶段 3 质量流水线 API 和数据字典重建记录。
- `2026-08-24-stage-04-model-adapters-reconstructed.json`：阶段 4 模型适配器与数据导入重建记录。
- `2026-08-24-stage-05-yolo11n-training-reconstructed.json`：阶段 5 NEU-DET/YOLO11n 训练、评估和 ONNX 导出重建记录。
- `2026-08-26-stage-03-data-and-prompt.json`：第三阶段数据目录、样例、Schema 和 AI 交流记录初始化。
- `2026-08-28-stage-03-public-dataset.json`：公开来源引用、GitHub 加工样例发布、预处理、安全检查与同步记录。
- `2026-08-29-stage-06-yolo-inference.json`：阶段 6 YOLO11n 本地推理服务和真实图片链路记录。
