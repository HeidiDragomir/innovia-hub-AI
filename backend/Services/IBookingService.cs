using backend.Models;
using backend.Models.DTOs;

namespace backend.Services;

public interface IBookingService
{
    Task<IEnumerable<BookingResponseDTO>> GetAllAsync();
    Task<BookingResponseDTO> GetByIdAsync(int bookingId);
    Task<IEnumerable<BookingResponseDTO>> GetMyBookingsAsync(string userId, bool includeExpiredBookings);
    Task<IEnumerable<GetResourceBookingsDTO>> GetResourceBookingsAsync(int resourceId, bool includeExpiredBookings);
    Task<BookingResponseDTO> CreateAsync(string userId, BookingDTO dto);
    Task<BookingResponseDTO> UpdateAsync(int bookingId, BookingDTO dto);
    Task<BookingResponseDTO?> CancelBookingAsync(string userId, bool isAdmin, int bookingId);
    Task<BookingResponseDTO?> DeleteAsync(int BookingId);
}
