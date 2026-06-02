package com.mindtrace.generation;

import com.mindtrace.model.NestedQuestionTrace;
import com.mindtrace.model.QuestionTrace;

/**
 * Generates structured MindTrace artifacts (QuestionTrace or NestedQuestionTrace)
 * from raw problem text, using an AI model (currently Gemini).
 *
 * The generated traces should closely follow the style, node types, layer structure,
 * REMINDER usage for nested questions, and quality of the examples in Readme.md.
 */
public interface TraceGenerator {

    /**
     * Generate a trace for a (possibly nested) mathematical problem.
     *
     * @param rawProblemText the exact text of the question as the student sees it
     *                       (e.g. "Prove that ... " or a full multi-part question with context + (a)(b)(c))
     * @return either a QuestionTrace (flat) or NestedQuestionTrace
     */
    GeneratedTrace generate(String rawProblemText);

    /**
     * Wrapper that tells the caller whether a flat or nested trace was produced.
     */
    sealed interface GeneratedTrace permits GeneratedTrace.Flat, GeneratedTrace.Nested {
        record Flat(QuestionTrace trace) implements GeneratedTrace {}
        record Nested(NestedQuestionTrace trace) implements GeneratedTrace {}
    }
}
