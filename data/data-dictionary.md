# 数据字典

## 过程样例字段

| 字段 | 类型 | 单位 | 含义 | 清洗规则 |
| --- | --- | --- | --- | --- |
| `batch_id` | string | - | 生产批次编号 | 去除空格，不能为空 |
| `line` | string | - | 生产线 | 统一产线枚举 |
| `temperature` | number | °C | 过程温度 | 转数值，按 0-200 范围检查 |
| `pressure` | number | MPa | 过程压力 | 转数值，按 0-20 范围检查 |
| `speed` | number | m/min | 生产速度 | 转数值，按 0-300 范围检查 |
| `quality_label` | integer | 0/1 | 质量标签，1 表示异常 | 仅允许 0 或 1 |

## 图像特征字段

| 字段 | 类型 | 范围 | 含义 |
| --- | --- | --- | --- |
| `brightness` | number | 0-255 | 灰度平均亮度 |
| `contrast` | number | >= 0 | 灰度标准差 |
| `edgeDensity` | number | 0-1 | 边缘像素占比 |
| `sharpness` | number | 0-100 | 清晰度代理指标 |

## 记录与追溯

检测结果保存到 `data/inspections.json`，最多保留最近 50 条。`analyzedAt` 使用 ISO 8601 时间，`method` 记录当前算法适配器，便于报告中说明模型替换和实验复现。

## 工艺质量样例字段

| 字段 | 类型 | 单位 | 含义 | 模型使用说明 |
| --- | --- | --- | --- | --- |
| `sample_id` | string | - | 仓库样例行标识 | 用于追溯，不作为模型特征 |
| `timestamp` | string | ISO 8601 | 过程采样时间 | 按时间排序和划分数据 |
| `iron_feed_pct` | number | % | 铁矿给料含铁率 | 输入特征 |
| `silica_feed_pct` | number | % | 铁矿给料含硅率 | 输入特征 |
| `starch_flow` | number | 原始传感器单位 | 淀粉流量 | 输入特征 |
| `amina_flow` | number | 原始传感器单位 | 胺流量 | 输入特征 |
| `ore_pulp_flow` | number | 原始传感器单位 | 矿浆流量 | 输入特征 |
| `ore_pulp_ph` | number | - | 矿浆 pH | 输入特征 |
| `ore_pulp_density` | number | 原始传感器单位 | 矿浆密度 | 输入特征 |
| `flotation_air_flow_avg` | number | 原始传感器单位 | 浮选柱气流均值 | 输入特征 |
| `flotation_level_avg` | number | 原始传感器单位 | 浮选柱液位均值 | 输入特征 |
| `iron_concentrate_pct` | number | % | 精矿含铁率 | 基线默认排除，防止后验信息泄漏 |
| `silica_concentrate_pct` | number | % | 精矿含硅率 | 回归目标 |
