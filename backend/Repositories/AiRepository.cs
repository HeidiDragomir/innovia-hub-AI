using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories
{
    public class AiRepository : IAiRepository
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AiRepository> _logger;

        public AiRepository(ApplicationDbContext context, ILogger<AiRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<AIRecommendation> Create(AIRecommendation recommendation)
        {

            if (recommendation == null)
                throw new ArgumentNullException(nameof(recommendation));

            try
            {
                // Ensure CreatedAt has a value
                if (recommendation.CreatedAt == default)
                    recommendation.CreatedAt = DateTime.UtcNow;

                // Add and persist
                _context.AIRecommendations.Add(recommendation);
                await _context.SaveChangesAsync();

                _logger.LogInformation("AI recommendation saved for user {UserId} at {Time}.",
                    recommendation.UserId, recommendation.CreatedAt);

                return recommendation;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while saving AI recommendation for user {UserId}", recommendation.UserId);
                throw;
            }
        }

        public async Task<IEnumerable<AIRecommendation>> GetByUserId(string userId)
        {
            return await _context.AIRecommendations
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }
    }
}
