package com.mindtrace.model;

import java.util.List;

/**
 * Layer 2 metadata for a trace (Readme.md).
 * Captures prerequisite concepts, what the trace teaches, and silent background assumptions.
 */
public record KnowledgeMap(List<String> before, List<String> teaches, List<String> assumes) {

    public KnowledgeMap {
        before = (before == null) ? List.of() : List.copyOf(before);
        teaches = (teaches == null) ? List.of() : List.copyOf(teaches);
        assumes = (assumes == null) ? List.of() : List.copyOf(assumes);
    }
}
