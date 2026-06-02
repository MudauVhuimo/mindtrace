package com.mindtrace.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * A complete chain of TraceNodes representing the step-by-step thinking process
 * for solving one problem (or one subquestion).
 *
 * Construction is done via the fluent Builder so you can write:
 *   Trace trace = Trace.builder()
 *       .add(NodeType.READ, "We read...", "From the paper")
 *       .add(NodeType.RECOGNIZE, "...", "...")
 *       .build();
 *
 * The linked list structure (via TraceNode.next) is faithful to the spec in Readme.md.
 * Trace also gives you random-access via toList() and nice console visualization.
 */
public final class Trace {

    private final TraceNode head;

    private Trace(TraceNode head) {
        this.head = head;
    }

    public static Builder builder() {
        return new Builder();
    }

    /**
     * First node in the trace (or null if empty).
     */
    public TraceNode head() {
        return head;
    }

    public boolean isEmpty() {
        return head == null;
    }

    /**
     * Returns an immutable list of all nodes in order by following the next pointers.
     * Very convenient for iteration, JSON export, etc.
     */
    public List<TraceNode> toList() {
        if (head == null) {
            return List.of();
        }
        List<TraceNode> nodes = new ArrayList<>();
        TraceNode current = head;
        while (current != null) {
            nodes.add(current);
            current = current.next();
        }
        return List.copyOf(nodes);
    }

    /**
     * Renders the trace in a human-readable form close to the examples in Readme.md.
     * Includes node type headers, the "what", the "why", translations when present,
     * and ↓ arrows between steps.
     */
    public String prettyPrint() {
        if (isEmpty()) {
            return "(empty trace)";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("TRACE (Layer 1 - thinking process)\n");
        sb.append("------------------------------------\n");

        List<TraceNode> nodes = toList();
        for (int i = 0; i < nodes.size(); i++) {
            TraceNode n = nodes.get(i);

            sb.append('[').append(n.nodeType().name()).append("]\n");

            // what - may be multi-line
            sb.append(indent(n.what(), 0)).append('\n');

            if (n.translation() != null && !n.translation().isBlank()) {
                sb.append("    Translation: ").append(n.translation()).append('\n');
            }

            sb.append("    Why: ").append(indent(n.why(), 4).trim()).append('\n');

            if (!n.isLast()) {
                sb.append("        |\n");
                sb.append("        v\n");
            }
        }
        return sb.toString();
    }

    private static String indent(String text, int spaces) {
        if (text == null) return "";
        String prefix = " ".repeat(spaces);
        return text.lines()
                .map(line -> prefix + line)
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
    }

    /**
     * Fluent builder for constructing a Trace sequentially (the natural way humans think).
     */
    public static final class Builder {
        private final List<NodeData> data = new ArrayList<>();

        private record NodeData(NodeType type, String what, String why, String translation) {}

        public Builder add(NodeType type, String what, String why) {
            return addWithTranslation(type, what, why, null);
        }

        public Builder addWithTranslation(NodeType type, String what, String why, String translation) {
            Objects.requireNonNull(type, "nodeType is required");
            if (what == null || what.isBlank()) {
                throw new IllegalArgumentException("what is required");
            }
            if (why == null || why.isBlank()) {
                throw new IllegalArgumentException("why is required");
            }
            data.add(new NodeData(type, what, why, translation));
            return this;
        }

        /**
         * Builds the immutable linked TraceNode chain (created backwards internally
         * because TraceNode is an immutable record).
         */
        public Trace build() {
            if (data.isEmpty()) {
                return new Trace(null);
            }

            TraceNode current = null;
            // Create from the end so each node can point to the already-built "next"
            for (int i = data.size() - 1; i >= 0; i--) {
                NodeData d = data.get(i);
                current = new TraceNode(d.type, d.what, d.why, d.translation, current);
            }
            return new Trace(current);
        }
    }
}
