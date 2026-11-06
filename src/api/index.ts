import { http } from './http'
import type {
  AgentList,
  AgentSession,
  ApplicationSurface,
  AttackCandidate,
  BrowserTargetProfile,
  BrowserTargetProfilePayload,
  AttackUnit,
  CreateReconTaskPayload,
  CreateTaskPayload,
  McpInspectorRunResult,
  McpInspectorSession,
  McpInspectorStartPayload,
  PageResponse,
  ReconResult,
  ReconTask,
  ReplayProfile,
  ReconTrace,
  ScanResult,
  Task,
  WorkflowTrace,
} from './types'

export const browserApi = {
  listTargets: () =>
    http.get<BrowserTargetProfile[]>('/browser/targets').then(({ data }) => data),
  getTarget: (targetType: string) =>
    http
      .get<BrowserTargetProfile>(`/browser/targets/${encodeURIComponent(targetType)}`)
      .then(({ data }) => data),
  saveTarget: (payload: BrowserTargetProfilePayload) =>
    http.post<BrowserTargetProfile>('/browser/targets', payload).then(({ data }) => data),
  startLogin: (payload: BrowserTargetProfilePayload) =>
    http
      .post<BrowserTargetProfile>('/browser/targets/login/start', payload)
      .then(({ data }) => data),
  signalAuthReady: (targetType: string) =>
    http
      .post<BrowserTargetProfile>(
        `/browser/targets/${encodeURIComponent(targetType)}/auth-ready`,
      )
      .then(({ data }) => data),
  clearAuth: (targetType: string) =>
    http
      .post<BrowserTargetProfile>(
        `/browser/targets/${encodeURIComponent(targetType)}/clear-auth`,
      )
      .then(({ data }) => data),
}

export const reconApi = {
  listTasks: () => http.get<ReconTask[]>('/recon-tasks').then(({ data }) => data),
  getTask: (id: number) =>
    http.get<ReconTask>(`/recon-tasks/${id}`).then(({ data }) => data),
  createTask: (payload: CreateReconTaskPayload) =>
    http.post<ReconTask>('/recon-tasks', payload).then(({ data }) => data),
    deleteTask: (id: number) => http.delete(`/recon-tasks/${id}`),
  getResult: (taskId: number) =>
    http.get<ReconResult>(`/recon-tasks/${taskId}/result`).then(({ data }) => data),
  getTraces: (taskId: number) =>
    http.get<ReconTrace[]>(`/recon-tasks/${taskId}/traces`).then(({ data }) => data),
  getReplayProfiles: (taskId: number) =>
    http
      .get<ReplayProfile[]>(`/recon-tasks/${taskId}/replay-profiles`)
      .then(({ data }) => data),
  getSurfaces: (resultId: number) =>
    http
      .get<ApplicationSurface[]>(`/recon-results/${resultId}/application-surfaces`)
      .then(({ data }) => data),
    deleteSurface: (resultId: number, surfaceId: number) =>
      http.delete(`/recon-results/${resultId}/application-surfaces/${surfaceId}`),
  signalAuthReady: () => http.post<string>('/browser/auth-ready').then(({ data }) => data),
}

export const bridgeApi = {
  listUnits: (resultId: number) =>
    http
      .get<AttackUnit[]>(`/recon-results/${resultId}/attack-units`)
      .then(({ data }) => data),
  generateUnits: (resultId: number, surfaceIds: number[]) =>
    http
      .post<AttackUnit[]>(`/recon-results/${resultId}/attack-units`, {
        surfaceIds,
        maxAttackUnits: 8,
      })
      .then(({ data }) => data),
    deleteUnit: (unitId: number) => http.delete(`/attack-units/${unitId}`),
  listCandidates: (resultId: number) =>
    http
      .get<AttackCandidate[]>(`/recon-results/${resultId}/attack-candidates`)
      .then(({ data }) => data),
  generateCandidates: (resultId: number, attackUnitIds: number[]) =>
    http
      .post<AttackCandidate[]>(`/recon-results/${resultId}/attack-candidates`, {
        attackUnitIds,
        maxAttackUnits: 8,
        candidateCountPerAttackUnit: 1,
      })
      .then(({ data }) => data),
  executeCandidate: (candidateId: number) =>
    http.post<Task>(`/attack-candidates/${candidateId}/execute`).then(({ data }) => data),
    deleteCandidate: (candidateId: number) =>
      http.delete(`/attack-candidates/${candidateId}`),
  updateCandidate: (
    candidateId: number,
    payload: {
      title?: string
      description?: string
      recommendedGoal?: string
      recommendedAttackMode?: string
      attackContext?: string
      requestBody?: string
      status?: string
    },
  ) =>
    http
      .patch<AttackCandidate>(`/attack-candidates/${candidateId}`, payload)
      .then(({ data }) => data),
}

export const taskApi = {
  list: () => http.get<Task[]>('/tasks').then(({ data }) => data),
  create: (payload: CreateTaskPayload) =>
    http.post<Task>('/tasks', payload).then(({ data }) => data),
    delete: (id: number) => http.delete(`/tasks/${id}`),
  get: (id: number) => http.get<Task>(`/tasks/${id}`).then(({ data }) => data),
  getResults: (id: number, page = 0, size = 20) =>
    http
      .get<PageResponse<ScanResult>>(`/tasks/${id}/results`, { params: { page, size } })
      .then(({ data }) => data),
  getReplayProfiles: (id: number) =>
    http.get<ReplayProfile[]>(`/tasks/${id}/replay-profiles`).then(({ data }) => data),
  getAgents: (id: number) =>
    http.get<AgentList>(`/tasks/${id}/agents`).then(({ data }) => data),
  getAgent: (taskId: number, sessionIndex: number) =>
    http
      .get<AgentSession>(`/tasks/${taskId}/agents/${sessionIndex}`)
      .then(({ data }) => data),
  getAgentTraces: (taskId: number, sessionIndex: number) =>
    http
      .get<WorkflowTrace[]>(`/tasks/${taskId}/agents/${sessionIndex}/traces`)
      .then(({ data }) => data),
}

export const mcpInspectorApi = {
  status: () =>
    http.get<McpInspectorSession>('/mcp-inspector/status').then(({ data }) => data),
  start: (payload: McpInspectorStartPayload) =>
    http.post<McpInspectorSession>('/mcp-inspector/start', payload).then(({ data }) => data),
  stop: () =>
    http.post<McpInspectorSession>('/mcp-inspector/stop').then(({ data }) => data),
  run: (payload: McpInspectorStartPayload) =>
    http
      .post<McpInspectorRunResult>('/mcp-inspector/run', payload, { timeout: 70_000 })
      .then(({ data }) => data),
}

export const resourceApi = {
  goals: () => http.get<string[]>('/goals').then(({ data }) => data),
  techniques: () => http.get<string[]>('/techniques').then(({ data }) => data),
}
