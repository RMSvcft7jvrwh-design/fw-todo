package com.example.todoapp.api;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HolidayApiController {
    private final HolidayClient holidayClient;

    public HolidayApiController(HolidayClient holidayClient) {
        this.holidayClient = holidayClient;
    }

    @GetMapping("/api/holidays")
    public ResponseEntity<Map<String, String>> holidays(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        Optional<Map<String, String>> result = holidayClient.fetchHolidays();
        if (result.isEmpty()) {
            return ResponseEntity.ok()
                    .header("X-Holidays-Unavailable", "true")
                    .body(Map.<String, String>of());
        }

        Map<String, String> holidays = result.get();
        if (from == null && to == null) {
            return ResponseEntity.ok(holidays);
        }

        Map<String, String> filtered = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : holidays.entrySet()) {
            LocalDate date = LocalDate.parse(entry.getKey());
            if ((from == null || !date.isBefore(from))
                    && (to == null || !date.isAfter(to))) {
                filtered.put(entry.getKey(), entry.getValue());
            }
        }
        return ResponseEntity.ok(filtered);
    }
}
