package com.example.todoapp;

import java.time.LocalDate;
import java.time.YearMonth;
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
            @RequestParam(required = false) Integer month, Model model) {
        YearMonth current = YearMonth.now();
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
        return "calendar";
    }
}
