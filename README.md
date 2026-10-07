# 隐私政策差异对比器

纯前端隐私政策版本对比与风险标注工具，用户粘贴两版文本后查看条款差异、风险标签和审阅清单，数据存 localStorage。支持法务出差离线审阅后的**离线变更合并**：字段级双向合并、正文变化触发差异重算与备注待复核、中断续跑与批次幂等。

## 快速启动

```bash
cp .env.example .env && docker compose up -d
```

## 访问地址或 CLI 示例

前端：<http://localhost:20112>

离线合并逻辑验证（无需浏览器，Node 直接跑）：

```bash
cd frontend && npm install
node_modules/.bin/esbuild scripts/verifyMerge.ts --bundle --platform=node --format=esm --outfile=/tmp/verifyMerge.mjs && node /tmp/verifyMerge.mjs
```

## 本地开发方式

- 前端：`cd frontend && npm install && npm run dev`

## 离线合并机制

入口页面：`/merge`（离线合并）。

1. **字段级双向合并**：离线数据包中每条记录携带 `field_changes`（字段、新值、修改时间），合并时逐字段与本地字段时间戳比较，晚者胜出；离线未改动的字段一律保留本地值，整行快照到达再晚也不会覆盖本地已改字段（`utils/fieldMerge.ts`）。
2. **正文变化级联**：条款 `content` 合并后发生变化时，关联 DiffResult 旧结论失效并按新旧正文重算（`utils/diffRecalc.ts`），关联 ReviewNote 保留 comment 原文、状态强制转为 `PENDING_RECHECK`（待复核）。
3. **断点续跑**：每个离线包对应一条 MergeBatch 批次记录，每合完一条条款即持久化 `merged_ids` 检查点；中断时批次状态置为 `INTERRUPTED` 保留，重试从检查点之后继续，只处理未合并条款。
4. **幂等**：批次号（`batch_no`）已完成的批次重复导入直接返回原报告；换批次号重复投递相同内容时，记录按 id 存在性判定 + 字段级合并天然幂等，不会多出记录。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Vite + Element Plus + Pinia + localStorage |
| 后端 | - |
| 数据库 | 本地模拟数据 |
| 部署 | Docker Compose |

## 项目目录结构

```text
frontend/src/api, stores, types, constants, constructors, components/common, hooks, pages, router, utils, mocks
frontend/scripts/verifyMerge.ts   # 离线合并逻辑验证脚本
```

## 环境变量说明

- `COMPOSE_PROJECT_NAME`: Compose 项目名，默认 `policy-diff`
- `FRONTEND_PORT`: 前端端口，默认 `20112`

## Docker 部署说明

- 根 Compose 文件不写 `version`，顶层 `name: policy-diff`。
- 容器名均使用 `${COMPOSE_PROJECT_NAME:-policy-diff}` 前缀。
- 数据库使用命名卷，避免绑定中文路径。
- 常见问题：端口占用时修改 `.env` 中端口后重启；需要重置数据时执行 `docker compose down -v`。

## 枚举/常量出现位置清单

- DiffType: constants/DiffType、types/DiffType、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- PrivacyRiskLevel: constants/PrivacyRiskLevel、types/PrivacyRiskLevel、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- ReviewStatus: constants/ReviewStatus、types/ReviewStatus、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用；`PENDING_RECHECK`（待复核）由 utils/mergeEngine 在条款正文变化时写入，MergePage 审阅备注表与 StatusBadge 展示。
- MergeBatchStatus: constants/MergeBatchStatus、types/MergeBatchStatus、constructors/MergeBatchConstructor、constants/statusText、utils/mergeEngine、components/common/MergeProgress、pages/MergePage、utils/formatters（formatMergeStatus）。
- MergeItemStatus: constants/MergeItemStatus、types/MergeItemStatus、types/MergeReport、constants/statusText、utils/mergeEngine（item_outcomes）。
- FieldSource: constants/FieldSource、types/FieldSource、constants/statusText、utils/fieldMerge、pages/MergePage、utils/formatters（formatFieldSource）。

## 为什么会牵一发动全身

实体字段、枚举、日志模板、错误消息、构造器、筛选器和展示组件被刻意拆散到多个目录；修改一个状态值通常需要同步类型、构造器、服务、控制器、store、页面、README 与数据库种子。本次新增 `PENDING_RECHECK` 即触达 types/constants 双枚举、statusText 聚合、logTemplates、mergeEngine、MergePage 与本 README。

## License

MIT
