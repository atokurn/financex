"use client"

import * as React from "react"
import { addDays, format, startOfDay, endOfDay, startOfWeek, endOfWeek, 
         startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, 
         subWeeks, subMonths } from "date-fns"
import { CalendarIcon, ChevronDownIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
}: DatePickerWithRangeProps) {
  const presets = [
    {
      label: 'All Time',
      getValue: () => undefined
    },
    {
      label: 'Today',
      getValue: () => ({
        from: startOfDay(new Date()),
        to: endOfDay(new Date())
      })
    },
    {
      label: 'Yesterday',
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 1)),
        to: endOfDay(subDays(new Date(), 1))
      })
    },
    {
      label: 'This Week',
      getValue: () => ({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 })
      })
    },
    {
      label: 'This Month',
      getValue: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
      })
    },
    {
      label: 'This Year',
      getValue: () => ({
        from: startOfYear(new Date()),
        to: endOfYear(new Date())
      })
    },
    {
      label: 'Last Week',
      getValue: () => ({
        from: startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }),
        to: endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 })
      })
    },
    {
      label: 'Last Month',
      getValue: () => ({
        from: startOfMonth(subMonths(new Date(), 1)),
        to: endOfMonth(subMonths(new Date(), 1))
      })
    },
    {
      label: 'Last 30 Days',
      getValue: () => ({
        from: subDays(new Date(), 30),
        to: new Date()
      })
    },
    {
      label: 'Last 90 Days',
      getValue: () => ({
        from: subDays(new Date(), 90),
        to: new Date()
      })
    }
  ]

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                date.from.toDateString() === date.to.toDateString() ? (
                  format(date.from, "d MMMM yyyy")
                ) : (
                  <>
                    {format(date.from, "d MMMM yyyy")} - {format(date.to, "d MMMM yyyy")}
                  </>
                )
              ) : (
                format(date.from, "d MMMM yyyy")
              )
            ) : (
              <span>All Time</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={(newDate) => {
                  if (newDate?.from) {
                    // Jika mengklik tanggal yang sama atau hanya memilih satu tanggal
                    if (!newDate.to || newDate.from.toDateString() === newDate.to.toDateString()) {
                      setDate({
                        from: startOfDay(newDate.from),
                        to: endOfDay(newDate.from)
                      })
                    } else {
                      setDate({
                        from: startOfDay(newDate.from),
                        to: endOfDay(newDate.to!)
                      })
                    }
                  } else {
                    setDate(undefined)
                  }
                }}
                numberOfMonths={2}
              />
            </div>
            <div className="border-l p-2 w-[160px]">
              <div className="flex flex-col gap-1">
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    className="justify-start font-normal"
                    onClick={() => setDate(preset.getValue())}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
