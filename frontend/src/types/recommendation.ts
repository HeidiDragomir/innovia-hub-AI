export type Recommendation = {
    id: number;
    recommendation: {
        resourceName: string;
        date: string; // yyyy-MM-dd
        timeslot: "FM" | "EF";
    };
    reason: string;
    createdAt: string;
};
