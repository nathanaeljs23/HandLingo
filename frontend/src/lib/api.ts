const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? res.statusText);
  }
  return res.json();
}

export type ProgressStatus = "locked" | "active" | "completed";

export interface SublevelInRoadmap {
  sublevel_id: string;
  sign_target: string;
  demo_media_url: string;
  required_reps: number;
  order_index: number;
  status: ProgressStatus;
}

export interface LevelInRoadmap {
  level_id: string;
  title: string;
  order_index: number;
  sublevels: SublevelInRoadmap[];
}

export interface RoadmapResponse {
  user_id: string;
  levels: LevelInRoadmap[];
}

export interface SentenceExample {
  isl: string[];
  english: string;
}

export interface SublevelSession {
  sublevel_id: string;
  sign_target: string;
  demo_media_url: string;
  required_reps: number;
  status: ProgressStatus;
  use_case: string | null;
  sentence_examples: SentenceExample[] | null;
  cultural_note: string | null;
  quiz_question: string | null;
  quiz_options: string[] | null;
  quiz_answer_index: number | null;
}

export interface ProgressUpdateResponse {
  completed_sublevel_id: string;
  next_sublevel_id: string | null;
  next_level_id: string | null;
  message: string;
  bonus_xp: number;
}

export const api = {
  getRoadmap: (token: string) =>
    request<RoadmapResponse>("/roadmap", token),

  getSublevel: (token: string, sublevelId: string) =>
    request<SublevelSession>(`/sublevel/${sublevelId}`, token),

  updateProgress: (
    token: string,
    sublevelId: string,
    repsCompleted: number,
    confidenceScore: number,
    quizCorrect?: boolean,
  ) =>
    request<ProgressUpdateResponse>("/progress/update", token, {
      method: "POST",
      body: JSON.stringify({
        sublevel_id: sublevelId,
        reps_completed: repsCompleted,
        confidence_score: confidenceScore,
        ...(quizCorrect !== undefined && { quiz_correct: quizCorrect }),
      }),
    }),
};
