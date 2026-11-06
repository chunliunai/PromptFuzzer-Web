import type {
  BrowserTargetConfig,
  BrowserTargetProfile,
} from '../api/types'

export const agentDeskSelectors = {
  input: 'div[contenteditable="true"][translate="no"]',
  submit: 'button[aria-label="发送"]',
  responseArea: '[data-slot="message-scroller-content"]',
  assistantMessage:
    '[data-slot="message"][data-align="start"] [data-slot="bubble-content"]',
  newChat: '',
}

const AGENT_DESK_PRESALES_CHANNEL =
  '72b02ac7c39444a78e0e75dd317bdea3'
const AGENT_DESK_AFTERSALES_CHANNEL =
  '51fca45d1c22418eb402801a56b62139'

export function agentDeskTargetType(chatUrl: string): string {
  if (chatUrl.includes(AGENT_DESK_PRESALES_CHANNEL)) {
    return 'agentdesk-presales-profile'
  }
  if (chatUrl.includes(AGENT_DESK_AFTERSALES_CHANNEL)) {
    return 'agentdesk-aftersales-profile'
  }
  return 'agentdesk-profile'
}

function parseMap(value?: string): Record<string, string> | undefined {
  if (!value) return undefined
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, string>)
      : undefined
  } catch {
    return undefined
  }
}

export function configFromBrowserProfile(
  profile: BrowserTargetProfile,
): BrowserTargetConfig {
  return {
    chatUrl: profile.chatUrl || '',
    targetType: profile.targetType,
    waitTimeoutMs: profile.waitTimeoutMs || 45_000,
    selectors: parseMap(profile.selectorsJson),
    login: parseMap(profile.loginJson),
    loginCheck: parseMap(profile.loginCheckJson),
  }
}
