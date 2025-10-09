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
import AnimatedSimpleLoading from "@/components/AnimatedIcons/AnimatedSimpleLoading.tsx";
import type { Recommendation } from "@/types/recommendation.ts";
import { fetchRecommendations } from "@/api/recommendationApi.tsx";
import { formatDistanceToNow } from "date-fns";

//Format for bookingdate (Stockholm time)
const dateKey = (d?: Date | string | null) => {
    if (!d) return "";

    const date = typeof d === "string" ? new Date(d) : d;
    if (!(date instanceof Date) || isNaN(date.getTime())) return "";

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
    const { token, user } = useContext(UserContext);
    const [resources, setResources] = useState<Resource[]>([]);
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [myBookings, setMyBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [recommendations, setRecommendations] = useState<Recommendation[]>(
        []
    );
    const [loadingRec, setLoadingRec] = useState(true);
    const fetchedRef = useRef(false); // Prevent duplicate calls

    const [selectedResource, setSelectedResource] = useState<Resource | null>(
        null
    );
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
    const [timeOfDay, setTimeOfDay] = useState<"Morning" | "Afternoon" | null>(
        null
    );

    const [pendingRecIds, setPendingRecIds] = useState<number[]>([]);
    const [bookedRecIds, setBookedRecIds] = useState<number[]>([]);

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

            const key = `${b.resourceId}__${dateStr}`;
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
        if (!token || !user?.id) return;
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

    // Fetch the recommendations
    useEffect(() => {
        // Run only once per valid token
        if (!token || fetchedRef.current) return;
        fetchedRef.current = true;

        const getAIRecommendations = async () => {
            try {
                setLoadingRec(true);
                const result = await fetchRecommendations(token);
                setRecommendations(result);
            } catch (err) {
                console.error("Error fetching AI recommendations:", err);
            } finally {
                setLoadingRec(false);
            }
        };
        getAIRecommendations();
    }, [token]);

    console.log("RECOMMENDATIONS", recommendations);

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

        connection.on("BookingCreated", (booking: Booking) => {
            if (booking.userId === user.id) {
                toast.success(
                    `You successfully booked ${booking.resourceName}!`
                );
            } else {
                toast(
                    `A new booking for ${booking.resourceName} was made by another user.`,
                    {
                        icon: "📢",
                    }
                );
            }
            refreshData();
        });

        connection.on("BookingCancelled", (booking: Booking) => {
            if (booking.userId === user.id) {
                toast(
                    `You cancelled your booking for ${booking.resourceName}.`
                );
            } else {
                toast(`A booking for ${booking.resourceName} was cancelled.`, {
                    icon: "⚠️",
                });
            }
            refreshData();
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
    }, [token, user?.id]);

    //Function to handle booking
    const handleBook = async () => {
        if (!token || !selectedResource || !selectedDateKey || !timeOfDay)
            return;

        const today = todayKeySthlm();
        const hour = currentSthlmHour();

        if (selectedDateKey < today) {
            toast.error("You cannot book a past date.");
            return;
        }
        if (selectedDateKey === today) {
            if (timeOfDay === "Morning" && hour >= 12) {
                toast.error("Morning has already passed today.");
                return;
            }
            if (timeOfDay === "Afternoon" && hour >= 16) {
                toast.error("Afternoon has already passed today.");
                return;
            }
        }

        try {
            //Backend saving in UTC
            const dto: BookingDTO = {
                resourceId: selectedResource.resourceId,
                bookingDate: selectedDateKey,
                timeslot: timeOfDay === "Morning" ? "FM" : "EF",
            };

            await createBooking(token, dto);
            // Find matching recommendation for this resource
            const rec = recommendations.find(
                (r) => r.recommendation.resourceName === selectedResource.name
            );

            // Remove from pending (since modal closed)
            if (rec) {
                setPendingRecIds((prev) => prev.filter((id) => id !== rec.id));

                // Mark as permanently booked
                setBookedRecIds((prev) => [...prev, rec.id]);
            }
            setSelectedResource(null);
            setSelectedDateKey(null);
            setTimeOfDay(null);
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

    // Resource categories
    const desks = resources.filter((r) => r.resourceTypeName === "DropInDesk");
    const meetingRooms = resources.filter(
        (r) => r.resourceTypeName === "MeetingRoom"
    );
    const vrSets = resources.filter((r) => r.resourceTypeName === "VRset");
    const aiServers = resources.filter(
        (r) => r.resourceTypeName === "AIserver"
    );

    // Checking disabled slots for selected date
    const currentSlots = useMemo(() => {
        if (!selectedResource?.resourceId || !selectedDateKey) return null;

        const k = `${selectedResource.resourceId}__${selectedDateKey}`;
        const s = slotMap.get(k) ?? { FM: false, EF: false };

        let fmDisabled = s.FM;
        let efDisabled = s.EF;

        // Disable past times for today
        const today = todayKeySthlm();
        const hour = currentSthlmHour();
        if (selectedDateKey === today) {
            fmDisabled = fmDisabled || hour >= 12;
            efDisabled = efDisabled || hour >= 16;
        }

        return { ...s, fmDisabled, efDisabled };
    }, [selectedResource, selectedDateKey, slotMap]);

    return (
        <div className="p-6 space-y-12">
            {/* === Smart Booking Assistant Section ===  */}
            {loadingRec ? (
                <div className="flex justify-center items-center h-40">
                    <AnimatedSimpleLoading />
                    <p className="text-gray-500">
                        Generating recommendations ...
                    </p>
                </div>
            ) : recommendations.length > 0 ? (
                <div className="bg-blue-50 rounded-2xl p-6 shadow-sm border border-blue-200 mb-12">
                    <div className="md:flex md:justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold py-6 md:py-0 flex items-center gap-4">
                            <img
                                src="/robot.png"
                                alt="Robot icon"
                                width={40}
                                height={40}
                                className="inline-block"
                            />{" "}
                            Smart Booking Assistant
                        </h2>
                        <Button
                            onClick={async () => {
                                setLoadingRec(true);
                                const rec = await fetchRecommendations(token);
                                setRecommendations(rec);
                                setLoadingRec(false);
                            }}
                        >
                            <img
                                src="/refresh.png"
                                alt="Refresh icon"
                                width={20}
                                height={20}
                                className="inline-block"
                            />{" "}
                            New AI Recommendations
                        </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {recommendations.map((rec) => {
                            const resourceName =
                                rec.recommendation.resourceName;
                            let suggestedDate = rec.recommendation.date;
                            const suggestedTimeslot =
                                rec.recommendation.timeslot;

                            // Default suggestion date handling
                            // let suggestedDate = todayKeySthlm();
                            const hourNow = currentSthlmHour();

                            // If AI suggests Morning but morning has passed, move to tomorrow
                            if (suggestedTimeslot === "FM" && hourNow >= 12) {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                suggestedDate = tomorrow.toLocaleDateString(
                                    "sv-SE",
                                    {
                                        timeZone: "Europe/Stockholm",
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                    }
                                );
                            }

                            // If AI suggests Afternoon but afternoon has passed, move to tomorrow
                            if (suggestedTimeslot === "EF" && hourNow >= 16) {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                suggestedDate = tomorrow.toLocaleDateString(
                                    "sv-SE",
                                    {
                                        timeZone: "Europe/Stockholm",
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                    }
                                );
                            }

                            // Find resource safely (case-insensitive, trim spaces)
                            const resource = resources.find(
                                (r) =>
                                    r.name.trim().toLowerCase() ===
                                    resourceName.toLowerCase()
                            );

                            if (!resource) {
                                // Show a placeholder if resource not found
                                return (
                                    <div
                                        key={rec.id}
                                        className="bg-gray-100 rounded-xl p-4 shadow-sm border"
                                    >
                                        <p className="text-red-500 text-sm">
                                            Resource "{resourceName}" not found
                                        </p>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={rec.id}
                                    className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition"
                                >
                                    <h3 className="text-lg font-semibold mb-1">
                                        {resourceName}
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-2">
                                        {suggestedDate} —{" "}
                                        {suggestedTimeslot === "FM"
                                            ? "Morning (08-12)"
                                            : "Afternoon (12-16)"}
                                    </p>
                                    <p className="text-sm text-gray-500 italic mb-4">
                                        {rec.reason}
                                    </p>
                                    {rec.createdAt && (
                                        <p className="text-xs text-gray-500 mt-2 mb-4">
                                            Last updated{" "}
                                            {formatDistanceToNow(
                                                new Date(rec.createdAt),
                                                { addSuffix: true }
                                            )}
                                        </p>
                                    )}
                                    <Button
                                        onClick={() => {
                                            setSelectedResource(resource);
                                            setSelectedDateKey(suggestedDate);
                                            setTimeOfDay(
                                                suggestedTimeslot === "FM"
                                                    ? "Morning"
                                                    : "Afternoon"
                                            );
                                            setPendingRecIds((prev) => [
                                                ...prev,
                                                rec.id,
                                            ]);
                                        }}
                                        disabled={
                                            pendingRecIds.includes(rec.id) ||
                                            bookedRecIds.includes(rec.id)
                                        }
                                    >
                                        {bookedRecIds.includes(rec.id)
                                            ? "Booked"
                                            : pendingRecIds.includes(rec.id)
                                            ? "Booking in progress..."
                                            : "Book Recommendation"}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <p className="text-center text-gray-500 italic">
                    No smart recommendations available right now.
                </p>
            )}

            {/* === Resources Section ===  */}
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
                                            onOpenBooking={() => {
                                                setSelectedResource(r);
                                                setSelectedDateKey(null);
                                                setTimeOfDay(null);
                                            }}
                                            onCancel={handleCancel}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
            )}

            {/* === BOOKING MODAL === */}
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
                                        Morning (08-12){" "}
                                        {currentSlots.FM
                                            ? " - already booked"
                                            : ""}
                                    </option>
                                    <option
                                        value="Afternoon"
                                        disabled={currentSlots.efDisabled}
                                    >
                                        Afternoon (12-16){" "}
                                        {currentSlots.EF
                                            ? " - already booked"
                                            : ""}
                                    </option>
                                </select>
                            </div>
                        )}

                        <div className="flex justify-between">
                            <Button onClick={handleBook}>
                                Confirm Booking
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSelectedResource(null);
                                    setSelectedDateKey(null);
                                    setTimeOfDay(null);
                                    // Remove pending status for the recommendation associated with this modal
                                    setPendingRecIds((prev) =>
                                        prev.filter((id) => {
                                            const relatedRec =
                                                recommendations.find(
                                                    (r) =>
                                                        r.recommendation
                                                            .resourceName ===
                                                        selectedResource?.name
                                                );
                                            return relatedRec
                                                ? id !== relatedRec.id
                                                : true;
                                        })
                                    );
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
