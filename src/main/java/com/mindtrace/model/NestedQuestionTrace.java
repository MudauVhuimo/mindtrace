package com.mindtrace.model;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Full representation of a nested (multi-part) question together with traces for each part.
 * This realizes the "nested question workflow" example in Readme.md, including the use of
 * REMINDER nodes inside later subquestion traces.
 */
public record NestedQuestionTrace(
        NestedQuestion nestedQuestion,
        List<SubquestionTrace> subquestionTraces
) {

    public NestedQuestionTrace {
        if (nestedQuestion == null) {
            throw new IllegalArgumentException("nestedQuestion is required");
        }
        if (subquestionTraces == null || subquestionTraces.isEmpty()) {
            throw new IllegalArgumentException("subquestionTraces must not be empty");
        }
        subquestionTraces = List.copyOf(subquestionTraces);

        // Basic consistency check: labels in traces must match the declared subquestions order
        List<String> declaredLabels = nestedQuestion.subquestions().stream()
                .map(Subquestion::label)
                .toList();
        List<String> traceLabels = subquestionTraces.stream()
                .map(SubquestionTrace::label)
                .toList();
        if (!declaredLabels.equals(traceLabels)) {
            throw new IllegalArgumentException("subquestionTraces labels " + traceLabels +
                    " must match the order and labels in nestedQuestion: " + declaredLabels);
        }
    }

    /**
     * Returns a map from label (e.g. "a") to its SubquestionTrace for easy lookup.
     */
    public Map<String, SubquestionTrace> tracesByLabel() {
        Map<String, SubquestionTrace> map = new LinkedHashMap<>();
        for (SubquestionTrace st : subquestionTraces) {
            map.put(st.label(), st);
        }
        return map;
    }

    public String prettyPrint() {
        StringBuilder sb = new StringBuilder();

        sb.append("NESTED QUESTION\n");
        sb.append("====================================\n");
        sb.append("Context: ").append(nestedQuestion.context()).append("\n\n");

        // Show the tree structure like in the README (ASCII version)
        List<Subquestion> subs = nestedQuestion.subquestions();
        for (int i = 0; i < subs.size(); i++) {
            Subquestion sq = subs.get(i);
            String prefix = (i == subs.size() - 1) ? "`-- " : "|-- ";
            sb.append(prefix).append('(').append(sq.label()).append(") ")
              .append(sq.problemStatement()).append("\n");

            if (!sq.dependsOn().isEmpty()) {
                sb.append("    dependsOn: ").append(sq.dependsOn()).append("\n");
            }
            sb.append("\n");
        }

        // Now render each subquestion's trace + final answer
        sb.append("\n====================================\n");
        sb.append("TRACES PER SUBQUESTION\n");
        sb.append("====================================\n\n");

        for (SubquestionTrace st : subquestionTraces) {
            Subquestion sq = st.subquestion();
            sb.append("--- Subquestion (").append(sq.label()).append(") ---\n");
            sb.append(sq.problemStatement()).append("\n\n");

            sb.append(st.trace().prettyPrint()).append("\n");

            sb.append("------------------------------------\n");
            sb.append("FINAL ANSWER for (").append(sq.label()).append(")\n");
            sb.append("------------------------------------\n");
            sb.append(st.finalAnswer().workings()).append("\n\n");
            sb.append(st.finalAnswer().conclusion()).append("\n\n");
        }

        return sb.toString();
    }
}
