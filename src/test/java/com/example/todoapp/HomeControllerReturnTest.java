package com.example.todoapp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.ui.ExtendedModelMap;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.web.servlet.mvc.support.RedirectAttributesModelMap;

class HomeControllerReturnTest {

    private final TodoService todoService = mock(TodoService.class);
    private final HomeController controller = new HomeController(todoService);

    @Test
    void monthReturnSurvivesConfirmationAndSave() {
        String returnTo = "/calendar?year=2026&month=10";
        Todo todo = new Todo();
        when(todoService.findById(7L)).thenReturn(todo);

        ExtendedModelMap editModel = new ExtendedModelMap();
        assertEquals("edit", controller.edit(7L, returnTo, editModel, new RedirectAttributesModelMap()));
        assertEquals(returnTo, editModel.get("returnTo"));

        ExtendedModelMap confirmModel = new ExtendedModelMap();
        assertEquals("edit-confirm", controller.editConfirm(7L, todo,
                new BeanPropertyBindingResult(todo, "todo"), returnTo, confirmModel));
        assertEquals(returnTo, confirmModel.get("returnTo"));
        assertEquals("redirect:" + returnTo, controller.update(7L, todo, returnTo,
                new RedirectAttributesModelMap()));
    }

    @Test
    void weekReturnSurvivesValidationErrorAndRewrite() {
        String returnTo = "/calendar?view=week&from=2026-10-25";
        Todo todo = new Todo();
        BeanPropertyBindingResult errors = new BeanPropertyBindingResult(todo, "todo");
        errors.rejectValue("title", "invalid");

        ExtendedModelMap errorModel = new ExtendedModelMap();
        assertEquals("edit", controller.editConfirm(7L, todo, errors, returnTo, errorModel));
        assertEquals(returnTo, errorModel.get("returnTo"));

        ExtendedModelMap rewriteModel = new ExtendedModelMap();
        assertEquals("edit", controller.editAgain(7L, todo, returnTo, rewriteModel));
        assertEquals(returnTo, rewriteModel.get("returnTo"));
        assertEquals("redirect:" + returnTo, controller.update(7L, todo, returnTo,
                new RedirectAttributesModelMap()));
    }

    @Test
    void missingReturnUsesTodoList() {
        Todo todo = new Todo();
        when(todoService.findById(7L)).thenReturn(todo);
        ExtendedModelMap editModel = new ExtendedModelMap();
        assertEquals("edit", controller.edit(7L, null, editModel, new RedirectAttributesModelMap()));
        assertEquals("/todos", editModel.get("returnTo"));
        assertEquals("redirect:/todos", controller.update(7L, todo, null,
                new RedirectAttributesModelMap()));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://example.com/",
            "//example.com/",
            "/todos/new",
            "/calendar?year=2026&month=13",
            "/calendar?view=week&from=2026-02-30",
            "/calendar?year=2026&month=10%0d%0aLocation:example.com"
    })
    void unapprovedReturnUsesTodoList(String returnTo) {
        Todo todo = new Todo();
        assertEquals("redirect:/todos", controller.update(7L, todo, returnTo,
                new RedirectAttributesModelMap()));
    }
}
