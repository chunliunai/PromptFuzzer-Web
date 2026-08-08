import { http } from './http'
import type {
  AgentList,
  AgentSession,
  ApplicationSurface,
  AttackCandidate,
  AttackUnit,
  CreateReconTaskPayload,
  CreateTaskPayload,
  PageResponse,
  ReconResult,
  ReconTask,
  ReconTrace,
  ScanResult,
  Task,
  WorkflowTrace,
} from './types'

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

export const resourceApi = {
  goals: () => http.get<string[]>('/goals').then(({ data }) => data),
  techniques: () => http.get<string[]>('/techniques').then(({ data }) => data),
}
