package com.mindtrace.generation;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Schema;
import com.google.genai.types.Type;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.mindtrace.model.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Production implementation of TraceGenerator that uses the official
 * Google Gen AI Java SDK to call Gemini with a strong system instruction,
 * detailed user prompt, and a responseSchema that forces the exact JSON
 * structure we need.
 *
 * The prompts are designed so the generated content matches the depth,
 * node sequencing, REMINDER usage, KnowledgeMap, PatternSummary, and
 * FinalAnswer style shown in Readme.md examples.
 */
public class GeminiTraceGenerator implements TraceGenerator {

    private final Client client;
    private final String modelName;
    private final Gson gson;

    public GeminiTraceGenerator() {
        this(System.getenv().getOrDefault("GOOGLE_API_KEY",
                System.getenv().getOrDefault("GEMINI_API_KEY", null)));
    }

    public GeminiTraceGenerator(String apiKey) {
        if (apiKey != null && !apiKey.isBlank()) {
            this.client = Client.builder().apiKey(apiKey).build();
        } else {
            // Let the SDK try to pick it up from GOOGLE_API_KEY env var automatically
            this.client = new Client();
        }
        this.modelName = System.getProperty("mindtrace.gemini.model", "gemini-2.5-flash");
        this.gson = new GsonBuilder().setPrettyPrinting().create();
    }

    @Override
    public GeneratedTrace generate(String rawProblemText) {
        Objects.requireNonNull(rawProblemText, "rawProblemText cannot be null");

        String systemInstruction = Prompts.SYSTEM_INSTRUCTION;
        String userPrompt = Prompts.buildUserPrompt(rawProblemText);

        // Build a strict response schema so Gemini returns parseable JSON
        Schema responseSchema = buildResponseSchema();

        GenerateContentConfig config = GenerateContentConfig.builder()
                .systemInstruction(com.google.genai.types.Content.fromParts(
                        com.google.genai.types.Part.fromText(systemInstruction)))
                .responseMimeType("application/json")
                .responseSchema(responseSchema)
                .candidateCount(1)
                .build();

        try {
            GenerateContentResponse response =
                    client.models.generateContent(modelName, userPrompt, config);

            String jsonText = response.text();
            if (jsonText == null || jsonText.isBlank()) {
                throw new RuntimeException("Gemini returned empty response");
            }

            // Clean possible ```json fences that some models still emit even with schema
            jsonText = jsonText.trim();
            if (jsonText.startsWith("```")) {
                jsonText = jsonText.replaceAll("^```json\\s*", "")
                                   .replaceAll("\\s*```$", "")
                                   .trim();
            }

            AiDtos.AiGenerationResult aiResult = gson.fromJson(jsonText, AiDtos.AiGenerationResult.class);

            return mapToDomain(aiResult, rawProblemText);

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate trace with Gemini: " + e.getMessage(), e);
        }
    }

    /**
     * Builds a detailed JSON Schema that matches AiGenerationResult + the nested structures.
     * This is passed to Gemini so it is forced to produce valid, correctly shaped output.
     */
    private Schema buildResponseSchema() {
        // Reusable node schema
        Schema nodeSchema = Schema.builder()
                .type(Type.Known.OBJECT)
                .properties(Map.of(
                        "nodeType", Schema.builder().type(Type.Known.STRING).description(
                                "One of: READ, RECOGNIZE, STRATEGY, SUBGOAL, INSIGHT, REMINDER, VERIFY, COMPOSE").build(),
                        "what", Schema.builder().type(Type.Known.STRING).build(),
                        "why", Schema.builder().type(Type.Known.STRING).build(),
                        "translation", Schema.builder().type(Type.Known.STRING).nullable(true).build()
                ))
                .required(List.of("nodeType", "what", "why"))
                .build();

        Schema.Builder finalAnswerSchemaBuilder = Schema.builder()
            .type(Type.Known.OBJECT)
            .properties(Map.of(
                "workings", Schema.builder().type(Type.Known.STRING).build(),
                "conclusion", Schema.builder().type(Type.Known.STRING).build()
            ))
            .required(List.of("workings", "conclusion"));

        Schema finalAnswerSchema = finalAnswerSchemaBuilder.build();

        Schema knowledgeMapSchema = Schema.builder()
                .type(Type.Known.OBJECT)
                .properties(Map.of(
                        "before", Schema.builder().type(Type.Known.ARRAY).items(Schema.builder().type(Type.Known.STRING).build()).build(),
                        "teaches", Schema.builder().type(Type.Known.ARRAY).items(Schema.builder().type(Type.Known.STRING).build()).build(),
                        "assumes", Schema.builder().type(Type.Known.ARRAY).items(Schema.builder().type(Type.Known.STRING).build()).build()
                ))
                .required(List.of("before", "teaches", "assumes"))
                .build();

        Schema patternSchema = Schema.builder()
                .type(Type.Known.OBJECT)
                .properties(Map.of(
                        "whenYouSee", Schema.builder().type(Type.Known.STRING).build(),
                        "alwaysStartBy", Schema.builder().type(Type.Known.STRING).build(),
                        "theUnlockingMove", Schema.builder().type(Type.Known.STRING).build(),
                        "howYouKnowYoureDone", Schema.builder().type(Type.Known.STRING).build(),
                        "commonMistake", Schema.builder().type(Type.Known.STRING).build()
                ))
                .required(List.of("whenYouSee", "alwaysStartBy", "theUnlockingMove", "howYouKnowYoureDone", "commonMistake"))
                .build();

        Schema subquestionSchema = Schema.builder()
                .type(Type.Known.OBJECT)
                .properties(Map.of(
                        "label", Schema.builder().type(Type.Known.STRING).build(),
                        "problemStatement", Schema.builder().type(Type.Known.STRING).build(),
                        "dependsOn", Schema.builder().type(Type.Known.ARRAY).items(Schema.builder().type(Type.Known.STRING).build()).build()
                ))
                .required(List.of("label", "problemStatement", "dependsOn"))
                .build();

        Schema questionSchema = Schema.builder()
                .type(Type.Known.OBJECT)
                .properties(Map.of(
                        "problemStatement", Schema.builder().type(Type.Known.STRING).build(),
                        "isNested", Schema.builder().type(Type.Known.BOOLEAN).build()
                ))
                .required(List.of("problemStatement", "isNested"))
                .build();

        Schema.Builder nestedQuestionSchemaBuilder = Schema.builder()
            .type(Type.Known.OBJECT)
            .properties(Map.of(
                "context", Schema.builder().type(Type.Known.STRING).build(),
                "subquestions", Schema.builder().type(Type.Known.ARRAY).items(subquestionSchema).build()
            ))
            .required(List.of("context", "subquestions"));

        Schema subTraceSchema = Schema.builder()
                .type(Type.Known.OBJECT)
                .properties(Map.of(
                        "subquestion", subquestionSchema,
                        "traceNodes", Schema.builder().type(Type.Known.ARRAY).items(nodeSchema).build(),
                        "finalAnswer", finalAnswerSchema
                ))
                .required(List.of("subquestion", "traceNodes", "finalAnswer"))
                .build();

        // Root
        return Schema.builder()
                .type(Type.Known.OBJECT)
                .properties(Map.of(
                        "kind", Schema.builder().type(Type.Known.STRING).description("flat or nested").build(),
                        "question", questionSchema,
                        "nestedQuestion", nestedQuestionSchemaBuilder.nullable(true).build(),
                        "traceNodes", Schema.builder().type(Type.Known.ARRAY).items(nodeSchema).build(),
                        "subTraces", Schema.builder().type(Type.Known.ARRAY).items(subTraceSchema).build(),
                        "finalAnswer", finalAnswerSchemaBuilder.nullable(true).build(),
                        "knowledgeMap", knowledgeMapSchema,
                        "patternSummary", patternSchema
                ))
                .required(List.of(
                        "kind", "question", "traceNodes", "subTraces", "knowledgeMap", "patternSummary"
                ))
                .build();
    }

    /**
     * Maps the raw AI JSON result into our rich, validated domain model objects
     * (building proper Trace linked lists via the builder, creating the *Trace records, etc.).
     */
    private GeneratedTrace mapToDomain(AiDtos.AiGenerationResult ai, String originalText) {
        if (ai == null) {
            throw new IllegalStateException("AI returned null result");
        }

        String kind = ai.kind() == null ? "flat" : ai.kind().toLowerCase();

        if ("nested".equals(kind) || (ai.nestedQuestion() != null && !ai.subTraces().isEmpty())) {
            return mapNested(ai, originalText);
        } else {
            return mapFlat(ai, originalText);
        }
    }

    private GeneratedTrace.Flat mapFlat(AiDtos.AiGenerationResult ai, String originalText) {
        Question question = new Question(
                ai.question() != null ? ai.question().problemStatement() : originalText,
                false
        );

        Trace trace = buildTraceFromNodes(ai.traceNodes());

        FinalAnswer finalAnswer = mapFinalAnswer(ai.finalAnswer());
        KnowledgeMap km = mapKnowledgeMap(ai.knowledgeMap());
        PatternSummary ps = mapPatternSummary(ai.patternSummary());

        QuestionTrace qt = new QuestionTrace(question, trace, finalAnswer, km, ps);
        return new GeneratedTrace.Flat(qt);
    }

    private GeneratedTrace.Nested mapNested(AiDtos.AiGenerationResult ai, String originalText) {
        AiDtos.AiNestedQuestion aiNq = ai.nestedQuestion();

        List<Subquestion> subs = new ArrayList<>();
        if (aiNq != null && aiNq.subquestions() != null) {
            for (AiDtos.AiSubquestion as : aiNq.subquestions()) {
                subs.add(new Subquestion(as.label(), as.problemStatement(), as.dependsOn()));
            }
        }
        NestedQuestion nq = new NestedQuestion(
                aiNq != null ? aiNq.context() : "Shared context",
                subs
        );

        List<SubquestionTrace> subTraces = new ArrayList<>();
        if (ai.subTraces() != null) {
            for (AiDtos.AiSubTrace ast : ai.subTraces()) {
                Subquestion sq = new Subquestion(
                        ast.subquestion().label(),
                        ast.subquestion().problemStatement(),
                        ast.subquestion().dependsOn()
                );
                Trace trace = buildTraceFromNodes(ast.traceNodes());
                FinalAnswer fa = mapFinalAnswer(ast.finalAnswer());
                subTraces.add(new SubquestionTrace(sq, trace, fa));
            }
        }

        NestedQuestionTrace nt = new NestedQuestionTrace(nq, subTraces);
        return new GeneratedTrace.Nested(nt);
    }

    private Trace buildTraceFromNodes(List<AiDtos.AiNode> aiNodes) {
        if (aiNodes == null || aiNodes.isEmpty()) {
            return Trace.builder().build();
        }
        Trace.Builder builder = Trace.builder();
        for (AiDtos.AiNode n : aiNodes) {
            NodeType type;
            try {
                type = NodeType.valueOf(n.nodeType().toUpperCase());
            } catch (Exception e) {
                type = NodeType.INSIGHT; // safe fallback
            }
            if (n.translation() != null && !n.translation().isBlank()) {
                builder.addWithTranslation(type, n.what(), n.why(), n.translation());
            } else {
                builder.add(type, n.what(), n.why());
            }
        }
        return builder.build();
    }

    private FinalAnswer mapFinalAnswer(AiDtos.AiFinalAnswer a) {
        if (a == null) {
            return new FinalAnswer("See trace for workings.", "See the trace above.");
        }
        return new FinalAnswer(a.workings(), a.conclusion());
    }

    private KnowledgeMap mapKnowledgeMap(AiDtos.AiKnowledgeMap a) {
        if (a == null) return new KnowledgeMap(List.of(), List.of(), List.of());
        return new KnowledgeMap(a.before(), a.teaches(), a.assumes());
    }

    private PatternSummary mapPatternSummary(AiDtos.AiPatternSummary a) {
        if (a == null) {
            return new PatternSummary(
                    "A problem of this general form",
                    "Start by carefully reading and classifying the problem",
                    "Identify the key definition or technique",
                    "Verify the conditions are satisfied",
                    "Rushing the write-up before doing the scratch work"
            );
        }
        return new PatternSummary(
                a.whenYouSee(), a.alwaysStartBy(), a.theUnlockingMove(),
                a.howYouKnowYoureDone(), a.commonMistake()
        );
    }
}
