package com.mindtrace.generation;

import java.util.List;

/**
 * DTOs used only for deserializing the structured JSON response coming back from Gemini.
 * These are intentionally simple (no validation) and get mapped to the richer domain model.
 */
public final class AiDtos {

    private AiDtos() {}

    public record AiNode(
            String nodeType,
            String what,
            String why,
            String translation   // may be null
    ) {}

    public record AiQuestion(
            String problemStatement,
            boolean isNested
    ) {}

    public record AiSubquestion(
            String label,
            String problemStatement,
            List<String> dependsOn
    ) {}

    public record AiNestedQuestion(
            String context,
            List<AiSubquestion> subquestions
    ) {}

    public record AiFinalAnswer(
            String workings,
            String conclusion
    ) {}

    public record AiKnowledgeMap(
            List<String> before,
            List<String> teaches,
            List<String> assumes
    ) {}

    public record AiPatternSummary(
            String whenYouSee,
            String alwaysStartBy,
            String theUnlockingMove,
            String howYouKnowYoureDone,
            String commonMistake
    ) {}

    public record AiSubTrace(
            AiSubquestion subquestion,
            List<AiNode> traceNodes,
            AiFinalAnswer finalAnswer
    ) {}

    /**
     * The root shape we ask Gemini to produce via responseSchema + detailed instructions.
     */
    public record AiGenerationResult(
            String kind,                    // "flat" or "nested"
            AiQuestion question,
            AiNestedQuestion nestedQuestion, // may be null for flat
            List<AiNode> traceNodes,         // used for flat
            List<AiSubTrace> subTraces,      // used for nested
            AiFinalAnswer finalAnswer,       // used for flat (top-level)
            AiKnowledgeMap knowledgeMap,
            AiPatternSummary patternSummary
    ) {}
}
