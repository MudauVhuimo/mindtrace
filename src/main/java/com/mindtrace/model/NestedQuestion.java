package com.mindtrace.model;

import java.util.List;

/**
 * A multi-part question with shared context and ordered subquestions.
 * See the "nested question workflow" section in Readme.md for the vector space example.
 */
public record NestedQuestion(String context, List<Subquestion> subquestions) {

    public NestedQuestion {
        if (context == null || context.isBlank()) {
            throw new IllegalArgumentException("context is required (shared setup text)");
        }
        if (subquestions == null || subquestions.isEmpty()) {
            throw new IllegalArgumentException("subquestions list must not be empty");
        }
        subquestions = List.copyOf(subquestions);
    }
}
