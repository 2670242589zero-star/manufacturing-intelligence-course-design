# AI 交流记录

本目录保存课程设计过程中与 AI 工具的可审查交流摘要，作为过程考核和 AI 使用披露的一部分。记录使用 JSON，便于后续检索、统计和生成报告。

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
