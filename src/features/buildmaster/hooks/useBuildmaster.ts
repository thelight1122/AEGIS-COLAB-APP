/* eslint-disable */
import { useState, useEffect, useCallback } from "react";
import * as api from "../api/endpoints";
import type { BuildMasterInfo, Project, Team, Task, Run, Tool } from "../api/types";

export function useBuildmaster() {
    const [bms, setBms] = useState<BuildMasterInfo[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [runs, setRuns] = useState<Run[]>([]);
    const [tools, setTools] = useState<Tool[]>([]);
    const [skills, setSkills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [bmsRes, projectsRes, teamsRes, tasksRes, runsRes, toolsRes, skillsRes] = await Promise.all([
                api.listBms().catch(() => ({ bms: [] })),
                api.getProjects().catch(() => ({ projects: [] })),
                api.getTeams().catch(() => ({ teams: [] })),
                api.getTasks().catch(() => ({ tasks: [] })),
                api.getRuns().catch(() => ({ runs: [] })),
                api.getTools().catch(() => ({ tools: [] })),
                api.getSkills().catch(() => ({ skills: [] }))
            ]);

            setBms(bmsRes.bms || []);
            setProjects(projectsRes.projects || []);
            setTeams(teamsRes.teams || []);
            setTasks(tasksRes.tasks || []);
            setRuns(runsRes.runs || []);
            setTools(toolsRes.tools || []);
            setSkills(skillsRes.skills || []);
        } catch (err: any) {
            setError(err.message || "Failed to load Buildmaster data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        bms,
        projects,
        teams,
        tasks,
        runs,
        tools,
        skills,
        loading,
        error,
        refresh: fetchData
    };
}
