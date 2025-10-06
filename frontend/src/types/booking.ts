export interface Booking {
    bookingId: number;
    bookingDate: string;
    endDate: string;
    timeslot: "FM" | "EF";
    isActive: boolean;
    resourceId: number;
    resourceName: string;
    userId: string;
}

export interface BookingDTO {
    resourceId: number;
    bookingDate: string;
    timeslot: "FM" | "EF";
}
