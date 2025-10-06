using AutoMapper;
using Azure;
using backend.Data;
using backend.Hubs;
using backend.Models;
using backend.Models.DTOs;
using backend.Models.DTOs.Resource;
using backend.Repositories;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System;

namespace backend.Services
{
    public class BookingService : IBookingService
    {
        private readonly IBookingRepository _repository;
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<BookingHub> _hubContext;
        private readonly IResourceService _resourceService;

        public BookingService(
            IBookingRepository repository,
            ApplicationDbContext context,
            IHubContext<BookingHub> hubContext,
            IResourceService resourceService)
        {
            _repository = repository;
            _context = context;
            _hubContext = hubContext;
            _resourceService = resourceService;
        }

        //Get all bookings
        public async Task<IEnumerable<BookingResponseDTO>> GetAllAsync()
        {
            var bookings = await _repository.GetAllAsync();
            return bookings.Select(MapToResponseDTO);
        }

        //Get booking by ID
        public async Task<BookingResponseDTO?> GetByIdAsync(int bookingId)
        {
            var booking = await _repository.GetByIdAsync(bookingId);

            if (booking == null) return null;

            return MapToResponseDTO(booking);
        }

        //Get bookings for the current user
        public async Task<IEnumerable<BookingResponseDTO>> GetMyBookingsAsync(string userId, bool includeExpiredBookings)
        {
            var bookings = await _repository.GetMyBookingsAsync(userId, includeExpiredBookings);
            return bookings.Select(MapToResponseDTO);
        }

        //Get all bookings for a resource
        public async Task<IEnumerable<GetResourceBookingsDTO>> GetResourceBookingsAsync(int resourceId, bool includeExpiredBookings)
        {
            return await _repository.GetResourceBookingsAsync(resourceId, includeExpiredBookings);
        }

        //Creates a new booking 
        public async Task<BookingResponseDTO> CreateAsync(string userId, BookingDTO dto)
        {
            var resource = await _resourceService.GetByIdAsync(dto.ResourceId);
            if (resource == null) throw new Exception("Resource doesnt exist");

            if (dto.Timeslot != "FM" && dto.Timeslot != "EF") throw new Exception("No timeslot specified");

            //Checks the date
            if (!DateTime.TryParse(dto.BookingDate, out var localDate))
                throw new Exception("Invalid date format");

            //Start and end times based on FM/EF
            var startLocal = dto.Timeslot == "FM" ? localDate.Date.AddHours(8) : localDate.Date.AddHours(12);
            var endLocal = dto.Timeslot == "FM" ? localDate.Date.AddHours(12) : localDate.Date.AddHours(16);

            //Convert to UTC time
            var startUtc = startLocal.ToUniversalTime();
            var endUtc = endLocal.ToUniversalTime();

            //Check if timeslot already booked
            var conflict = await _context.Bookings.AnyAsync(b =>
                b.ResourceId == dto.ResourceId &&
                b.IsActive &&
                b.BookingDate == startUtc &&
                b.EndDate == endUtc
            );
            if (conflict) throw new Exception("Timeslot already booked");

            // Create booking entity
            var booking = new Booking
            {
                IsActive = true,
                BookingDate = startUtc,
                EndDate = endUtc,
                UserId = userId,
                ResourceId = dto.ResourceId,
                Timeslot = dto.Timeslot
            };

            var created = await _repository.CreateAsync(booking);

            var response = MapToResponseDTO(created);
            response.ResourceName = resource.Name;

            await _hubContext.Clients.All.SendAsync("BookingCreated", new { ResourceName = resource.Name, UserId = userId });

            return response;
        }

        //Update booking
        public async Task<BookingResponseDTO?> UpdateAsync(int bookingId, BookingDTO dto)
        {
            // Get the existing booking
            var existing = await _repository.GetByIdAsync(bookingId);
            if (existing == null) return null;

            // Parse the booking date string to DateTime
            if (!DateTime.TryParse(dto.BookingDate, out DateTime localDate))
                throw new ArgumentException("Invalid booking date format.");

            if (dto.Timeslot != "FM" && dto.Timeslot != "EF")
                throw new ArgumentException("No valid timeslot specified.");

            // Calculate start and end times based on FM/EF
            var startLocal = dto.Timeslot == "FM" ? localDate.Date.AddHours(8) : localDate.Date.AddHours(12);
            var endLocal = dto.Timeslot == "FM" ? localDate.Date.AddHours(12) : localDate.Date.AddHours(16);

            // Convert to UTC
            var startUtc = startLocal.ToUniversalTime();
            var endUtc = endLocal.ToUniversalTime();

            // Check for conflicts with other bookings
            var conflict = await _context.Bookings.AnyAsync(b =>
                b.BookingId != bookingId &&      // Ignore the current booking
                b.ResourceId == existing.ResourceId &&
                b.IsActive &&
                b.BookingDate == startUtc &&
                b.EndDate == endUtc
            );
            if (conflict) throw new Exception("Timeslot already booked by another user.");

            // Update booking fields
            existing.BookingDate = startUtc;
            existing.EndDate = endUtc;
            existing.Timeslot = dto.Timeslot;

            var updated = await _repository.UpdateAsync(existing);

            if (updated != null)
            {
                var response = MapToResponseDTO(updated);

                // Notify all clients via SignalR
                await _hubContext.Clients.All.SendAsync("BookingUpdated", response);

                return response;
            }

            return null;
        }


        //Cancel booking
        public async Task<BookingResponseDTO?> CancelBookingAsync(string userId, bool isAdmin, int bookingId)
        {
            var booking = await _repository.CancelBookingAsync(userId, isAdmin, bookingId);
            if (booking != null)
            {
                var response = MapToResponseDTO(booking);

                await _hubContext.Clients.All.SendAsync("BookingCancelled", response);

                return response;
            }
            return null;
        }

        //Delete booking permanently
        public async Task<BookingResponseDTO?> DeleteAsync(int bookingId)
        {
            var booking = await _repository.DeleteAsync(bookingId);
            if (booking != null)
            {
                var resource = await _context.Resources.FindAsync(booking.ResourceId);
                if (resource != null)
                {
                    resource.IsBooked = false;
                    await _hubContext.Clients.All.SendAsync("ResourceUpdated", resource);
                }

                var response = MapToResponseDTO(booking);

                await _hubContext.Clients.All.SendAsync("BookingDeleted", response);

                return response;
            }
            return null;
        }


        // Helper method: Entity -> DTO
        private BookingResponseDTO MapToResponseDTO(Booking booking)
        {
            return new BookingResponseDTO
            {
                BookingId = booking.BookingId,
                BookingDate = booking.BookingDate,
                EndDate = booking.EndDate,
                Timeslot = booking.Timeslot,
                IsActive = booking.IsActive,
                ResourceId = booking.ResourceId,
                ResourceName = booking.Resource?.Name ?? string.Empty,
                UserId = booking.UserId
            };
        }
    }

}