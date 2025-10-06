import type { Resource } from "@/types/resource";
import type { Booking } from "@/types/booking";
import { Button } from "@/components/ui/button";

//Props needed for resourcecard
interface ResourceCardProps {
    resource: Resource;
    allBookings: Booking[];
    myBookings: Booking[];
    onOpenBooking: (resource: Resource) => void;
    onCancel: (bookingId: number) => void;
}

export default function ResourceCard({
    resource,
    myBookings,
    onOpenBooking,
    onCancel,
}: ResourceCardProps) {
    // Getting resource if active
    const myBooking = myBookings.find(
        (b) => b.resourceId === resource.resourceId && b.isActive
    );

    return (
        <div className="rounded-lg p-4 flex flex-col justify-between bg-white">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{resource.name}</h3>
                <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Available
                </span>
            </div>

            <Button onClick={() => onOpenBooking(resource)} className="mt-2">
                Book
            </Button>

            {myBooking && (
                <Button
                    onClick={() => onCancel(myBooking.bookingId)}
                    className="bg-red-600 text-white hover:bg-red-700 mt-2"
                >
                    Cancel my booking
                </Button>
            )}
        </div>
    );
}
