export type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface ReconTask {
  id: number
  name: string
  scanMode: 'BROWSER' | 'HTTP_TEMPLATE'
  reconContext?: string
  status: TaskStatus
  errorMessage?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface BrowserTargetConfig {
  chatUrl: string
  selectors?: Record<string, string>
  login?: Record<string, string>
  loginCheck?: Record<string, string>
  waitTimeoutMs?: number
  targetType?: string
}

export type BrowserAuthState =
  | 'UNKNOWN'
  | 'WAITING_LOGIN'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'EXPIRED'
  | 'FAILED'

export interface BrowserTargetProfile {
  id: number
  targetType: string
  displayName?: string
  chatUrl?: string
  selectorsJson?: string
  loginJson?: string
  loginCheckJson?: string
  waitTimeoutMs?: number
  profilePath?: string
  authState: BrowserAuthState
  lastVerifiedAt?: string
  lastLoginAt?: string
  lastFailureReason?: string
  createdAt?: string
  updatedAt?: string
}

export interface BrowserTargetProfilePayload {
  targetType?: string
  displayName?: string
  targetConfig: BrowserTargetConfig
}

export interface CreateReconTaskPayload {
  name: string
  scanMode: 'BROWSER' | 'HTTP_TEMPLATE'
  reconContext?: string
  externalIntelligence?: string
  targetConfig?: BrowserTargetConfig
  rawRequestTemplate?: string
  reconConfig?: {
    openDiscoveryEnabled: boolean
    maxOpenDiscoveryMessages: number
    maxDiscoveryMessages: number
    maxGapFollowups: number
    maxCapabilityVerifications: number
    cleanBetweenVerifications: boolean
  }
}

export interface ReconResult {
  id: number
  reconTaskId: number
  targetFingerprint?: string
  businessProfile?: string
  responseProfile?: string
  capabilityInventory?: string
  openDiscovery?: string
  coveragePlan?: string
  coverageMatrix?: string
  capabilityFacts?: string
  toolInventory?: string
  unresolvedCapabilities?: string
  supportingEvidence?: string
  unresolvedQuestions?: string
  surfaceQualityIssues?: string
  targetIntelligenceMemory?: string
  qualityStatus: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface ReconTrace {
  id: number
  reconTaskId: number
  actionType: string
  targetChatIndex?: number
  turnIndex?: number
  requestMessage?: string
  rawResponse?: string
  extractedText?: string
  observation?: string
  evidenceType?: string
  status: string
  errorMessage?: string
  durationMs?: number
  createdAt: string
}

export interface ApplicationSurface {
  id: number
  reconResultId: number
  parentSurfaceId?: number
  capabilityKey?: string
  surfaceLevel: 'DOMAIN' | 'CAPABILITY'
selectable?: boolean
  title: string
  displayDescription?: string
  description?: string
  surfaceType?: string
  relatedTool?: string
  supportedActions?: string[]
  resourceScope?: string
  resourceObjects?: string[]
  entrypoints?: string[]
  permissionBoundaries?: string[]
  controlBoundaries?: string[]
  evidenceSource?: string
  verificationStatus?: string
  sourceTraceIds?: number[]
  sourceType: string
  userEdited: boolean
  createdAt: string
  updatedAt: string
}

export interface AttackUnit {
  id: number
  reconResultId: number
  generationId: string
  unitKey: string
  title: string
  description?: string
  primarySurfaceIds: number[]
  supportingSurfaceIds: number[]
  negativeBoundarySurfaceIds: number[]
  resourceBoundary?: string
  securityControls: string[]
  riskDimensions: string[]
  aggregationReason?: string
  riskLevel?: string
  confidence?: string
  sourceSurfaces: unknown
  createdByAi: boolean
  createdAt: string
  updatedAt: string
}

export interface AttackCandidate {
  id: number
  reconResultId: number
  attackUnitId?: number
  surfaceIds: number[]
  title: string
  description?: string
  recommendedGoal: string
  recommendedAttackMode: string
  rationale?: string
  attackContext?: string
  requestBody: Record<string, unknown>
  status: string
  taskId?: number
  createdByAi: boolean
  userEdited: boolean
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: number
  name: string
  scanMode: string
  status: TaskStatus
  totalCount: number
  successCount: number
  failCount: number
  uncertainCount: number
  reportSummary?: string
  attackMode: string
  maxTurns?: number
  reconResultId?: number
  supplementalRecon?: boolean
  selectedSurfaceIds: number[]
  agentCount?: number
  agentSuccessCount?: number
  agentBlockedCount?: number
  createdAt: string
  updatedAt: string
}

export interface CreateTaskPayload {
  name: string
  scanMode: 'BROWSER' | 'HTTP_TEMPLATE'
  rawRequestTemplate?: string
  promptFieldPath?: string
  attackContext?: string
  externalIntelligence?: string
  reconResultId?: number
  supplementalRecon?: boolean
  selectedSurfaceIds?: number[]
  goalIds: string[]
  techniqueIds: string[]
  generateCount: number
  attackMode: 'AGENT' | 'DUAL' | 'SINGLE_TURN'
  maxTurns: number
  retryCount: number
  targetConfig?: BrowserTargetConfig
}

export interface AgentSession {
  id: number
  taskId: number
  sessionIndex: number
  goal: string
  availableTechniques?: string[]
  maxTurns: number
  currentTurn: number
  retryCount: number
  currentRetry: number
  status: string
  finalVerdict?: string
  finalEvidence?: string
  winningTurn?: number
  winningTechnique?: string
  winningMessage?: string
  targetIntelligenceMemory?: string
  buildMemory?: string
  attackSignals?: string
  reconCompleted?: boolean
  turns?: AgentTurn[]
  createdAt: string
}

export interface AgentTurn {
  turn: number
  phase: string
  action?: string
  technique?: string
  analysis?: string
  message?: string
  extractedText?: string
  verdict?: string
  evidence?: string
}

export interface AgentList {
  taskId: number
  totalAgents: number
  successCount: number
  agents: AgentSession[]
}

export interface WorkflowTrace {
  id: number
  taskId: number
  agentSessionId: number
  sessionIndex: number
  nodeName: string
  status: string
  phase?: string
  retryIndex?: number
  turnIndex?: number
  targetChatIndex?: number
  inputSnapshot?: string
  outputSnapshot?: string
  verdict?: string
  evidence?: string
  errorMessage?: string
  durationMs?: number
  createdAt: string
}

export interface ScanResult {
  id: number
  taskId: number
  goal?: string
  technique?: string
  verdict?: string
  evidence?: string
  extractedTextPreview?: string
  extractedTextLength?: number
  responseTime?: number
  requestBodyPreview?: string
  requestBodyLength?: number
  responseBodyPreview?: string
  responseBodyLength?: number
  executionChannel?: string
  replayProfileId?: number
  replayProfileClassification?: string
  statusCode?: number
  contentType?: string
  targetChatIndex?: number
}

export interface ReplayProfile {
  id: number
  taskId: number
  agentSessionId?: number
  sessionIndex?: number
  turnIndex?: number
  targetChatIndex?: number
  targetType?: string
  endpointFingerprint?: string
  classification: string
  method?: string
  url?: string
  requestTemplate?: string
  payloadFieldPath?: string
  dynamicBindings?: string
  responseExtractionRule?: string
  validationCount?: number
  lastValidatedAt?: string
  failureCount?: number
  lastFailureReason?: string
  evidenceSummary?: string
  createdAt: string
  updatedAt: string
}

export interface PageResponse<T> {
  total: number
  page: number
  size: number
  items: T[]
}

export interface McpInspectorStartPayload {
  variant: 'vulnerable' | 'fixed'
  transport: 'http' | 'sse'
  serverUrl: string
}

export interface McpInspectorSession {
  running: boolean
  variant?: 'vulnerable' | 'fixed'
  version?: string
  transport?: string
  serverUrl?: string
  port?: number
  uiUrl?: string
  token?: string
  launchCommand?: string
  logTail?: string[]
  error?: string
}

export interface McpInspectorRunResult {
  variant: 'vulnerable' | 'fixed'
  version: string
  transport: string
  serverUrl: string
  command: string
  exitCode: number | null
  timedOut: boolean
  durationMs: number
  output: string
}
