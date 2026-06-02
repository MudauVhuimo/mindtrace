package com.mindtrace.model;

/**
 * The clean, exam-ready solution (Layer 1 output).
 * workings = the full step-by-step that a student would write.
 * conclusion = the very last line / boxed result / QED statement.
 */
public record FinalAnswer(String workings, String conclusion) {

    public FinalAnswer {
        if (workings == null || workings.isBlank()) {
            throw new IllegalArgumentException("workings (the step-by-step solution) is required");
        }
        if (conclusion == null || conclusion.isBlank()) {
            throw new IllegalArgumentException("conclusion (final closing line) is required");
        }
    }
}
