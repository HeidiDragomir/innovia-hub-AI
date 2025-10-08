namespace backend.Models
{
    public class AIRecommendation
    {
        public int Id { get; set; }

        public string UserId { get; set; } = string.Empty;

        public RecommendationDetail Recommendation { get; set; } = new();

        public string Reason { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class RecommendationDetail
    {
        public string ResourceName { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;   // yyyy-MM-dd
        public string Timeslot { get; set; } = string.Empty; // "FM" or "EF"
    }
}
