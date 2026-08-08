const goalLabels: Record<string, string> = {
  command_execution: '命令执行',
  ssrf: '服务端请求伪造',
  prompt_leak: '系统提示词泄露',
  model_info: '模型信息泄露',
  fake_confirmation: '虚假确认',
  credential_leak: '凭证泄露',
  protected_value_extraction: '受保护值提取',
  context_leak: '上下文泄露',
  prohibited_content: '违规内容生成',
  authorization_bypass: '授权绕过',
  user_data_leak: '用户数据泄露',
}

const techniqueLabels: Record<string, string> = {
  token_exploit: 'Token 特性利用',
  misdirection: '误导与转移',
  tool_intent: '工具调用意图诱导',
  emotional: '情感操纵',
  role_play: '角色扮演',
  acrostic_embedding: '首字母嵌入',
  none: '直接请求',
  encoding: '编码混淆',
  output_control: '输出格式控制',
  separator: '分隔符绕过',
  rule_fabrication: '规则伪造',
}

export function goalLabel(id: string) {
  return goalLabels[id] ? `${goalLabels[id]}（${id}）` : id
}

export function techniqueLabel(id: string) {
  return techniqueLabels[id] ? `${techniqueLabels[id]}（${id}）` : id
}
