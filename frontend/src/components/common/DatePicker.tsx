import { useEffect, useRef, useState } from "react";

type DatePickerProps = {
  id: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  ariaLabel: string;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const weekdayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function formatDisplayDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).padStart(4, "0");

  return `${day}/${month}/${year}`;
}

function isSameDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate()
  );
}

function DatePicker({
  id,
  value,
  onChange,
  ariaLabel,
}: DatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(
      value?.getFullYear() ?? new Date().getFullYear(),
      value?.getMonth() ?? new Date().getMonth(),
      1,
    ),
  );

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current
        && !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function openCalendar() {
    const initialDate = value ?? new Date();
    setVisibleMonth(
      new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
    );
    setIsOpen(true);
  }

  function changeMonth(offset: number) {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  function selectDay(day: number) {
    onChange(
      new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth(),
        day,
      ),
    );
    setIsOpen(false);
  }

  const firstWeekday = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1,
  ).getDay();
  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate();
  const calendarCells: Array<number | null> = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={openCalendar}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between rounded-lg border bg-white p-3 text-left"
      >
        <span className={value ? "text-slate-800" : "text-gray-400"}>
          {value ? formatDisplayDate(value) : "dd/mm/yyyy"}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5 text-slate-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M7 2v3M17 2v3M3 9h18" />
          <rect x="3" y="4" width="18" height="17" rx="2" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={`${ariaLabel} calendar`}
          className="absolute right-0 z-30 mt-2 w-80 rounded-xl border bg-white p-4 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
              className="rounded-lg px-3 py-2 text-lg hover:bg-slate-100"
            >
              ‹
            </button>
            <p className="font-semibold text-slate-800">
              {monthNames[visibleMonth.getMonth()]}{" "}
              {visibleMonth.getFullYear()}
            </p>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
              className="rounded-lg px-3 py-2 text-lg hover:bg-slate-100"
            >
              ›
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1">
            {weekdayNames.map((weekday) => (
              <div
                key={weekday}
                className="py-1 text-center text-xs font-medium text-gray-500"
              >
                {weekday}
              </div>
            ))}

            {calendarCells.map((day, index) =>
              day === null ? (
                <div key={`empty-${index}`} />
              ) : (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  aria-label={`${day} ${monthNames[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}`}
                  aria-pressed={
                    value
                      ? isSameDay(
                        value,
                        new Date(
                          visibleMonth.getFullYear(),
                          visibleMonth.getMonth(),
                          day,
                        ),
                      )
                      : false
                  }
                  className={`h-9 rounded-lg text-sm ${
                    value
                    && isSameDay(
                      value,
                      new Date(
                        visibleMonth.getFullYear(),
                        visibleMonth.getMonth(),
                        day,
                      ),
                    )
                      ? "bg-blue-600 font-semibold text-white"
                      : "text-slate-700 hover:bg-blue-50"
                  }`}
                >
                  {day}
                </button>
              ),
            )}
          </div>

          <div className="mt-3 flex justify-end border-t pt-3">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              disabled={!value}
              className="text-sm text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
            >
              Clear date
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DatePicker;
