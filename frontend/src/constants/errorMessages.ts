export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "请先登录后再继续操作",
  RBAC_DENIED: "当前角色没有执行该动作的权限",
  VALIDATION_FAILED: "表单字段缺失或格式错误",
  RATE_LIMITED: "请求过于频繁，请稍后再试",
  MERGE_BATCH_DUPLICATED: "该离线批次已导入，重复导入不会产生新记录",
  MERGE_BATCH_INTERRUPTED: "合并已中断，原批次已保留，可随时续传未完成条款",
  MERGE_PAYLOAD_INVALID: "离线包格式错误，缺少 base 或 remote 数据",
  MERGE_CONFLICT_UNRESOLVED: "存在未裁决的字段冲突，请先处理冲突再完成合并"
};
