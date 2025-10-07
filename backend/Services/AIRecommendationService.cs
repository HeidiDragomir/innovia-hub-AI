using Azure;
using backend.Models;
using backend.Repositories;
using Newtonsoft.Json.Linq;
using System.Text;
using System.Text.Json;
using static System.Net.Mime.MediaTypeNames;

namespace backend.Services
{

    // Interface implementation for AI recommendation logic
    public class AIRecommendationService : IAIRecommendationService
    {

        // Dependencies
        private readonly IHttpClientFactory _httpClientFactory; // for calling OpenAI API
        private readonly IBookingRepository _bookingRepo;       // for fetching user booking history
        private readonly IResourceRepository _resourceRepo;     // for fetching available resources
        private readonly ILogger<AIRecommendationService> _logger;  // for logging errors or info


        public AIRecommendationService(
            IHttpClientFactory httpClientFactory,
            IBookingRepository bookingRepo,
            IResourceRepository resourceRepo,
            ILogger<AIRecommendationService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _bookingRepo = bookingRepo;
            _resourceRepo = resourceRepo;
            _logger = logger;
        }


        // Calls the OpenAI API to generate a personalized booking recommendation
        public async Task<AIRecommendation> GetRecommendationAsync(string userId)
        {

            try
            {
                // Step 1: Build the prompt that will be sent to OpenAI
                // It will contain recent bookings and available resources
                var requestBody = await BuildPromptAsync(userId);


                // Step 2: Create the client to send the request to the OpenAI
                // The client is configured in the Program.cs
                var client = _httpClientFactory.CreateClient("OpenAI");

                // Step 3: Serialize the prompt into JSON
                var json = JsonSerializer.Serialize(requestBody);

                var requestContent = new StringContent(json, Encoding.UTF8, "application/json");

                // Step 4: Make a POST request to OpenAI API
                var response = await client.PostAsync("responses", requestContent);

                // Step 5: Check if the API request was successful
                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();

                    return new AIRecommendation
                    {
                        Recommendation = "No recommendation available",
                        Reason = "Could not generate suggestion"
                    };
                }

                // Step 6: Parse and return the AI response
                var result = await ParseResponseAsync(response);

                // If parsing failed, return a safe default message
                return result ?? new AIRecommendation
                {
                    Recommendation = "No recommendation",
                    Reason = "AI response was empty"
                };
            }
            catch (Exception ex)
            {
                // Catch any unexpected error and log it
                _logger.LogError(ex, "Error generating AI recommendation");
                return new AIRecommendation
                {
                    Recommendation = "No recommendation",
                    Reason = "Internal error while generating recommendation"
                };
            }
        }


        // Builds the prompt object that will be sent to OpenAI
        // This includes recent user bookings and currently available resources
        private async Task<object> BuildPromptAsync(string userId)
        {
            // Step 1: Fetch all bookings of the user from the database including expired
            var bookings = await _bookingRepo.GetMyBookingsAsync(userId, includeExpiredBookings: true);

            // Step 2: Take the 5 most recent bookings to give AI context
            var recentBookings = bookings
                .OrderByDescending(b => b.BookingDate)
                .Take(5)
                .Select(b => new
                {
                    Resource = b.Resource?.Name,
                    Type = b.Resource?.ResourceType?.Name,
                    Start = b.BookingDate.ToString("yyyy-MM-dd HH:mm"),
                    End = b.EndDate.ToString("yyyy-MM-dd HH:mm"),
                    b.Timeslot
                });


            // Step 3: Fetch all resources that are currently available (not booked)
            var availableResources = (await _resourceRepo.GetAllAsync())
                .Where(r => !r.IsBooked)
                .Select(r => new
                {
                    r.Name,
                    Type = r.ResourceType.Name,
                });


            // Step 4: Package everything into an object to give to OpenAI so it can reason
            var context = new
            {
                userId,
                recentBookings = recentBookings,
                availableResources = availableResources,
            };

            // Step 5: Build the full request body for the OpenAI API
            return new
            {
                model = "gpt-4.1",

                input = new object[] {
                    new
                    { 
                        // System message: gives the AI its role and behavior instructions
                        role = "system",
                        content = @"You are Innovia Hub's AI Booking Assistant. Your job is to help members choose the most suitable resources to book, based on their previous bookings, personal preferences, and current availability of resources. 

                                - Analyze the user's booking history and identify patterns (e.g., which times, days or resource types the user usually books). 
                                - Check which resources are currently available and avoid suggesting booked ones. 
                                - Provide a single, concise recommendation that includes the resource name and the optimal time to book it. 
                                - Include a brief reason for your recommendation, such as ""Often available at this time"" or ""Matches your usual booking pattern."" 
                                - Avoid suggesting resources that are unavailable or already heavily booked. 
                                - Keep your responses friendly, clear and professional 
                                - You MUST respond *only* in valid JSON, with this format:
                                    {
                                      ""recommendation"": ""<resource and time suggestion>"",
                                      ""reason"": ""<short explanation>""
                                    }
                                - Never include explanations or extra text outside the JSON."
                    },
                    new
                    {
                        // User message: provides the actual input/context for the AI to respond to
                        role = "user",
                        content = JsonSerializer.Serialize(context)
                    }
                },
            };

        }


        // Parses the OpenAI JSON response into AIRecommendation
        private async Task<AIRecommendation?> ParseResponseAsync(HttpResponseMessage response)
        {
            // Step 1: Read the API response as string
            var content = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("Raw OpenAI response: {Raw}", content);

            try
            {
                // Step 2: Parse JSON into a JsonDocument
                var doc = JsonDocument.Parse(content);
                var root = doc.RootElement; // Root element of the JSON

                // Step 3: Responses API stores the main outputs inside an output array
                // Check if output exists, if not return null
                if (!root.TryGetProperty("output", out var outputs)) return null;


                // Step 4: Loop through each item in the output array
                foreach (var outputItem in outputs.EnumerateArray())
                {
                    // Each output item may contain a content array
                    if (!outputItem.TryGetProperty("content", out var contents)) continue;

                    // Step 5: Loop through each content item
                    foreach (var contentItem in contents.EnumerateArray())
                    {
                        // Only process items of type output_text
                        if (contentItem.GetProperty("type").GetString() != "output_text") continue;

                        // Step 6: Extract the text value from the content
                        var text = contentItem.GetProperty("text").GetString();

                        // Step 7: If text exists try to deserialize it into AIRecommendation
                        if (string.IsNullOrWhiteSpace(text))
                            continue;

                        try
                        {
                            // Sometimes the model includes extra text around JSON.
                            // It finds the first { and the last }, and extracts only the text between them
                            var start = text.IndexOf('{');
                            var end = text.LastIndexOf('}');

                            if (start != -1 && end != -1)
                            {
                                var jsonPart = text.Substring(start, end - start + 1);

                                var parsed = JsonSerializer.Deserialize<AIRecommendation>(jsonPart, new JsonSerializerOptions
                                {
                                    PropertyNameCaseInsensitive = true
                                });

                                if (parsed != null) return parsed;
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to parse AI JSON content: {Text}", text);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing OpenAI response JSON: {Raw}", content);
            }


            // Step 8: If no valid output_text was found or deserialization failed return null
            return null;

        }

    }
}
