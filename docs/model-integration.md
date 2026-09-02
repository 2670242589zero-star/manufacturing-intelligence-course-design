# OpenCV / YOLO 模型接入说明

## 当前模式

默认模式不依赖外部服务，使用浏览器 Canvas 提取的亮度、对比度、边缘密度和清晰度，以及后端可解释评分算法。该模式用于课程演示、接口联调和离线测试，不能表述为已完成 YOLO 训练。

## 外部模型模式

设置以下环境变量后，Node 服务将调用外部推理服务：

```powershell
$env:VISION_MODEL_ENDPOINT = "http://127.0.0.1:8000"
$env:VISION_MODEL_TIMEOUT_MS = "5000"
$env:VISION_MODEL_FALLBACK = "true"
npm start
```

外部服务需要提供 `POST /infer`。输入为：

```json
{
  "imageData": "data:image/png;base64,...",
  "imageMetrics": { "brightness": 58, "contrast": 22, "edgeDensity": 0.1, "sharpness": 84 },
  "process": { "temperature": 68, "pressure": 3.8, "speed": 42 },
  "context": { "batchId": "B-001", "line": "压延线 A", "imageName": "sample.png" }
}
```

输出至少包含 `qualityScore` 和 `risk`，推荐同时返回 `detections`、`contributors`、`summary`、`method` 和 `analyzedAt`。本项目的本地实现位于 `inference/yolo_service.py`，启动方式和响应示例见 [`inference/README.md`](../inference/README.md)。OpenCV 负责预处理时，可在该服务中完成灰度化、去噪和边缘增强；YOLO 负责输出缺陷类别、置信度、面积与检测框；质量分析模型将视觉结果与工艺参数融合。

## 降级与披露

`VISION_MODEL_FALLBACK=true` 时，远程服务超时或返回格式错误会降级到本地算法。`GET /api/model-status` 会返回 `lastRequest.degraded=true` 和错误摘要，报告与演示必须如实说明实际使用的适配器。

## 工艺质量模型接入

阶段 6.1 新增 RandomForestRegressor 工艺质量回归服务。模型使用 9 个工艺特征预测 `silica_concentrate_pct`，默认排除 `iron_concentrate_pct`，避免把后验质量结果作为可部署输入。

启动 Python 服务后配置 Node：

```powershell
$env:PROCESS_QUALITY_MODEL_ENDPOINT = "http://127.0.0.1:8010"
$env:PROCESS_QUALITY_MODEL_TIMEOUT_MS = "5000"
npm start
```

平台通过 `GET /api/process-quality/status` 查询模型状态，通过 `POST /api/process-quality/predict` 转发 9 特征请求。模型服务不可用时返回 `503 process_model_unavailable`；与视觉链路不同，工艺预测不做规则假结果降级。

响应包含：

- 预测的精矿二氧化硅百分比和相对风险等级；
- 超出训练集最小值/最大值的输入告警；
- RandomForest 全局特征重要性前五项；
- 模型 ID、推理方法和分析时间。

风险阈值来自训练目标的 `q50/q80/q95` 分位数，只用于课程演示分级。特征重要性表示预测关联，不构成已确认的工艺因果关系。
## 数据导入

公开数据源登记在 `data/dataset-sources.json`。下载并确认数据条款后，可执行：

```powershell
npm run dataset:import -- --source F:\datasets\NEU-DET --dataset neu-surface-defect
```

导入工具只扫描图片并生成本地清单，不复制或提交原始数据。`data/local/` 已被 Git 忽略，避免误传大文件、受限数据或企业敏感信息。
