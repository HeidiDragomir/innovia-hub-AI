import type { Booking } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";

interface MyBookingCardProps {
    booking: Booking;
    onCancel: (bookingId: number) => void;
    onEdit?: (booking: Booking) => void;
}

export default function MyBookingCard({
    booking,
    onCancel,
    onEdit,
}: MyBookingCardProps) {
    const [startDateString, setStartDateString] = useState("");

    //Format time to Swedish time
    function formatSwedish(dateString: string) {
        return new Date(dateString).toLocaleString("sv-SE", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Europe/Stockholm",
        });
    }

    //Timeslot label
    const timeslotLabel = useMemo(() => {
        return booking.timeslot === "FM"
            ? "Morning (08-12)"
            : "Afternoon (12-16)";
    }, [booking.timeslot]);

    //Updates when a booking changes
    useEffect(() => {
        setStartDateString(formatSwedish(booking.bookingDate));
    }, [booking.bookingDate]);

    const badgeText = booking.isActive ? "My Booking" : "Cancelled";
    const badgeStyle = booking.isActive
        ? "bg-blue-100 text-blue-800"
        : "bg-gray-100 text-gray-800";

    const dateOnly = new Date(booking.bookingDate).toLocaleDateString("sv-SE", {
        timeZone: "Europe/Stockholm",
    });

    return (
        <div className="rounded-lg p-4 flex flex-col justify-between bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">
                    {booking.resourceName}
                </h3>
                <span
                    className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${badgeStyle}`}
                >
                    {badgeText}
                </span>
            </div>

            <p className="text-sm mb-1">
                {dateOnly} - {timeslotLabel}
            </p>

            {booking.isActive && (
                <div className="flex gap-2">
                    {onEdit && (
                        <Button
                            onClick={() => onEdit(booking)}
                            className="bg-yellow-500 text-white hover:bg-yellow-600"
                        >
                            Edit
                        </Button>
                    )}
                    <Button
                        onClick={() => onCancel(booking.bookingId)}
                        className="bg-red-600 text-white hover:bg-red-700"
                    >
                        Cancel
                    </Button>
                </div>
            )}
        </div>
    );
}
