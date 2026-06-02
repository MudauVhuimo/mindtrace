package com.mindtrace.model;

/**
 * The captured trace + answer for one sub-part of a nested question.
 * Each subquestion can have its own independent trace (which may contain REMINDER nodes
 * that reference earlier subquestions).
 */
public record SubquestionTrace(
        Subquestion subquestion,
        Trace trace,
        FinalAnswer finalAnswer
) {

    public SubquestionTrace {
        if (subquestion == null) throw new IllegalArgumentException("subquestion is required");
        if (trace == null) throw new IllegalArgumentException("trace is required");
        if (finalAnswer == null) throw new IllegalArgumentException("finalAnswer is required");
    }

    public String label() {
        return subquestion.label();
    }
}
