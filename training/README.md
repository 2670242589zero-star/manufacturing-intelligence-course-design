# YOLO11n 训练

本项目直接复用现有 Conda 环境 `cv_tutorial`：Python 3.10.20、PyTorch 2.5.1 CUDA 12.1、Ultralytics 8.4.91。

## 数据准备

```powershell
& "C:\Users\26702\.conda\envs\cv_tutorial\python.exe" training\prepare_neu_det.py `
  --source data\local\neu-candidate-b\data\NEU-DET `
  --output data\local\NEU-DET-YOLO
```

整理后包含训练 1440 张、验证 180 张、测试 180 张，类别为 crazing、inclusion、patches、pitted_surface、rolled-in_scale 和 scratches。

## 正式训练

NEU-DET 原图为 200×200，因此使用 320 输入尺寸，避免无收益地放大到 640。

```powershell
& "C:\Users\26702\.conda\envs\cv_tutorial\python.exe" training\train_yolo11n.py `
  --epochs 100 --imgsz 320 --batch 32 --workers 4 --patience 20 `
  --name neu-det-yolo11n
```

最佳权重位于 `training/runs/neu-det-yolo11n/weights/best.pt`。

## 独立测试

```powershell
& "C:\Users\26702\.conda\envs\cv_tutorial\python.exe" training\evaluate_yolo11n.py `
  --weights training\runs\neu-det-yolo11n\weights\best.pt `
  --imgsz 320 --batch 32
```

## ONNX 导出

```powershell
& "C:\Users\26702\.conda\envs\cv_tutorial\python.exe" training\export_yolo11n.py `
  --weights training\runs\neu-det-yolo11n\weights\best.pt `
  --format onnx --imgsz 320
```

模型、训练数据和运行结果仅保留在本地，不上传 GitHub。
