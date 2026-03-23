import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon, XIcon } from "lucide-react";
import type { DateRange, Matcher } from "react-day-picker";
import { Calendar } from "@/components/calendar/Calendar";
import { Popover, PopoverContent } from "@/components/popover/Popover";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/input/base/InputGroup";
import { cn } from "@/lib/mergeClasses";

const DATE_FORMAT = "dd/MM/yyyy";
const CURRENT_YEAR = new Date().getFullYear();

export interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledDates?: Matcher | Matcher[];
  fromYear?: number;
  toYear?: number;
  className?: string;
  id?: string;
}

/**
 * Seletor de data única com entrada de texto editável e calendário popover.
 * Suporta digitação no formato dd/mm/aaaa ou seleção pelo calendário.
 */
export const DatePicker = ({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled,
  disabledDates,
  fromYear = 1900,
  toYear = CURRENT_YEAR + 20,
  className,
  id,
}: DatePickerProps) => {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(
    value ? format(value, DATE_FORMAT) : "",
  );
  const anchorRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setInputValue(value ? format(value, DATE_FORMAT) : "");
  }, [value]);

  function commitInput(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange?.(undefined);
      setInputValue("");
      return;
    }
    const parsed = parse(trimmed, DATE_FORMAT, new Date());
    if (isValid(parsed)) {
      onChange?.(parsed);
      setInputValue(format(parsed, DATE_FORMAT));
    } else {
      setInputValue(value ? format(value, DATE_FORMAT) : "");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <InputGroup ref={anchorRef} className={cn("w-44", className)}>
        <InputGroupAddon align="inline-start">
          <InputGroupButton
            size="icon-xs"
            disabled={disabled}
            aria-label="Abrir calendário"
            onClick={() => !disabled && setOpen((prev) => !prev)}
          >
            <CalendarIcon />
          </InputGroupButton>
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          value={inputValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setOpen(false)}
          onBlur={(e) => commitInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape")
              setInputValue(value ? format(value, DATE_FORMAT) : "");
          }}
        />
        {value && !disabled && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label="Limpar data"
              onClick={() => {
                onChange?.(undefined);
                setInputValue("");
              }}
            >
              <XIcon />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
      <PopoverContent className="w-auto p-0" align="start" anchor={anchorRef}>
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          captionLayout="dropdown"
          fromYear={fromYear}
          toYear={toYear}
          disabled={disabledDates}
          autoFocus
          onSelect={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledDates?: Matcher | Matcher[];
  fromYear?: number;
  toYear?: number;
  numberOfMonths?: number;
  className?: string;
  id?: string;
}

function formatRange(range?: DateRange): string {
  if (!range?.from) return "";
  const from = format(range.from, DATE_FORMAT);
  if (!range.to) return from;
  return `${from} – ${format(range.to, DATE_FORMAT)}`;
}

/**
 * Seletor de intervalo de datas com calendário de dois meses e navegação por ano/mês via dropdown.
 * Fecha automaticamente após a seleção de ambas as datas.
 */
export const DateRangePicker = ({
  value,
  onChange,
  placeholder = "dd/mm/aaaa – dd/mm/aaaa",
  disabled,
  disabledDates,
  fromYear = 1900,
  toYear = CURRENT_YEAR + 20,
  numberOfMonths = 2,
  className,
  id,
}: DateRangePickerProps) => {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const hasValue = !!(value?.from || value?.to);

  function handleSelect(range: DateRange | undefined) {
    onChange?.(range);
    if (range?.from && range?.to) setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <InputGroup
        ref={anchorRef}
        className={cn(numberOfMonths === 2 ? "w-68" : "w-44", className)}
      >
        <InputGroupAddon align="inline-start">
          <InputGroupButton
            size="icon-xs"
            disabled={disabled}
            aria-label="Abrir calendário"
            onClick={() => !disabled && setOpen((prev) => !prev)}
          >
            <CalendarIcon />
          </InputGroupButton>
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          value={formatRange(value)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly
          tabIndex={-1}
          className="cursor-pointer"
          onClick={() => !disabled && setOpen((prev) => !prev)}
        />
        {hasValue && !disabled && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label="Limpar intervalo"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onChange?.(undefined);
              }}
            >
              <XIcon />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
      <PopoverContent className="w-auto p-0" align="start" anchor={anchorRef}>
        <Calendar
          mode="range"
          selected={value}
          defaultMonth={value?.from ?? value?.to}
          captionLayout="dropdown"
          fromYear={fromYear}
          toYear={toYear}
          numberOfMonths={numberOfMonths}
          disabled={disabledDates}
          autoFocus
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
};
