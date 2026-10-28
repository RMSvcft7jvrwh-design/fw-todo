package com.example.todoapp;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.DayOfWeek;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.server.ResponseStatusException;

@Controller
public class CalendarController {

    @GetMapping("/calendar")
    public String calendar(@RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(defaultValue = "month") String view,
            @RequestParam(required = false) String from, Model model) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Tokyo"));
        model.addAttribute("today", today);
        model.addAttribute("todayWeekStart", today.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY)));
        if (!view.equals("month") && !view.equals("week")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid view");
        }

        if (view.equals("week")) {
            LocalDate requested;
            try {
                requested = from == null ? today : LocalDate.parse(from);
            } catch (RuntimeException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid from", e);
            }
            LocalDate weekStart = requested.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY));
            LocalDate weekEnd = weekStart.plusDays(6);
            model.addAttribute("isWeek", true);
            model.addAttribute("firstDay", weekStart);
            model.addAttribute("lastDay", weekEnd);
            model.addAttribute("weeks", List.of(weekStart.datesUntil(weekEnd.plusDays(1)).toList()));
            model.addAttribute("weekdayNames", List.of("日", "月", "火", "水", "木", "金", "土"));
            model.addAttribute("previousWeek", weekStart.minusWeeks(1));
            model.addAttribute("nextWeek", weekStart.plusWeeks(1));
            model.addAttribute("weekFrom", weekStart);
            model.addAttribute("year", requested.getYear());
            model.addAttribute("month", requested.getMonthValue());
            return "calendar";
        }

        YearMonth current = YearMonth.from(today);
        int selectedYear = year == null ? current.getYear() : year;
        int selectedMonth = month == null ? current.getMonthValue() : month;
        if (selectedYear < 1 || selectedYear > 9999 || selectedMonth < 1 || selectedMonth > 12) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid year or month");
        }

        YearMonth selected = YearMonth.of(selectedYear, selectedMonth);
        LocalDate firstDay = selected.atDay(1);
        LocalDate lastDay = selected.atEndOfMonth();
        int daysBeforeFirst = firstDay.getDayOfWeek().getValue() % 7;
        int cellCount = ((daysBeforeFirst + selected.lengthOfMonth() + 6) / 7) * 7;
        List<List<LocalDate>> weeks = new ArrayList<>();

        for (int cell = 0; cell < cellCount; cell += 7) {
            List<LocalDate> week = new ArrayList<>();
            for (int dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                int day = cell + dayOfWeek - daysBeforeFirst + 1;
                week.add(day >= 1 && day <= selected.lengthOfMonth() ? selected.atDay(day) : null);
            }
            weeks.add(week);
        }

        YearMonth previous = selected.minusMonths(1);
        YearMonth next = selected.plusMonths(1);
        model.addAttribute("year", selectedYear);
        model.addAttribute("month", selectedMonth);
        model.addAttribute("firstDay", firstDay);
        model.addAttribute("lastDay", lastDay);
        model.addAttribute("weeks", weeks);
        model.addAttribute("previousYear", previous.getYear());
        model.addAttribute("previousMonth", previous.getMonthValue());
        model.addAttribute("nextYear", next.getYear());
        model.addAttribute("nextMonth", next.getMonthValue());
        model.addAttribute("weekFrom", selected.equals(current) ? today : firstDay);
        model.addAttribute("isWeek", false);
        return "calendar";
    }
}
