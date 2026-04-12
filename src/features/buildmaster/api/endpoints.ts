import { api } from "./client";
import type {
    ToolInfo,
    Tool,
    BuildMasterInfo,
    CreateBmRequest,
    RunBmRequest,
    TrainingInjectRequest,
    DeployRecordRequest,
    AegisReadAll,
    Project,
    Team,
    Task,
    Run,
    RunEvent
} from "./types";

export async function health() {
    return api.get<{ ok: boolean; name: string; version: string }>("/health");
}

export async function listTools() {
    return api.get<{ tools: ToolInfo[] }>("/tools");
}

export async function createBm(body: CreateBmRequest) {
    return api.post<{ bmId: string; displayName: string }>("/bm/create", body);
}

export async function listBms() {
    return api.get<{ bms: BuildMasterInfo[] }>("/bm/list");
}

export async function runBm(body: RunBmRequest) {
    return api.post<{ output: { text: string } }>("/bm/run", body);
}

export async function trainingInject(body: TrainingInjectRequest) {
    return api.post<{ record: any }>("/depot/training", body);
}

export async function deployRecord(body: DeployRecordRequest) {
    return api.post<{ record: any }>("/depot/deploy", body);
}

export async function readAll() {
    return api.get<AegisReadAll>("/aegis/readall");
}

export async function getProjects() {
    return api.get<{ projects: Project[] }>("/api/projects");
}

export async function getTeams() {
    return api.get<{ teams: Team[] }>("/api/teams");
}

export async function getTasks() {
    return api.get<{ tasks: Task[] }>("/tasks/list");
}

export async function getTools() {
    return api.get<{ tools: Tool[] }>("/api/tools");
}

export async function getSkills() {
    return api.get<{ skills: any[] }>("/api/skills"); // Using any for simplicity in import chain if needed, or Skill
}

export async function getSkillsCatalog() {
    return api.get<{ catalog: any[] }>("/api/skills/catalog");
}

export async function installSkill(skillId: string) {
    return api.post<{ ok: boolean; message: string }>("/api/skills/install", { skillId });
}

export async function addCatalogSkill(data: any) {
    return api.post<{ ok: boolean; message: string }>("/api/skills/catalog", { data });
}

export async function editCatalogSkill(id: string, data: any) {
    return api.put<{ ok: boolean; message: string }>(`/api/skills/catalog/${id}`, { data });
}

export async function archiveCatalogSkill(id: string) {
    return api.post<{ ok: boolean; message: string }>(`/api/skills/catalog/${id}/archive`, {});
}

export async function createProject(body: { name: string; repo?: string; localPath?: string; defaultBranch?: string }) {
    return api.post<Project>("/projects/create", body);
}

export async function createTeam(body: { name: string; members: { bmId: string; role: string }[] }) {
    return api.post<Team>("/teams/create", body);
}

export async function createTask(body: { title: string; intent: string; constraints?: string[]; deliverables?: string[] }) {
    return api.post<Task>("/tasks/create", body);
}

export async function createRun(body: { projectId: string; teamId: string; taskId?: string; toolIds?: string[] }) {
    return api.post<{ runId: string, runUrl: string, status: string }>("/api/runs", body);
}

export async function getRuns() {
    return api.get<{ runs: Run[] }>("/api/runs");
}

export async function getRun(runId: string) {
    return api.get<Run>(`/api/runs/${runId}`);
}

export async function getRunEvents(runId: string, afterSeq?: number) {
    return api.get<{ events: RunEvent[] }>(`/api/runs/${runId}/events${afterSeq !== undefined ? `?afterSeq=${afterSeq}` : ''}`);
}

export async function haltRun(runId: string) {
    return api.post<Run>("/runs/halt", { runId });
}

export async function postToolCall(runId: string, body: { toolId: string; input: any; requestedBy?: string }) {
    return api.post<{ correlationId: string }>(`/api/runs/${runId}/toolcalls`, body);
}

export async function startAgent(runId: string, mode: "once" | "untilComplete" = "once") {
    return api.post<{ ok: boolean, agentSessionId: string }>(`/api/runs/${runId}/agent/start`, { mode, requestedBy: "user" });
}

export async function pauseAgent(runId: string, agentSessionId: string) {
    return api.post<{ ok: boolean }>(`/api/runs/${runId}/agent/pause`, { agentSessionId, requestedBy: "user" });
}

export async function resumeAgent(runId: string, agentSessionId: string) {
    return api.post<{ ok: boolean }>(`/api/runs/${runId}/agent/resume`, { agentSessionId, requestedBy: "user" });
}

export async function stopAgent(runId: string, agentSessionId: string) {
    return api.post<{ ok: boolean }>(`/api/runs/${runId}/agent/stop`, { agentSessionId, requestedBy: "user" });
}
