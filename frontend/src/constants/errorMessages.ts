export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "请先登录后再继续操作",
  RBAC_DENIED: "当前角色没有执行该动作的权限",
  VALIDATION_FAILED: "表单字段缺失或格式错误",
  RATE_LIMITED: "请求过于频繁，请稍后再试",
  MERGE_INVALID_PAYLOAD: "离线数据包缺少批次号或条款数据，无法合并",
  MERGE_ABORTED: "合并被中断，批次进度已保留，可重试续跑",
  MERGE_STORAGE_FULL: "本地存储空间不足，合并结果无法持久化"
};
