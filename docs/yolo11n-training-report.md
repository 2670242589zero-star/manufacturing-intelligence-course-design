# YOLO11n 钢材表面缺陷训练记录

## 数据与划分

- 数据集：NEU-DET 钢材表面缺陷检测数据。
- 样本：1800 张图像，6 个缺陷类别。
- 划分：训练 1440、验证 180、独立测试 180。
- 标签：YOLO 检测框格式；扫描时无损坏样本，Ultralytics 自动移除了 3 个完全重复框。
- 数据仅用于本地课程实验，未上传或再分发。

## 环境与参数

- GPU：NVIDIA GeForce RTX 4060 Laptop GPU，8GB。
- Python：3.10.20。
- PyTorch：2.5.1，CUDA 12.1。
- Ultralytics：8.4.91。
- 模型：YOLO11n，使用官方预训练权重迁移学习。
- 输入：320×320；batch 32；100 epochs；AdamW；AMP；seed 42。
- 参数量：2,583,322；计算量约 6.3 GFLOPs。
- 训练耗时：约 0.264 小时。

## 结果

最佳权重在验证集上的总体结果：

| Precision | Recall | mAP50 | mAP50-95 |
| ---: | ---: | ---: | ---: |
| 0.685 | 0.764 | 0.765 | 0.451 |

保留测试集总体结果：

| Precision | Recall | mAP50 | mAP50-95 |
| ---: | ---: | ---: | ---: |
| 0.676 | 0.692 | 0.747 | 0.402 |

测试集分类表现显示 patches、pitted_surface、inclusion 和 scratches 较好，crazing 较弱。后续可通过补充 crazing 样本、检查框标注和针对细纹缺陷调整增强策略改进。

## 部署产物

- PyTorch：`models/yolo11n-neu-det/best.pt`。
- ONNX：`models/yolo11n-neu-det/best.onnx`，固定输入 320×320。
- ONNX Runtime 冒烟推理成功，在 patches 测试图像上输出 3 个检测框，最高置信度 0.833。

上述结果证明模型完成了真实训练和独立测试，但只代表 NEU-DET 数据分布，不能直接宣称达到生产现场部署精度。
