package com.mindtrace.model;

import java.util.Objects;

/**
 * Top-level question as described in Readme.md.
 * problemStatement should be exactly what is written on the paper / exam.
 */
public record Question(String problemStatement, boolean isNested) {

    public Question {
        if (problemStatement == null || problemStatement.isBlank()) {
            throw new IllegalArgumentException("problemStatement is required and must not be blank");
        }
        // isNested just flags whether a NestedQuestion structure exists for this question
    }
}
