package com.mindtrace.model;

/**
 * A complete captured trace for a simple (non-nested) question.
 * This assembles all the layers described in Readme.md:
 *   - The original Question
 *   - Layer 1: the reasoning Trace + the polished FinalAnswer
 *   - Layer 2: KnowledgeMap
 *   - Layer 3: PatternSummary
 */
public record QuestionTrace(
        Question question,
        Trace trace,
        FinalAnswer finalAnswer,
        KnowledgeMap knowledgeMap,
        PatternSummary patternSummary
) {

    public QuestionTrace {
        if (question == null) {
            throw new IllegalArgumentException("question is required");
        }
        if (question.isNested()) {
            throw new IllegalArgumentException("Use NestedQuestionTrace for nested questions (isNested=true)");
        }
        if (trace == null) {
            throw new IllegalArgumentException("trace is required");
        }
        if (finalAnswer == null) {
            throw new IllegalArgumentException("finalAnswer is required");
        }
        if (knowledgeMap == null) {
            throw new IllegalArgumentException("knowledgeMap is required");
        }
        if (patternSummary == null) {
            throw new IllegalArgumentException("patternSummary is required");
        }
    }

    public String prettyPrint() {
        StringBuilder sb = new StringBuilder();
        sb.append("QUESTION\n");
        sb.append("====================================\n");
        sb.append(question.problemStatement()).append("\n\n");

        sb.append(trace.prettyPrint()).append("\n");

        sb.append("------------------------------------\n");
        sb.append("FINAL ANSWER - WRITE THIS IN YOUR EXAM\n");
        sb.append("------------------------------------\n");
        sb.append(finalAnswer.workings()).append("\n\n");
        sb.append(finalAnswer.conclusion()).append("\n\n");

        sb.append(renderKnowledgeMap()).append("\n");
        sb.append(renderPatternSummary());
        return sb.toString();
    }

    private String renderKnowledgeMap() {
        return "LAYER 2 - KNOWLEDGE MAP\n" +
               "------------------------------------\n" +
               "BEFORE (prerequisites): " + knowledgeMap.before() + "\n" +
               "TEACHES (what this trace gives you): " + knowledgeMap.teaches() + "\n" +
               "ASSUMES (silent background): " + knowledgeMap.assumes() + "\n";
    }

    private String renderPatternSummary() {
        return "LAYER 3 - PATTERN SUMMARY (generalizable)\n" +
               "------------------------------------\n" +
               "WHEN YOU SEE: " + patternSummary.whenYouSee() + "\n\n" +
               "ALWAYS START BY: " + patternSummary.alwaysStartBy() + "\n\n" +
               "THE UNLOCKING MOVE: " + patternSummary.theUnlockingMove() + "\n\n" +
               "HOW YOU KNOW YOU'RE DONE: " + patternSummary.howYouKnowYoureDone() + "\n\n" +
               "COMMON MISTAKE: " + patternSummary.commonMistake() + "\n";
    }
}
