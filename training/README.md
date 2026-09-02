# 模型训练

本目录包含两条可独立复现的训练链路：YOLO11n 钢材表面缺陷检测，以及 RandomForestRegressor 工艺质量回归。原始数据、训练输出和模型二进制均保留在 Git 忽略目录，公开仓库只保存代码、报告和校验信息。

## 工艺质量 RandomForest

### 环境

项目复用 `cv_tutorial` 环境。补充依赖如下：

```powershell
& "C:\Users\26702\.conda\envs\cv_tutorial\python.exe" -m pip install -r training\requirements-process-quality.txt
```

### 数据与泄漏控制

训练数据来自 Kaggle `Quality Prediction in a Mining Process`。脚本将 737453 条分钟级原始记录解析为 4097 条小时均值记录，使用 9 个工艺特征预测 `silica_concentrate_pct`，并排除后验质量字段 `iron_concentrate_pct`。训练、验证和测试按时间顺序采用 70%/15%/15% 切分，不随机打乱。

完整 CSV 默认位于：

```text
data/local/mining-quality-source/full-20260830/MiningProcess_Flotation_Plant_Database.csv
```

其 SHA-256 为 `ae0231a0bd2e14aac39cf978d81db6c71907a42aade19327816692c4e30cb956`。该文件不上传 GitHub；公开来源、许可和小型样例见根 README 与 `data/`。

### 训练与导出

```powershell
npm run process:train
```

也可以显式指定路径：

```powershell
& "C:\Users\26702\.conda\envs\cv_tutorial\python.exe" training\train_process_quality.py `
  --input data\local\mining-quality-source\full-20260830\MiningProcess_Flotation_Plant_Database.csv `
  --output-dir models\process-quality-rf `
  --report docs\process-quality-training-report.json `
  --hourly-output data\local\mining-quality-source\processed\process-quality-hourly.csv
```

脚本比较三组 RandomForest 参数，以验证集 MAE 选择模型，然后导出：

- `models/process-quality-rf/model.joblib`
- `models/process-quality-rf/model.onnx`
- `models/process-quality-rf/manifest.json`
- `docs/process-quality-training-report.json`

选中参数为 `n_estimators=200`、`max_depth=12`、`min_samples_leaf=4`。测试集 MAE `0.87194`、RMSE `1.11653`、R² `0.13100`，相对中位数基线 MAE 改善 `10.21%`。joblib 与 ONNX 已完成独立数值一致性检查。指标仅适用于公开数据的时间外推测试。

## YOLO11n 钢材缺陷检测

本项目直接复用现有 Conda 环境 `cv_tutorial`：Python 3.10.20、PyTorch 2.5.1 CUDA 12.1、Ultralytics 8.4.91。

### 数据准备

```powershell
& "C:\Users\26702\.conda\envs\cv_tutorial\python.exe" training\prepare_neu_det.py `
  --source data\local\neu-candidate-b\data\NEU-DET `
  --output data\local\NEU-DET-YOLO
```

整理后包含训练 1440 张、验证 180 张、测试 180 张，类别为 crazing、inclusion、patches、pitted_surface、rolled-in_scale 和 scratches。

### 正式训练

NEU-DET 原图为 200×200，因此使用 320 输入尺寸，避免无收益地放大到 640。

```powershell
& "C:\Users\26702\.conda\envs\cv_tutorial\python.exe" training\train_yolo11n.py `
  --epochs 100 --imgsz 320 --batch 32 --workers 4 --patience 20 `
  --name neu-det-yolo11n
```

最佳权重位于 `training/runs/neu-det-yolo11n/weights/best.pt`。

### 独立测试

```powershell
& "C:\Users\26702\.conda\envs\cv_tutorial\python.exe" training\evaluate_yolo11n.py `
  --weights training\runs\neu-det-yolo11n\weights\best.pt `
  --imgsz 320 --batch 32
```

### ONNX 导出

```powershell
& "C:\Users\26702\.conda\envs\cv_tutorial\python.exe" training\export_yolo11n.py `
  --weights training\runs\neu-det-yolo11n\weights\best.pt `
  --format onnx --imgsz 320
```

模型、训练数据和运行结果仅保留在本地，不上传 GitHub。
