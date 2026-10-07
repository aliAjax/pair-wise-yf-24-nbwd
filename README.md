# 隐私政策差异对比器

纯前端隐私政策版本对比与风险标注工具，用户粘贴两版文本后查看条款差异、风险标签和审阅清单，数据存 localStorage。

## 快速启动

```bash
cp .env.example .env && docker compose up -d
```

## 访问地址或 CLI 示例

前端：<http://localhost:20112>



## 本地开发方式

- 前端：`cd frontend && npm install && npm run dev`



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
```

离线合并相关文件：`utils/mergeEngine.ts`（三路字段级合并）、`utils/diffEngine.ts`（差异失效重算）、`utils/checksum.ts`（校验和幂等）、`utils/sampleScenario.ts`（示例场景）、`stores/OfflineMergeStore.ts`（批次/续传/冲突）、`api/OfflineMergeBatch.ts`、`api/MergeConflict.ts`、`components/common/MergeCenter.vue`。

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
- ReviewStatus: constants/ReviewStatus、types/ReviewStatus、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。新增 `PENDING_REVIEW`（待复核）值时，同步改动常量、类型、格式化器、状态文案、日志模板、错误消息、筛选器与展示组件。
- MergeBatchStatus: constants/MergeBatchStatus、types/OfflineMergeBatch、constructors、stores、components/common/MergeCenter、utils/formatters、constants/statusText 均有引用。
- ConflictResolution: constants/ConflictResolution、types/MergeConflict、constructors、stores、components/common/MergeCenter、utils/formatters、constants/statusText 均有引用。
- EntityType: constants/EntityType、types/OfflineMergeBatch、types/MergeConflict、utils/mergeEngine、utils/formatters、constants/statusText 均有引用。

## 离线合并（字段级合并 + 差异失效重算 + 断点续传）

法务同事出差时在笔记本上审政策，回到内网后把离线记录合并进本地数据。合并子系统位于「离线合并」页（`/merge`），核心能力：

1. **字段级合并（非整行覆盖）**：同一条款段落、对应差异结果和审阅备注可能两边各改一次。合并引擎（`utils/mergeEngine.ts`）采用三路合并（base 离线快照 / local 本地 / remote 离线包），逐字段按来源取数：仅本地改取本地、仅离线改取离线、两边都改且相同取该值、两边都改且不同则记录字段级冲突（默认取本地，供裁决）。
2. **差异失效重算**：条款正文变化后，旧差异结果失效，由 `utils/diffEngine.ts` 按新老正文重算 `diff_type` 与 `summary`；关联审阅备注保留原文、状态转为 `PENDING_REVIEW`（待复核）。
3. **断点续传与幂等**：批次（`OfflineMergeBatch`）持久化到 localStorage，逐条款处理并记录进度。中断后原批次保留，续传只处理未合完的条款（跳过已合并条款）；同一批次按 `checksum` 去重，重复导入不会多出记录。
4. **冲突裁决**：`MergeConflict` 记录冲突字段的基线值/本地值/离线值，可在合并中心裁决「保留本地」或「保留离线」，裁决结果回写到本地行。

关键文件：

| 职责 | 文件 |
|---|---|
| 三路字段级合并引擎 | `utils/mergeEngine.ts` |
| 差异重算引擎 | `utils/diffEngine.ts` |
| 离线包校验和 | `utils/checksum.ts` |
| 示例场景生成 | `utils/sampleScenario.ts` |
| 批次/冲突 store | `stores/OfflineMergeStore.ts` |
| 批次/冲突 API | `api/OfflineMergeBatch.ts`、`api/MergeConflict.ts` |
| 合并中心 UI | `components/common/MergeCenter.vue` |
| 合并页 | `pages/MergePage.vue` |

## 为什么会牵一发动全身

实体字段、枚举、日志模板、错误消息、构造器、筛选器和展示组件被刻意拆散到多个目录；修改一个状态值通常需要同步类型、构造器、服务、控制器、store、页面、README 与数据库种子。

## License

MIT
