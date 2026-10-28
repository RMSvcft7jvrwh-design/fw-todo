package com.example.todoapp.mcp;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.ai.mcp.annotation.McpTool;
import org.springframework.ai.mcp.annotation.McpToolParam;
import org.springframework.stereotype.Component;

import com.example.todoapp.Todo;
import com.example.todoapp.TodoService;
import com.example.todoapp.api.HolidayClient;
import com.example.todoapp.api.TodoDto;

@Component
public class TodoTools {

    private static final Set<String> CATEGORIES = Set.of(
            "デザイン", "マーケティング", "プログラミング", "資格", "就職活動");

    private final TodoService todoService;
    private final HolidayClient holidayClient;

    public TodoTools(TodoService todoService, HolidayClient holidayClient) {
        this.todoService = todoService;
        this.holidayClient = holidayClient;
    }

    @McpTool(name = "list_todos", description = "やることの一覧を返す（期間・ジャンルで絞れる）")
    public List<TodoDto> listTodos(
            @McpToolParam(required = false, description = "やることの名前の一部") String keyword,
            @McpToolParam(required = false, description = "ジャンル") String category,
            @McpToolParam(required = false, description = "期限の範囲の開始日（yyyy-MM-dd）") String from,
            @McpToolParam(required = false, description = "期限の範囲の終了日（yyyy-MM-dd）") String to) {
        LocalDate fromDate = from == null ? null : LocalDate.parse(from);
        LocalDate toDate = to == null ? null : LocalDate.parse(to);
        return todoService.search(keyword, category, "asc", fromDate, toDate).stream()
                .map(TodoDto::from)
                .toList();
    }

    @McpTool(name = "summarize_week", description = "指定期間のやることを集計・要約し、総件数・ジャンル別件数・期限切れ件数を返す（期間省略時は全件）")
    public Map<String, Object> summarizeWeek(
            @McpToolParam(required = false, description = "期限の範囲の開始日（yyyy-MM-dd）") String from,
            @McpToolParam(required = false, description = "期限の範囲の終了日（yyyy-MM-dd）") String to) {
        LocalDate fromDate = from == null ? null : LocalDate.parse(from);
        LocalDate toDate = to == null ? null : LocalDate.parse(to);
        List<Todo> todos = todoService.search(null, null, "asc", fromDate, toDate);
        Map<String, Long> categoryCounts = todos.stream()
                .collect(Collectors.groupingBy(Todo::getCategory, Collectors.counting()));
        LocalDate today = LocalDate.now();
        long overdueCount = todos.stream()
                .filter(todo -> !Boolean.TRUE.equals(todo.getCompleted())
                        && todo.getDueDate() != null && todo.getDueDate().isBefore(today))
                .count();
        return Map.of("totalCount", todos.size(), "categoryCounts", categoryCounts, "overdueCount", overdueCount);
    }

    @McpTool(name = "get_todo", description = "やることを1件返す")
    public TodoDto getTodo(@McpToolParam(required = true, description = "取得するやることのID") Long id) {
        Todo todo = todoService.findById(id);
        return todo == null ? null : TodoDto.from(todo);
    }

    @McpTool(name = "add_todo", description = "やることを1件足す")
    public TodoDto addTodo(
            @McpToolParam(required = true, description = "やることの名前") String title,
            @McpToolParam(required = false, description = "メモ") String detail,
            @McpToolParam(required = true, description = "ジャンル（デザイン・マーケティング・プログラミング・資格・就職活動）") String category,
            @McpToolParam(required = true, description = "優先度（1: 高、2: 中、3: 低）") Integer priority,
            @McpToolParam(required = false, description = "期限（yyyy-MM-dd）") String dueDate) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("やることの名前を入力してください");
        }
        if (category == null || !CATEGORIES.contains(category)) {
            throw new IllegalArgumentException("ジャンルは指定された5つから選んでください");
        }
        Todo todo = new Todo();
        todo.setTitle(title);
        todo.setDetail(detail);
        todo.setCategory(category);
        todo.setPriority(priority);
        todo.setDueDate(dueDate == null || dueDate.isBlank() ? null : LocalDate.parse(dueDate));
        todo.setCompleted(false);
        todoService.create(todo);
        return TodoDto.from(todoService.findById(todo.getId()));
    }

    @McpTool(name = "update_todo", description = "やることを1件直す（期限を変えるのもこれ）")
    public TodoDto updateTodo(
            @McpToolParam(required = true, description = "直すやることのID") Long id,
            @McpToolParam(required = false, description = "新しいやることの名前") String title,
            @McpToolParam(required = false, description = "新しいメモ（空文字で消す）") String detail,
            @McpToolParam(required = false, description = "新しいジャンル（デザイン・マーケティング・プログラミング・資格・就職活動）") String category,
            @McpToolParam(required = false, description = "新しい優先度（1: 高、2: 中、3: 低）") Integer priority,
            @McpToolParam(required = false, description = "新しい期限（yyyy-MM-dd、空文字で消す）") String dueDate) {
        Todo todo = todoService.findById(id);
        if (todo == null) {
            throw new IllegalArgumentException("指定したやることが見つかりません: " + id);
        }
        if (title != null) {
            if (title.isBlank()) {
                throw new IllegalArgumentException("やることの名前を入力してください");
            }
            todo.setTitle(title);
        }
        if (detail != null) {
            todo.setDetail(detail);
        }
        if (category != null) {
            if (!CATEGORIES.contains(category)) {
                throw new IllegalArgumentException("ジャンルは指定された5つから選んでください");
            }
            todo.setCategory(category);
        }
        if (priority != null) {
            todo.setPriority(priority);
        }
        if (dueDate != null) {
            todo.setDueDate(dueDate.isBlank() ? null : LocalDate.parse(dueDate));
        }
        todoService.update(todo);
        return TodoDto.from(todoService.findById(id));
    }

    @McpTool(name = "complete_todo", description = "やることを完了にする")
    public TodoDto completeTodo(@McpToolParam(required = true, description = "完了にするやることのID") Long id) {
        Todo todo = todoService.findById(id);
        if (todo == null) {
            throw new IllegalArgumentException("指定したやることが見つかりません: " + id);
        }
        todo.setCompleted(true);
        todoService.update(todo);
        return TodoDto.from(todoService.findById(id));
    }

    @McpTool(name = "delete_todo", description = "やることを1件消す")
    public String deleteTodo(@McpToolParam(required = true, description = "消すやることのID") Long id) {
        if (todoService.findById(id) == null) {
            throw new IllegalArgumentException("指定したやることが見つかりません: " + id);
        }
        todoService.delete(id);
        return "やることを削除しました: " + id;
    }

    @McpTool(name = "find_free_days", description = "期間の中で、期限のやることが無く、土日でも祝日でもない「空いている日」を返す。やることの期限を動かす先を決めるのに使う")
    public List<LocalDate> findFreeDays(
            @McpToolParam(required = true, description = "開始日（yyyy-MM-dd）") String from,
            @McpToolParam(required = true, description = "終了日（yyyy-MM-dd）") String to) {
        LocalDate fromDate = LocalDate.parse(from);
        LocalDate toDate = LocalDate.parse(to);
        if (fromDate.isAfter(toDate)) {
            throw new IllegalArgumentException("開始日は終了日以前にしてください");
        }
        Set<LocalDate> busyDays = todoService.search(null, null, "asc", fromDate, toDate).stream()
                .map(Todo::getDueDate)
                .collect(Collectors.toSet());
        Set<String> holidays = holidayClient.fetchHolidays()
                .orElse(Map.of())
                .keySet();
        return fromDate.datesUntil(toDate.plusDays(1))
                .filter(date -> !busyDays.contains(date))
                .filter(date -> date.getDayOfWeek() != DayOfWeek.SATURDAY
                        && date.getDayOfWeek() != DayOfWeek.SUNDAY)
                .filter(date -> !holidays.contains(date.toString()))
                .toList();
    }
}
