# 本地 YOLO11n 推理服务

本目录提供课程设计平台的真实图片推理服务。服务复用本地已经训练完成的 YOLO11n 权重，使用 OpenCV 解码图片和计算基础指标，再由 Ultralytics 完成目标检测。模型权重、原始 NEU-DET 图片和推理输出均不提交到 GitHub。

## 启动

在项目根目录执行：

```powershell
& "C:\Users\26702\.conda\envs\cv_tutorial\python.exe" inference\yolo_service.py `
  --model models\yolo11n-neu-det\best.pt `
  --host 127.0.0.1 --port 8000
```

服务默认将 Ultralytics 配置写入项目内的 `.ultralytics/`，该目录已被 Git 忽略，避免依赖用户目录权限。

如模型位于训练运行目录，可改为：

```powershell
& "C:\Users\26702\.conda\envs\cv_tutorial\python.exe" inference\yolo_service.py `
  --model training\runs\neu-det-yolo11n\weights\best.pt
```

另开终端启动 Node 平台：

```powershell
$env:VISION_MODEL_ENDPOINT = "http://127.0.0.1:8000"
$env:VISION_MODEL_FALLBACK = "true"
npm start
```

打开 `http://localhost:4173` 后选择图片并提交，Node 会将图片 data URL 转发到 `/infer`。推理服务不可用或返回异常时，平台会回退到 Canvas 指标和可解释规则评分。

## 接口

`POST /infer` 接收：

```json
{
  "imageData": "data:image/png;base64,...",
  "imageMetrics": {},
  "process": {"temperature": 68, "pressure": 3.8, "speed": 42},
  "context": {"batchId": "B-001", "line": "压延线 A", "imageName": "sample.png"}
}
```

服务返回 `qualityScore`、`risk`、`detections`、`contributors`、`summary`、`method` 和 `analyzedAt`。检测框统一归一化到前端 240×200 预览坐标，前端可以直接绘制。

## 参数

- `YOLO_MODEL_PATH`：默认模型路径。
- `YOLO_DEVICE`：默认 `0`；没有 CUDA 时设置为 `cpu`。
- `YOLO_IMAGE_SIZE`：默认 `320`，与 NEU-DET 训练设置一致。
- `YOLO_CONFIDENCE`、`YOLO_IOU`：检测阈值，默认分别为 `0.25` 和 `0.45`。
