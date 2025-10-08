using backend.Models;

namespace backend.Services
{
    public interface IAIRecommendationService
    {
        Task<IEnumerable<AIRecommendation>> GetRecommendationsAsync(string userId);
    }
}
