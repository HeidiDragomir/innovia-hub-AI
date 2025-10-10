import {
    cancelBooking,
    fetchMyBookings,
    updateBooking,
} from "@/api/bookingApi";
import { UserContext } from "@/context/UserContext";
import type { Booking, BookingDTO } from "@/types/booking";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import * as signalR from "@microsoft/signalr";
import MyBookingCard from "@/components/MyBooking/MyBookingCard";
import "./MyBookings.css";
import AnimatedSimpleLoading from "@/components/AnimatedIcons/AnimatedSimpleLoading.tsx";
import { Button } from "@/components/ui/button";
import CalendarComponent from "@/components/Calender/calenderComponent.tsx";

// Utility to format date in Stockholm time
const dateKey = (d: Date | string) => {
    const date = typeof d === "string" ? new Date(d) : d;
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("sv-SE", {
        timeZone: "Europe/Stockholm",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
};

// Current Stockholm hour
const currentSthlmHour = () =>
    parseInt(
        new Intl.DateTimeFormat("sv-SE", {
            timeZone: "Europe/Stockholm",
            hour: "2-digit",
            hour12: false,
        }).format(new Date()),
        10
    );

// Today in Stockholm
const todayKeySthlm = () =>
    new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());

const MyBookings: React.FC = () => {
    const { token, user } = useContext(UserContext);
    const [myBookings, setMyBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
    const [timeOfDay, setTimeOfDay] = useState<"Morning" | "Afternoon" | null>(
        null
    );
    const connectionRef = useRef<signalR.HubConnection | null>(null);

    const hubUrl = useMemo(
        () => `${import.meta.env.VITE_API_BASE_URL}/bookingHub`,
        []
    );

    // Fetch bookings
    const fetchBookingsData = async () => {
        if (!token) return;
        try {
            const bookings = await fetchMyBookings(token);
            setMyBookings(bookings);
        } catch (err) {
            console.error(err);
            toast.error("Could not fetch bookings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookingsData();
    }, [token]);

    // Setup SignalR for real-time updates
    useEffect(() => {
        if (!token || !user?.id) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl)
            .withAutomaticReconnect()
            .build();

        const refreshData = async () => {
            await fetchBookingsData();
        };

        connection.on("BookingUpdated", (data: Booking) => {
            if (data.userId === user.id) {
                toast.success(
                    `Your booking for ${data.resourceName} was updated!`,
                    {
                        duration: 5000
                    }
                );
            } else {
                toast(`A booking for ${data.resourceName} was updated.`, {
                    icon: "🔄",
                    duration: 5000
                });
            }
            refreshData();
        });

        connection.on("BookingCancelled", (data: Booking) => {
            if (data.userId === user.id) {
                toast(`You cancelled your booking for ${data.resourceName}.`, {
                    icon: "⚠️",
                    duration: 5000
                });
            } else {
                toast(`A booking for ${data.resourceName} was cancelled.`, {
                    icon: "⚠️",
                    duration: 5000
                });
            }
            refreshData();
        });

        connection.on("BookingDeleted", (data: Booking) => {
            if (data.userId === user.id) {
                toast.error(
                    `Your booking for ${data.resourceName} was deleted!`
                );
            } else {
                toast.error(`A booking for ${data.resourceName} was deleted.`);
            }
            refreshData();
        });

        connectionRef.current = connection;

        connection
            .start()
            .then(() => console.log("SignalR connected (MyBookingsPage)"))
            .catch((err) => console.error("SignalR connect error:", err));

        return () => {
            connection.stop();
        };
    }, [token, user?.id]);

    //Cancels a booking and refreshes
    const handleCancel = async (bookingId: number) => {
        if (!token) return;
        try {
            await cancelBooking(token, bookingId);
            const newBookings = await fetchMyBookings(token);
            setMyBookings(newBookings);
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message ?? "Kunde inte avboka");
        }
    };

    // Update booking
    const handleUpdateBooking = async (
        bookingId: number,
        dateKeyStr: string,
        time: "Morning" | "Afternoon"
    ) => {
        if (!token || !editingBooking) return;

        try {
            const dto: BookingDTO = {
                resourceId: editingBooking.resourceId,
                bookingDate: dateKeyStr,
                timeslot: time === "Morning" ? "FM" : "EF",
            };
            await updateBooking(token, bookingId, dto);
            fetchBookingsData();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message ?? "Could not update booking");
        }
    };

    // Map of all booked slots for disabled logic
    const slotMap = useMemo(() => {
        const map = new Map<string, { FM: boolean; EF: boolean }>();
        for (const b of myBookings) {
            if (!b.isActive) continue;
            const key = `${b.resourceId}__${dateKey(b.bookingDate)}`;
            const entry = map.get(key) ?? { FM: false, EF: false };
            if (b.timeslot === "FM") entry.FM = true;
            if (b.timeslot === "EF") entry.EF = true;
            map.set(key, entry);
        }
        return map;
    }, [myBookings]);

    //Sorting active bookings by start date
    const activeSorted = useMemo(
        () =>
            myBookings
                .filter((b) => b.isActive)
                .sort(
                    (a, b) =>
                        new Date(a.bookingDate).getTime() -
                        new Date(b.bookingDate).getTime()
                ),
        [myBookings]
    );

    // Determine disabled times for update modal
    const currentSlots = useMemo(() => {
        if (!editingBooking || !selectedDateKey)
            return { FM: false, EF: false, fmDisabled: true, efDisabled: true };

        const key = `${editingBooking.resourceId}__${selectedDateKey}`;
        const booked = slotMap.get(key) ?? { FM: false, EF: false };

        const today = todayKeySthlm();
        const hour = currentSthlmHour();

        return {
            FM: booked.FM,
            EF: booked.EF,
            fmDisabled: booked.FM || (selectedDateKey === today && hour >= 12),
            efDisabled: booked.EF || (selectedDateKey === today && hour >= 16),
        };
    }, [editingBooking, selectedDateKey, slotMap]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <AnimatedSimpleLoading />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-center">My bookings</h1>
            {activeSorted.length === 0 && (
                <p className="text-center">You have no active bookings.</p>
            )}

            <div
                className="grid gap-6"
                style={{
                    gridTemplateColumns:
                        "repeat(auto-fit, minmax(400px, 400px))",
                    justifyContent: "center",
                    maxWidth: "1200px",
                    margin: "0 auto",
                }}
            >
                {activeSorted.map((b) => (
                    <MyBookingCard
                        key={b.bookingId}
                        booking={b}
                        onCancel={handleCancel}
                        onEdit={() => {
                            setEditingBooking(b);
                            setSelectedDateKey(dateKey(b.bookingDate));
                            setTimeOfDay(
                                b.timeslot === "FM" ? "Morning" : "Afternoon"
                            );
                        }}
                    />
                ))}
            </div>

            {editingBooking && (
                <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-6 border shadow-xl">
                        <h2 className="text-xl font-bold text-center">
                            Update Booking: {editingBooking.resourceName}
                        </h2>

                        <CalendarComponent
                            selectedDateKey={selectedDateKey}
                            setSelectedDateKey={setSelectedDateKey}
                            slotMap={
                                new Map(
                                    myBookings
                                        .filter((b) => b.isActive)
                                        .map((b) => [
                                            `${b.resourceId}__${dateKey(
                                                b.bookingDate
                                            )}`,
                                            {
                                                FM: b.timeslot === "FM",
                                                EF: b.timeslot === "EF",
                                            },
                                        ])
                                )
                            }
                            selectedResourceId={editingBooking.resourceId}
                            dateKey={dateKey}
                        />

                        {selectedDateKey && (
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Choose time
                                </label>
                                <select
                                    className="border rounded-md p-2 w-full"
                                    value={timeOfDay ?? ""}
                                    onChange={(e) =>
                                        setTimeOfDay(
                                            e.target.value as
                                                | "Morning"
                                                | "Afternoon"
                                        )
                                    }
                                >
                                    <option value="">--Select Time--</option>
                                    <option
                                        value="Morning"
                                        disabled={currentSlots.fmDisabled}
                                    >
                                        Morning (08-12)
                                    </option>
                                    <option
                                        value="Afternoon"
                                        disabled={currentSlots.efDisabled}
                                    >
                                        Afternoon (12-16)
                                    </option>
                                </select>
                            </div>
                        )}

                        <div className="flex justify-between">
                            <Button
                                onClick={async () => {
                                    if (!selectedDateKey || !timeOfDay) {
                                        toast.error(
                                            "Please select a date and time!"
                                        );
                                        return;
                                    }
                                    await handleUpdateBooking(
                                        editingBooking.bookingId,
                                        selectedDateKey,
                                        timeOfDay
                                    );
                                    setEditingBooking(null);
                                    setSelectedDateKey(null);
                                    setTimeOfDay(null);
                                }}
                            >
                                Update Booking
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setEditingBooking(null);
                                    setSelectedDateKey(null);
                                    setTimeOfDay(null);
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyBookings;
