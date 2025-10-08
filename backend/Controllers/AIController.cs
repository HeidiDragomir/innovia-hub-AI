using backend.Hubs;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AIController : ControllerBase
    {
        private readonly IAIRecommendationService _aiService;

        private readonly IHubContext<BookingHub> _hubContext;

        public AIController(IAIRecommendationService aiService, IHubContext<BookingHub> hubContext)
        {
            _aiService = aiService;
            _hubContext = hubContext;
        }

        // GET: api/recommendations
        [HttpGet("recommendations")]
        [Authorize(Roles = "Admin,Member")]
        public async Task<IActionResult> GetRecommendations()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId)) return Unauthorized("User not found");

            var result = await _aiService.GetRecommendationsAsync(userId);

            if (result == null) return NotFound();

            // Push in real-time via SignalR
            await _hubContext.Clients.User(userId).SendAsync("AIRecommendations", result);

            return Ok(result);
        }

    }
}
