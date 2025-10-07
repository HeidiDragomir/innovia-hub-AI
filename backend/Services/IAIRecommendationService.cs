using backend.Models;

namespace backend.Services
{
    public interface IAIRecommendationService
    {
        Task<AIRecommendation> GetRecommendationAsync(string userId);
    }
}
