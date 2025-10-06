import { useCallback, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

type DaySlots = { FM: boolean; EF: boolean };

type CalendarComponentProps = {
    selectedDateKey: string | null;
    setSelectedDateKey: (key: string | null) => void;
    slotMap: Map<string, DaySlots>;
    selectedResourceId: number;
    dateKey: (d: Date | string) => string;
};

const CalendarComponent = ({
    selectedDateKey,
    setSelectedDateKey,
    slotMap,
    selectedResourceId,
    dateKey,
}: CalendarComponentProps) => {
    //Min selectable date
    const minDate = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }, []);

    //When user clicks a day, save the timekey (stockholm time)
    const handleClickDay = useCallback(
        (date: Date) => setSelectedDateKey(dateKey(date)),
        [dateKey, setSelectedDateKey]
    );

    //Disable past days and days where both FM & EF are booked
    const tileDisabled = ({ date }: { date: Date }) => {
        if (date < minDate) return true;
        const k = `${selectedResourceId}__${dateKey(date)}`;
        const s = slotMap.get(k);
        return !!(s && s.FM && s.EF);
    };

    //Highlight selected date
    const tileClassName = ({ date }: { date: Date }) => {
        const key = dateKey(date);
        return key === selectedDateKey
            ? "bg-blue-500 text-white font-bold"
            : "";
    };

    return (
        <div className="w-full">
            <h2 className="text-lg font-semibold text-center mb-4">
                Choose a date
            </h2>
            <Calendar
                minDate={minDate}
                onClickDay={handleClickDay}
                tileDisabled={tileDisabled}
                tileClassName={tileClassName}
                value={selectedDateKey ? new Date(selectedDateKey) : undefined}
                className="mx-auto [&_.react-calendar__tile]:rounded-md"
            />
        </div>
    );
};

export default CalendarComponent;
