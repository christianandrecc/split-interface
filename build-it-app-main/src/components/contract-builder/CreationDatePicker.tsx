import { useEffect, useRef, useState } from "react";
import { format, isValid, parseISO, setMonth, setYear, startOfMonth } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useDayPicker, useNavigation, type CaptionProps, type DayContentProps } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "./creation-date-picker.css";

type Props = {
  id: string;
  value: string;
  max: string;
  onChange: (value: string) => void;
};

export default function CreationDatePicker({ id, value, max, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [landscape, setLandscape] = useState(() => window.matchMedia("(min-width: 640px) and (max-height: 500px)").matches);
  const trigger = useRef<HTMLButtonElement>(null);
  const today = parseISO(max);
  const parsed = parseISO(value);
  const selected = isValid(parsed) && parsed <= today ? parsed : today;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px) and (max-height: 500px)");
    const update = () => setLandscape(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const chooseDate = (date?: Date) => {
    if (!date || !isValid(date) || date > today) return;
    // Keep the calendar date local; UTC conversion can shift it to another day.
    onChange(format(date, "yyyy-MM-dd"));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={trigger}
          id={id}
          type="button"
          variant="outline"
          className="creation-date-trigger"
          aria-label={`Creation Date, ${format(selected, "MMMM d, yyyy")}`}
        >
          <span>{format(selected, "MM/dd/yyyy")}</span>
          <CalendarDays aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side={landscape ? "left" : "bottom"}
        align={landscape ? "center" : "start"}
        sideOffset={8}
        collisionPadding={12}
        className="creation-date-popover"
        aria-label="Choose creation date"
        onOpenAutoFocus={event => event.preventDefault()}
        onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}
      >
        <Calendar
          mode="single"
          required
          selected={selected}
          defaultMonth={selected}
          today={today}
          fromDate={parseISO("0001-01-01")}
          toDate={today}
          disabled={{ after: today }}
          onSelect={chooseDate}
          initialFocus
          fixedWeeks
          showOutsideDays
          className="creation-calendar"
          classNames={{ months: "creation-calendar-months", month: "creation-calendar-month", table: "creation-calendar-grid", cell: "creation-calendar-cell", day_today: "creation-calendar-today" }}
          components={{ Caption: CreationCalendarCaption, DayContent: CreationCalendarDay }}
        />
        <div className="creation-date-footer">
          <Button type="button" variant="ghost" onClick={() => chooseDate(today)}>Today</Button>
          <span>{format(today, "MMM d, yyyy")}</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CreationCalendarCaption({ displayMonth, id }: CaptionProps) {
  const { goToMonth, previousMonth, nextMonth } = useNavigation();
  const { today } = useDayPicker();
  const year = displayMonth.getFullYear();
  const maxMonth = year === today.getFullYear() ? today.getMonth() : 11;

  return (
    <div className="creation-calendar-caption">
      <span id={id} className="sr-only" aria-live="polite">{format(displayMonth, "MMMM yyyy")}</span>
      <Button type="button" variant="ghost" size="icon" aria-label="Previous month" title="Previous month" disabled={!previousMonth} onClick={() => previousMonth && goToMonth(previousMonth)}>
        <ChevronLeft aria-hidden="true" />
      </Button>
      <Select value={String(displayMonth.getMonth())} onValueChange={month => goToMonth(setMonth(displayMonth, Number(month)))}>
        <SelectTrigger aria-label="Month"><SelectValue /></SelectTrigger>
        <SelectContent className="creation-calendar-month-menu" collisionPadding={12}><SelectGroup>
          {Array.from({ length: 12 }, (_, month) => <SelectItem key={month} value={String(month)} disabled={month > maxMonth}>{format(setMonth(displayMonth, month), "MMMM")}</SelectItem>)}
        </SelectGroup></SelectContent>
      </Select>
      <CalendarYear year={year} max={today.getFullYear()} onCommit={nextYear => goToMonth(setYear(startOfMonth(displayMonth), nextYear))} />
      <Button type="button" variant="ghost" size="icon" aria-label="Next month" title="Next month" disabled={!nextMonth} onClick={() => nextMonth && goToMonth(nextMonth)}>
        <ChevronRight aria-hidden="true" />
      </Button>
    </div>
  );
}

function CalendarYear({ year, max, onCommit }: { year: number; max: number; onCommit: (year: number) => void }) {
  const [draft, setDraft] = useState(String(year));
  useEffect(() => setDraft(String(year)), [year]);
  const commit = () => {
    const next = Number(draft);
    if (!Number.isInteger(next) || next < 1 || next > max) { setDraft(String(year)); return; }
    setDraft(String(next));
    if (next !== year) onCommit(next);
  };

  return <Input
    type="number"
    inputMode="numeric"
    aria-label="Year"
    min={1}
    max={max}
    value={draft}
    onChange={event => setDraft(event.target.value)}
    onBlur={commit}
    onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); commit(); } }}
  />;
}

function CreationCalendarDay({ date }: DayContentProps) {
  return <><span aria-hidden="true">{format(date, "d")}</span><span className="sr-only">{format(date, "EEEE, MMMM d, yyyy")}</span></>;
}
