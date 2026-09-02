# 知识库、证据融合与处置推荐设计

## 目标

第 6.2 阶段把视觉检测和工艺质量预测的输出接入质量决策层，形成“证据可见、规则可追溯、建议需确认”的闭环。该模块服务于课程设计演示和接口联调，不直接控制生产设备。

## 知识库

知识条目保存在 `knowledge/entries.json`，当前包含 6 条教学规则，覆盖：

- 表面纹理异常候选处置；
- 图像采集质量复核；
- 工艺输入超训练分布复核；
- 精矿二氧化硅预测风险复核；
- 多源证据一致性复核；
- 低风险持续观察。

每条记录包含 `id`、标签、适用风险等级、证据等级、来源、适用边界、检查项、处置项和停止条件。来源字段明确标注为课程设计规则库或本项目模型卡，不伪装成企业 SOP 或外部权威标准。

检索接口：

```text
GET /api/knowledge?defectType=表面纹理异常&riskLevel=high
```

检索返回匹配分数和 `matchReasons`，不返回未命中的条目作为推荐依据。

## 证据融合

`algorithm/evidence-fusion.js` 将输入统一为证据数组：

| 来源 | 示例 | 作用 |
| --- | --- | --- |
| `vision` | 缺陷类型、置信度、视觉风险 | 反映图像侧候选异常 |
| `process` | 工艺风险、二氧化硅预测、范围告警 | 反映工艺模型侧异常或外推风险 |
| `history` | 最近记录中的中高风险 | 提供弱历史背景 |

视觉检测置信度和风险等级被转换为 0~1 的证据值，经过固定权重加权得到 `fusedScore`，再映射为低、中、高风险。该分数是课程演示用的决策指标，不是概率校准结果。响应同时返回每条证据的 `weight`、`strength`、`detail`、活动来源、来源是否一致和人工复核原因。

## 推荐接口

请求示例：

```json
{
  "context": { "batchId": "B-001", "line": "压延线 A" },
  "vision": {
    "risk": { "level": "high", "label": "高风险" },
    "detections": [{ "type": "表面纹理异常", "confidence": 0.91, "area": 40 }]
  },
  "processQuality": {
    "risk": { "level": "medium", "label": "中风险" },
    "prediction": { "value": 2.4, "unit": "%" },
    "inputRangeWarnings": [{ "label": "矿浆 pH" }]
  },
  "history": []
}
```

响应重点字段：

- `fusion.risk`、`fusion.fusedScore`、`fusion.confidence`：融合结果及其演示指标；
- `fusion.evidence`：带来源、权重和说明的证据清单；
- `fusion.reviewReasons`：触发人工复核的原因；
- `knowledge.matches`：实际命中的知识条目及匹配理由；
- `recommendations`：检查项、处置候选、停止条件、证据等级和来源；
- `fallback`：没有知识命中时为 `true`，并返回人工判断提示。

所有推荐的 `humanApprovalRequired` 都为 `true`。平台没有自动下发 PLC、MES 或设备控制指令；现场动作、批次隔离、参数调整和最终放行必须由授权人员确认并回写记录。

## 测试与边界

`test/knowledge-fusion.test.js` 和 `test/api.test.js` 覆盖知识检索、多源证据、来源不一致、范围告警、无证据安全返回、推荐来源和超长查询校验。当前规则库是教学基线，不代表企业工艺规程；后续如接入企业知识，应增加版本、责任人、生效时间、审批状态和失效时间字段。
