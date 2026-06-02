package com.mindtrace.model;

import java.util.List;

/**
 * One part of a nested (multi-part) question, e.g. (a), (b), (c).
 * dependsOn lists the labels of earlier subquestions whose results this one builds upon.
 */
public record Subquestion(String label, String problemStatement, List<String> dependsOn) {

    public Subquestion {
        if (label == null || label.isBlank()) {
            throw new IllegalArgumentException("label is required (e.g. \"a\", \"b\")");
        }
        if (problemStatement == null || problemStatement.isBlank()) {
            throw new IllegalArgumentException("problemStatement is required");
        }
        dependsOn = (dependsOn == null) ? List.of() : List.copyOf(dependsOn);
    }
}
