package com.mindtrace.model;

/**
 * One step in the thinking trace (Layer 1).
 * The "next" pointer forms a singly-linked list representing the ordered reasoning steps.
 * Matches the TraceNode definition in Readme.md, now with a typed NodeType.
 */
public record TraceNode(
        NodeType nodeType,
        String what,
        String why,
        String translation, // nullable — formal math notation for this step
        TraceNode next
) {

    public TraceNode {
        if (nodeType == null) {
            throw new IllegalArgumentException("nodeType is required");
        }
        if (what == null || what.isBlank()) {
            throw new IllegalArgumentException("what (plain English thought) is required");
        }
        if (why == null || why.isBlank()) {
            throw new IllegalArgumentException("why (justification) is required");
        }
        // translation may be null
    }

    public boolean isLast() {
        return next == null;
    }
}
