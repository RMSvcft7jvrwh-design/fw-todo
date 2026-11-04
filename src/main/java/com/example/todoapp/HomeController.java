package com.example.todoapp;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import jakarta.validation.Valid;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class HomeController {

    private static final String DEFAULT_RETURN_TO = "/todos";
    private static final Pattern MONTH_RETURN_TO = Pattern.compile("/calendar\\?year=(\\d{4})&month=(\\d{1,2})");
    private static final Pattern WEEK_RETURN_TO = Pattern.compile("/calendar\\?view=week&from=(\\d{4}-\\d{2}-\\d{2})");

    private final TodoService todoService;

    public HomeController(TodoService todoService) {
        this.todoService = todoService;
    }

    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("title", "やること管理");
        return "index";
    }

    @GetMapping("/settings")
    public String settings() {
        return "settings";
    }

    @GetMapping("/todos")
    public String todos(@RequestParam(name = "keyword", defaultValue = "") String keyword,
            @RequestParam(name = "category", defaultValue = "") String category,
            @RequestParam(name = "order", defaultValue = "asc") String order, Model model) {
        String sortOrder = "desc".equals(order) ? "desc" : "asc";
        model.addAttribute("todos", todoService.search(keyword, category, sortOrder));
        model.addAttribute("keyword", keyword);
        model.addAttribute("category", category);
        model.addAttribute("order", sortOrder);
        model.addAttribute("today", LocalDate.now(ZoneId.of("Asia/Tokyo")));
        return "todos";
    }

    @GetMapping("/todos/new")
    public String create(Model model) {
        model.addAttribute("todo", new Todo());
        return "create";
    }

    @PostMapping("/todos/confirm")
    public String createConfirm(@Valid @ModelAttribute("todo") Todo todo, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            return "create";
        }
        return "create-confirm";
    }

    @PostMapping("/todos/new")
    public String createAgain(@ModelAttribute("todo") Todo todo) {
        return "create";
    }

    @PostMapping("/todos")
    public String insert(@ModelAttribute("todo") Todo todo, RedirectAttributes redirectAttributes) {
        todoService.create(todo);
        redirectAttributes.addFlashAttribute("message", "登録しました");
        return "redirect:/todos";
    }

    @GetMapping("/todos/{id}/edit")
    public String edit(@PathVariable("id") Long id,
            @RequestParam(name = "returnTo", required = false) String returnTo,
            Model model, RedirectAttributes redirectAttributes) {
        Todo todo = todoService.findById(id);
        if (todo == null) {
            redirectAttributes.addFlashAttribute("message", "見つかりませんでした");
            return "redirect:/todos";
        }
        model.addAttribute("todo", todo);
        model.addAttribute("id", id);
        model.addAttribute("returnTo", safeReturnTo(returnTo));
        return "edit";
    }

    @PostMapping("/todos/{id}/confirm")
    public String editConfirm(@PathVariable("id") Long id, @Valid @ModelAttribute("todo") Todo todo,
            BindingResult bindingResult, @RequestParam(name = "returnTo", required = false) String returnTo,
            Model model) {
        model.addAttribute("id", id);
        model.addAttribute("returnTo", safeReturnTo(returnTo));
        if (bindingResult.hasErrors()) {
            return "edit";
        }
        return "edit-confirm";
    }

    @PostMapping("/todos/{id}/edit")
    public String editAgain(@PathVariable("id") Long id, @ModelAttribute("todo") Todo todo,
            @RequestParam(name = "returnTo", required = false) String returnTo, Model model) {
        model.addAttribute("id", id);
        model.addAttribute("returnTo", safeReturnTo(returnTo));
        return "edit";
    }

    @PostMapping("/todos/{id}")
    public String update(@PathVariable("id") Long id, @ModelAttribute("todo") Todo todo,
            @RequestParam(name = "returnTo", required = false) String returnTo,
            RedirectAttributes redirectAttributes) {
        todo.setId(id);
        todoService.update(todo);
        redirectAttributes.addFlashAttribute("message", "保存しました");
        return "redirect:" + safeReturnTo(returnTo);
    }

    private String safeReturnTo(String returnTo) {
        if (DEFAULT_RETURN_TO.equals(returnTo)) {
            return DEFAULT_RETURN_TO;
        }

        Matcher month = MONTH_RETURN_TO.matcher(returnTo == null ? "" : returnTo);
        if (month.matches()) {
            try {
                int year = Integer.parseInt(month.group(1));
                int monthNumber = Integer.parseInt(month.group(2));
                if (year >= 1) {
                    YearMonth.of(year, monthNumber);
                    return "/calendar?year=" + year + "&month=" + monthNumber;
                }
            } catch (RuntimeException ignored) {
                return DEFAULT_RETURN_TO;
            }
        }

        Matcher week = WEEK_RETURN_TO.matcher(returnTo == null ? "" : returnTo);
        if (week.matches()) {
            try {
                LocalDate from = LocalDate.parse(week.group(1));
                if (from.getYear() >= 1) {
                    return "/calendar?view=week&from=" + from;
                }
            } catch (RuntimeException ignored) {
                return DEFAULT_RETURN_TO;
            }
        }
        return DEFAULT_RETURN_TO;
    }

    @GetMapping("/todos/{id}/delete")
    public String deleteConfirm(@PathVariable("id") Long id, Model model,
            RedirectAttributes redirectAttributes) {
        Todo todo = todoService.findById(id);
        if (todo == null) {
            redirectAttributes.addFlashAttribute("message", "見つかりませんでした");
            return "redirect:/todos";
        }
        model.addAttribute("todo", todo);
        return "delete";
    }

    @PostMapping("/todos/{id}/delete")
    public String delete(@PathVariable("id") Long id, RedirectAttributes redirectAttributes) {
        todoService.delete(id);
        redirectAttributes.addFlashAttribute("message", "削除しました");
        return "redirect:/todos";
    }
}
