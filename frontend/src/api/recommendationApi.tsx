import type { Recommendation } from "@/types/recommendation.ts";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetchRecommendations = async (
    token: string
): Promise<Recommendation[]> => {
    const res = await fetch(`${BASE_URL}/api/ai/recommendations`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Couldn't get recommendations");
    return await res.json();
};
