using backend.Models;

namespace backend.Repositories
{
    public interface IAiRepository
    {
        Task<AIRecommendation> Create(AIRecommendation recommendation);

        Task<IEnumerable<AIRecommendation>> GetByUserId(string userId);
    }
}
