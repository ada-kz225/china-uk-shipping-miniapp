# 错误处理设计

> 技术错误、业务校验错误和业务 Exception 是三类不同事物。前两类不改变领域状态；只有可识别的业务事实才可创建 Exception。

## 1. Error taxonomy

| Type | Meaning | Entity state | User experience | Example |
| --- | --- | --- | --- | --- |
| Technical Error | 读写、网络、服务器或未知程序失败。 | 不变。 | 中文通用提示与重试；保留已加载内容。 | 详情加载超时。 |
| Business Validation Error | 用户请求不满足已冻结规则。 | 不变。 | 中文、具体的字段 / 动作提示。 | 已选择的包裹刚被其他转运单锁定。 |
| Business Exception | 包裹或转运单流程中存在可识别的阻断问题。 | 进入 `EXCEPTION`，或维持现有 Exception。 | 显示发生什么、影响、下一步、进展和支持。 | 包裹无法确认归属。 |

## 2. API Error Format

```json
{
  "error": {
    "code": "SHIPMENT_STATE_CONFLICT",
    "message": "当前状态已更新，请刷新后再试。",
    "fieldErrors": []
  },
  "meta": {
    "requestId": "req_xxx"
  }
}
```

| Field | Rule |
| --- | --- |
| `code` | 内部稳定码，供客户端判断与日志使用；不直接渲染。 |
| `message` | 已中文化、可面向用户显示。 |
| `fieldErrors` | 仅表单或对象级校验使用；每个 message 均为中文。 |
| `requestId` | 便于开发排查；不应包含敏感信息。 |

## 3. HTTP mapping

| HTTP | Internal category | User-side copy / action |
| --- | --- | --- |
| 400 | 请求格式或输入无效 | 请检查填写内容后再试。 |
| 401 | 会话无效 | 当前会话已失效，请重新进入小程序后再试。 |
| 403 / 404 | 无权或实体不可用 | 当前内容暂不可用。 |
| 409 | 重复、并发冲突或非法状态 | 当前状态已更新，请刷新后再试。 |
| 422 | 业务校验不通过 | 显示具体中文字段或包裹原因。 |
| 429 | 开发期简单限流 | 操作过于频繁，请稍后再试。 |
| 500 | 未处理服务端错误 | 服务暂时不可用，请稍后重试。 |
| 503 | 依赖或 Mock adapter 暂不可用 | 暂时无法完成操作，请稍后重试。 |

## 4. Core scenarios

| Scenario | Category | Server action | Client action |
| --- | --- | --- | --- |
| 预报运单重复 | Business Validation | 返回既有 Package 摘要；不新增。 | 提示“该运单号已预报，无需重复提交。” |
| 提交时 Package 变为不可选 | Business Validation | 回滚整笔提交；返回具体 Package 原因。 | 保留草稿、提示返回调整。 |
| 提交请求结果未知 | Technical / network | 服务端以 idempotency key 查结果。 | 禁止盲目重建；刷新草稿 / 列表。 |
| 付款 Mock 失败 | Business result | Payment 标记失败；Shipment 回到待付款。 | 显示“付款未成功，请重新尝试。” |
| Payment 结果未知 | Business result | Payment 标记未知；Shipment 回到待付款。 | 显示“暂未确认付款结果，请稍后刷新后再试。” |
| 出库不满足条件 | Business Validation | 拒绝 Ops command；不改 Shipment。 | 用户端保持“已付款，等待仓库发出”。 |
| Tracking 读取失败 | Technical Error | 不创建 Exception。 | 保留已知时间线并显示“加载运输进度失败，请重试。” |
| 包裹无法匹配 | Business Exception | 创建 Package Exception、写 resume state。 | 在包裹详情显示五段异常信息。 |
| 英国末端问题 | Business Exception | 创建 Shipment Exception、阻断后续阶段。 | 在转运单详情优先显示异常信息。 |

## 5. Retry and Refresh

- GET 请求可由用户点击“重试”、下拉刷新或小程序回到前台重新发起；
- POST 请求必须携带 idempotency key；网络失败后先查询实体 / 以相同 key 重试，不新建 key；
- 客户端不通过刷新自动推进 Mock 事件；
- Loading 时保留结构和已知事实，不能用空状态或“需要处理”替代；
- 付款、提交等进行中按钮必须禁用，避免重复操作。

## 6. Error-to-copy Guard

Error middleware 和 DTO presenter 负责：

1. 记录服务器原始错误与 request ID；
2. 过滤 SQL、堆栈、第三方原始响应和英文内部状态；
3. 选择对应中文通用提示或业务提示；
4. 只将安全字段返回给小程序；
5. 使 Technical Error 永远不触发 ExceptionService。

## 7. Acceptance Checks

- [ ] 技术读取失败不会把任何 Package / Shipment 标记为“需要处理”；
- [ ] 业务校验错误说明哪一步不能继续，但不暴露内部码；
- [ ] Exception 一定关联具体实体并含五段中文内容；
- [ ] 付款失败后没有出库时间、离仓事件或运输时间线；
- [ ] 所有错误、Toast、Modal 与表单提示均为中文。

