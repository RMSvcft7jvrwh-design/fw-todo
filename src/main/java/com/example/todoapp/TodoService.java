package com.example.todoapp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class TodoService {

    private final TodoMapper todoMapper;

    public TodoService(TodoMapper todoMapper) {
        this.todoMapper = todoMapper;
    }

    public List<Todo> search(String keyword, String category, String order) {
        return search(keyword, category, order, null, null);
    }

    public List<Todo> search(String keyword, String category, String order, LocalDate from, LocalDate to) {
        return todoMapper.search(keyword, category, order, from, to);
    }

    public List<Todo> searchCompletedBetween(LocalDateTime from, LocalDateTime toExclusive) {
        return todoMapper.searchCompletedBetween(from, toExclusive);
    }

    public Todo findById(Long id) {
        return todoMapper.findById(id);
    }

    public void create(Todo todo) {
        todoMapper.insert(todo);
        log.info("Todoを登録しました");
    }

    public void update(Todo todo) {
        // The mapper uses this time only for an incomplete-to-complete transition.
        todo.setCompletedAt(LocalDateTime.now(ZoneId.of("Asia/Tokyo")));
        todoMapper.update(todo);
        log.info("Todoを編集しました");
    }

    public void delete(Long id) {
        todoMapper.deleteById(id);
        log.info("Todoを削除しました");
    }
}
