package com.example.todoapp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface TodoMapper {
    List<Todo> search(@Param("keyword") String keyword, @Param("category") String category,
            @Param("order") String order, @Param("from") LocalDate from, @Param("to") LocalDate to);

    List<Todo> searchCompletedBetween(@Param("from") LocalDateTime from,
            @Param("toExclusive") LocalDateTime toExclusive);

    Todo findById(@Param("id") Long id);

    void insert(Todo todo);

    void update(Todo todo);

    void deleteById(@Param("id") Long id);
}
