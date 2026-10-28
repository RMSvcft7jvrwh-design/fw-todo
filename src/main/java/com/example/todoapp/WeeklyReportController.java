package com.example.todoapp;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.server.ResponseStatusException;

@Controller
public class WeeklyReportController {

    private static final ZoneId TOKYO = ZoneId.of("Asia/Tokyo");

    private final TodoService todoService;

    public WeeklyReportController(TodoService todoService) {
        this.todoService = todoService;
    }

    @GetMapping("/reports/weekly")
    public String weekly(@RequestParam(required = false) String from, Model model) {
        LocalDate requested;
        try {
            requested = from == null ? LocalDate.now(TOKYO) : LocalDate.parse(from);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid from", e);
        }

        LocalDate weekStart = requested.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY));
        LocalDate weekEnd = weekStart.plusDays(6);
        LocalDate nextWeekStart = weekStart.plusWeeks(1);

        List<Todo> dueTodos = todoService.search(null, null, "asc", weekStart, weekEnd);
        int dueTotal = dueTodos.size();
        long dueCompleted = dueTodos.stream().filter(todo -> Boolean.TRUE.equals(todo.getCompleted())).count();
        int dueIncomplete = dueTotal - (int) dueCompleted;
        int completionRate = dueTotal == 0 ? 0 : (int) Math.round(dueCompleted * 100.0 / dueTotal);

        List<Todo> completedTodos = todoService.searchCompletedBetween(
                weekStart.atStartOfDay(), nextWeekStart.atStartOfDay());

        model.addAttribute("weekStart", weekStart);
        model.addAttribute("weekEnd", weekEnd);
        model.addAttribute("previousWeek", weekStart.minusWeeks(1));
        model.addAttribute("nextWeek", nextWeekStart);
        model.addAttribute("dueTotal", dueTotal);
        model.addAttribute("dueCompleted", dueCompleted);
        model.addAttribute("dueIncomplete", dueIncomplete);
        model.addAttribute("completionRate", completionRate);
        model.addAttribute("dueCategoryCounts", categoryCounts(dueTodos));
        model.addAttribute("completedTotal", completedTodos.size());
        model.addAttribute("completedCategoryCounts", categoryCounts(completedTodos));
        return "weekly-report";
    }

    private Map<String, Long> categoryCounts(List<Todo> todos) {
        return todos.stream().collect(Collectors.groupingBy(Todo::getCategory, TreeMap::new, Collectors.counting()));
    }
}
