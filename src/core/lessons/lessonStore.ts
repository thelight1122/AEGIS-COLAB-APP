import type { LessonPlan } from './types';

const STORAGE_KEY = 'aegis_lesson_plans_v1';

export function loadLessonPlans(): LessonPlan[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

export function saveLessonPlan(plan: LessonPlan): void {
    const plans = loadLessonPlans();
    const existingIdx = plans.findIndex(p => p.id === plan.id);
    if (existingIdx >= 0) {
        plans[existingIdx] = plan;
    } else {
        plans.push(plan);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

export function getLessonPlan(id: string): LessonPlan | undefined {
    return loadLessonPlans().find(p => p.id === id);
}

export function deleteLessonPlan(id: string): void {
    const plans = loadLessonPlans().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

export function exportLessonPlan(id: string): string {
    const plan = getLessonPlan(id);
    if (!plan) throw new Error('Lesson plan not found.');
    return JSON.stringify(plan, null, 2);
}
