using AutoMapper;
using backend.Models;
using backend.Models.DTOs;

namespace backend.Mapping
{
    public class BookingProfile : Profile
    {

        public BookingProfile()
        {
            CreateMap<BookingDTO, Booking>()
                .ForMember(dest => dest.BookingDate, opt => opt.Ignore()) // handled manually
                .ForMember(dest => dest.EndDate, opt => opt.Ignore())     // handled manually
                .ForMember(dest => dest.UserId, opt => opt.Ignore());     // set in service

            CreateMap<Booking, BookingResponseDTO>()
                .ForMember(dest => dest.ResourceName, opt => opt.MapFrom(src => src.Resource != null ? src.Resource.Name : string.Empty))
                .ForMember(dest => dest.UserId, opt => opt.MapFrom(src => src.UserId)); // note: your DTO has int UserId but model uses string → fix if needed
        }
    }
}
