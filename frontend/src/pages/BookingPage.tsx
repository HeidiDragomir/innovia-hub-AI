import { useContext, useEffect, useMemo, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { UserContext } from "@/context/UserContext";
import type { Resource } from "@/types/resource";
import type { Booking, BookingDTO } from "@/types/booking";
import { fetchResources } from "@/api/resourceApi";
import {
    fetchBookings,
    fetchMyBookings,
    createBooking,
    cancelBooking,
} from "@/api/bookingApi";
import ResourceCard from "@/components/Resource/ResourceCard";
import CalendarComponent from "@/components/Calender/calenderComponent";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

//Format for bookingdate (Stockholm time)
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

//Current time stockholm
const currentSthlmHour = () =>
    parseInt(
        new Intl.DateTimeFormat("sv-SE", {
            timeZone: "Europe/Stockholm",
            hour: "2-digit",
            hour12: false,
        }).format(new Date()),
        10
    );

//Year month date for today in stockholm
const todayKeySthlm = () =>
    new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());

export default function BookingsPage() {
    const { token } = useContext(UserContext);
    const [resources, setResources] = useState<Resource[]>([]);
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [myBookings, setMyBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedResource, setSelectedResource] = useState<Resource | null>(
        null
    );
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
    const [timeOfDay, setTimeOfDay] = useState<"Morning" | "Afternoon" | null>(
        null
    );

    const connectionRef = useRef<signalR.HubConnection | null>(null);
    const hubUrl = useMemo(
        () => `${import.meta.env.VITE_API_BASE_URL}/bookingHub`,
        []
    );

    type DaySlots = { FM: boolean; EF: boolean };
    const slotMap = useMemo(() => {
        const map = new Map<string, DaySlots>();

        for (const b of allBookings) {
            if (!b.isActive) continue;

            const stockholmDate = new Date(b.bookingDate).toLocaleString(
                "sv-SE",
                { timeZone: "Europe/Stockholm" }
            );
            const dateStr = new Date(stockholmDate).toISOString().slice(0, 10);

            const key = `${b.resource.resourceId}__${dateStr}`;
            const entry = map.get(key) ?? { FM: false, EF: false };

            const slot = b.timeslot;

            if (slot === "FM") entry.FM = true;
            if (slot === "EF") entry.EF = true;

            map.set(key, entry);
        }
        return map;
    }, [allBookings]);

    //Fetching bookings & recources
    useEffect(() => {
        if (!token) return;
        (async () => {
            try {
                const [r, ab, mb] = await Promise.all([
                    fetchResources(token),
                    fetchBookings(token),
                    fetchMyBookings(token),
                ]);
                setResources(r);
                setAllBookings(ab);
                setMyBookings(mb);
            } catch {
                toast.error("Could not fetch data");
            } finally {
                setLoading(false);
            }
        })();
    }, [token]);

    const refreshData = async () => {
        if (!token) return;
        try {
            const [r, ab, mb] = await Promise.all([
                fetchResources(token),
                fetchBookings(token),
                fetchMyBookings(token),
            ]);
            setResources(r);
            setAllBookings(ab);
            setMyBookings(mb);
        } catch (err) {
            console.error(err);
            toast.error("Could not refresh data");
        }
    };

    //Setup SignalR for real time updating
    useEffect(() => {
        if (!token) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl)
            .withAutomaticReconnect()
            .build();

        connection.on("BookingCreated", (data: { resourceName: string }) => {
            console.log("data", data.resourceName);
            if (data && data.resourceName) {
                toast.success(
                    `A new booking for ${data.resourceName} has been created!`
                );
                refreshData();
            }
        });

        connectionRef.current = connection;
        connection
            .start()
            .then(() => {
                console.log("SignalR connected");
            })
            .catch((err) => {
                console.error("SignalR connect error:", err);
            });

        return () => {
            connection.stop();
        };
    }, [token]);

    //Function to handle booking
    const handleBook = async (
        resourceId: number,
        dateKeyStr: string,
        time: "Morning" | "Afternoon"
    ) => {
        if (!token) return;

        const today = todayKeySthlm();
        const hour = currentSthlmHour();

        if (dateKeyStr < today) {
            toast.error("You cannot book a past date.");
            return;
        }
        if (dateKeyStr === today) {
            if (time === "Morning" && hour >= 12) {
                toast.error("Morning has already passed today.");
                return;
            }
            if (time === "Afternoon" && hour >= 16) {
                toast.error("Afternoon has already passed today.");
                return;
            }
        }

        try {
            //Backend saving in UTC
            const dto: BookingDTO = {
                resourceId,
                bookingDate: dateKeyStr,
                timeslot: time === "Morning" ? "FM" : "EF",
            };

            await createBooking(token, dto);
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message ?? "Could not create booking");
        }
    };

    //Cancel booking function
    const handleCancel = async (bookingId: number) => {
        if (!token) return;
        try {
            await cancelBooking(token, bookingId);
            toast.success("Booking canceled!");

            const [r, ab, mb] = await Promise.all([
                fetchResources(token),
                fetchBookings(token),
                fetchMyBookings(token),
            ]);
            setResources(r);
            setAllBookings(ab);
            setMyBookings(mb);
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message ?? "Could not cancel booking");
        }
    };

    const desks = resources.filter((r) => r.resourceTypeName === "DropInDesk");
    const meetingRooms = resources.filter(
        (r) => r.resourceTypeName === "MeetingRoom"
    );
    const vrSets = resources.filter((r) => r.resourceTypeName === "VRset");
    const aiServers = resources.filter(
        (r) => r.resourceTypeName === "AIserver"
    );

    //Checking disabled slots for selected date
    const currentSlots = useMemo(() => {
        if (!selectedResource || !selectedDateKey) return null;

        const k = `${selectedResource.resourceId}__${selectedDateKey}`;
        const s = slotMap.get(k) ?? { FM: false, EF: false };

        const today = todayKeySthlm();
        const hour = currentSthlmHour();

        let fmDisabled = s.FM;
        let efDisabled = s.EF;

        if (selectedDateKey === today) {
            fmDisabled = fmDisabled || hour >= 12;
            efDisabled = efDisabled || hour >= 16;
        }

        return { ...s, fmDisabled, efDisabled };
    }, [selectedResource, selectedDateKey, slotMap]);

    if (loading) return <p className="text-gray-600">Loading resources...</p>;

    return (
        <div className="p-6 space-y-12">
            {[
                { title: "Desks", list: desks },
                { title: "Meeting Rooms", list: meetingRooms },
                { title: "VR Headsets", list: vrSets },
                { title: "AI Server", list: aiServers },
            ].map(
                ({ title, list }) =>
                    list.length > 0 && (
                        <div key={title}>
                            <h3 className="text-2xl font-bold mb-4 text-center">
                                {title}
                            </h3>
                            <div
                                className="grid gap-6"
                                style={{
                                    gridTemplateColumns:
                                        "repeat(auto-fit, minmax(250px, 1fr))",
                                    maxWidth: "1200px",
                                    margin: "0 auto",
                                }}
                            >
                                {list.map((r) => (
                                    <div
                                        key={r.resourceId}
                                        className="bg-white rounded-xl p-6 shadow-sm"
                                    >
                                        <ResourceCard
                                            resource={r}
                                            allBookings={allBookings}
                                            myBookings={myBookings}
                                            onOpenBooking={async (res) => {
                                                setSelectedResource(res);
                                                setSelectedDateKey(null);
                                                setTimeOfDay(null);

                                                //Fresh bookings when modal opens
                                                if (token) {
                                                    const [ab, mb] =
                                                        await Promise.all([
                                                            fetchBookings(
                                                                token
                                                            ),
                                                            fetchMyBookings(
                                                                token
                                                            ),
                                                        ]);
                                                    setAllBookings(ab);
                                                    setMyBookings(mb);
                                                }
                                            }}
                                            onCancel={handleCancel}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
            )}

            {selectedResource && (
                <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-6 border shadow-xl">
                        <h2 className="text-xl font-bold text-center">
                            Booking: {selectedResource.name}
                        </h2>

                        <CalendarComponent
                            selectedDateKey={selectedDateKey}
                            setSelectedDateKey={setSelectedDateKey}
                            slotMap={slotMap}
                            selectedResourceId={selectedResource.resourceId}
                            dateKey={dateKey}
                        />

                        {selectedDateKey && currentSlots && (
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
                                        Morning (08–12){" "}
                                        {currentSlots.FM
                                            ? " - already booked"
                                            : ""}
                                    </option>
                                    <option
                                        value="Afternoon"
                                        disabled={currentSlots.efDisabled}
                                    >
                                        Afternoon (12–16){" "}
                                        {currentSlots.EF
                                            ? " - already booked"
                                            : ""}
                                    </option>
                                </select>
                            </div>
                        )}

                        <div className="flex justify-between">
                            <Button
                                onClick={() => {
                                    if (!selectedDateKey) {
                                        toast.error(
                                            "You have to choose a date!"
                                        );
                                        return;
                                    }
                                    if (!timeOfDay) {
                                        toast.error("Please choose a time!");
                                        return;
                                    }
                                    handleBook(
                                        selectedResource.resourceId,
                                        selectedDateKey,
                                        timeOfDay
                                    );
                                    setSelectedResource(null);
                                    setSelectedDateKey(null);
                                    setTimeOfDay(null);
                                }}
                            >
                                Confirm Booking
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSelectedResource(null);
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
}
