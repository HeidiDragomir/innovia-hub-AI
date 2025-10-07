namespace backend.Models
{
    public class AIRecommendation
    {
        public int Id { get; set; }
        public string Recommendation { get; set; } = string.Empty;

        public string Reason { get; set; } = string.Empty;
    }
}
