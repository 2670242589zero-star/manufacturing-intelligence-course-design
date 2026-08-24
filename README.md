# 制造智能视觉质检与质量异常分析平台

这是《制造智能技术》课程设计的可运行 B/S Demo。系统面向离散制造质量控制场景，将浏览器端图像特征提取、缺陷候选检测、质量风险评分、过程参数分析、JSON 数据库存储和 Dashboard 串成一条可演示链路。

## 运行

```bash
npm test
npm start
```

启动后访问 `http://localhost:4173`。

## 系统结构

```text
智能视觉质检平台
  ├─ 图像预处理       Canvas metrics adapter / OpenCV-ready
  ├─ 缺陷检测模型     defect adapter / YOLO-ready
  ├─ 质量分析模型     quality scoring / classification-ready
  └─ 质量决策         风险分级、贡献因素、人工复核建议
                       ↓
                 JSON 数据库 + 可视化 Dashboard
```

当前 Demo 使用浏览器 Canvas 指标和可解释规则评分，接口已经按后续接入 OpenCV、YOLO 或 GPT-5.6sol 辅助分析预留边界。系统输出是“根因候选辅助分析”，不宣称自动确定因果关系。

## 目录

- `public/`：Dashboard、图像输入和检测历史
- `server.js`：Node 内置 HTTP 服务与 REST API
- `algorithm/`：视觉分析算法和模型适配接口
- `data/`：数据字典、样例过程数据和检测记录
- `test/`：算法单元测试与 API 集成测试
- `学习笔记.md`：AI 工具、Harness、模型、Git 原理、调研和过程记录
- `task_plan.md`、`findings.md`、`progress.md`：课程设计过程档案

## API

- `GET /api/health`：服务健康检查
- `GET /api/pipeline`：系统流水线和模型适配状态
- `GET /api/summary`：检测数量、平均质量分、风险分布和主要贡献因素
- `GET /api/dataset`：样例数据集说明和字段信息
- `GET /api/inspections`：检测历史
- `POST /api/inspect`：提交图像指标与过程参数，返回检测结果并入库

## 选题边界

本项目定位为“多源生产数据驱动的质量风险预测与根因候选辅助诊断”。诊断结果只表示当前数据范围内的关联性线索，最终处置需要质量工程师结合现场、工艺记录和复检结果确认。

