package com.mindtrace.model;

/**
 * The allowed categories for a single thinking step (TraceNode) in a mathematical problem trace.
 * These categories come directly from the MindTrace vision in Readme.md.
 */
public enum NodeType {
    READ("Interpret the problem exactly as written on the page."),
    RECOGNIZE("Identify the problem type or category from keywords, structure, and cues."),
    STRATEGY("Choose the overall approach, technique, or high-level plan."),
    SUBGOAL("Break the current goal into smaller, actionable sub-steps."),
    INSIGHT("A key mathematical observation, definition recall, or crucial translation."),
    REMINDER("Carry forward a previously established result from an earlier subquestion (used in nested questions)."),
    VERIFY("Check that the work so far actually satisfies the goal / definition / conditions."),
    COMPOSE("Assemble the clean, polished, exam-style final write-up from the scratch work.");

    private final String purpose;

    NodeType(String purpose) {
        this.purpose = purpose;
    }

    /**
     * Returns the short purpose description for this node type (from the spec).
     */
    public String purpose() {
        return purpose;
    }
}
