package com.mindtrace.demo;

import com.mindtrace.model.*;

import java.util.List;

/**
 * Demo application that brings the full vision from Readme.md to life.
 * It constructs real instances of the model (Question / NestedQuestion, Trace with all node types
 * including REMINDER, KnowledgeMap, PatternSummary, FinalAnswer, and the *Trace wrapper records)
 * using the exact examples and wording from the README, then renders them nicely.
 *
 * Run with: mvn exec:java
 */
public final class MindTraceDemo {

    public static void main(String[] args) {
        System.out.println("==============================================================");
        System.out.println("                    MINDTRACE DEMO");
        System.out.println("   Realizing the data model & workflow from Readme.md");
        System.out.println("   (now powered by Gemini prompts instead of hard-coded data)");
        System.out.println("==============================================================");

        // The two example problems from Readme.md — these are now fed to Gemini
        // via carefully written prompts so the model produces output in the same
        // style, node sequence, layer quality, and REMINDER usage.
        String flatExample = "Prove that the sequence a_n = 1/n converges to 0.";
        String nestedExample = """
                QUESTION 3
                Let V be a vector space, W subset V
                (a) Define subspace
                (b) Prove W cap V is a subspace
                (c) Find a basis for W cap V
                """;

        // Try to load the Gemini generator via reflection so this demo class
        // can compile even if the generation module (which needs the Gemini SDK jars) is not on the compile classpath.
        Object generator = null;
        try {
            Class<?> genClass = Class.forName("com.mindtrace.generation.GeminiTraceGenerator");
            generator = genClass.getDeclaredConstructor().newInstance();
            System.out.println("\n[INFO] GeminiTraceGenerator loaded (prompt-driven via Gemini API)\n");
        } catch (Throwable t) {
            System.out.println("\n[INFO] GeminiTraceGenerator not available on classpath (no SDK jars or no key at runtime).");
            System.out.println("       Using hard-coded reference output that matches the Readme.md examples.\n");
        }

        if (generator != null) {
            runGenerationWithReflection(generator, "FLAT EXAMPLE (convergence proof)", flatExample);
            System.out.println("\n\n");
            runGenerationWithReflection(generator, "NESTED EXAMPLE (vector space)", nestedExample);
        } else {
            demonstrateFlatConvergenceProofReference();
            System.out.println("\n\n");
            demonstrateNestedVectorSpaceQuestionReference();
        }

        System.out.println("\n\n[OK] Demo complete.");
        System.out.println("     The prompts in Prompts.java + GeminiTraceGenerator are the real implementation.");
        System.out.println("     To use live generation: mvn compile exec:java after setting GOOGLE_API_KEY.");
    }

    @SuppressWarnings("unchecked")
    private static void runGenerationWithReflection(Object generator, String title, String problemText) {
        System.out.println("--------------------------------------------------------------");
        System.out.println(title);
        System.out.println("Problem sent to Gemini (via reflection):");
        System.out.println(problemText.trim());
        System.out.println("--------------------------------------------------------------\n");

        try {
            // Call generate(String) -> GeneratedTrace
            java.lang.reflect.Method genMethod = generator.getClass().getMethod("generate", String.class);
            Object result = genMethod.invoke(generator, problemText);

            // result is either Flat or Nested
            java.lang.reflect.Method prettyMethod;
            if (result.getClass().getSimpleName().contains("Flat")) {
                Object traceObj = result.getClass().getMethod("trace").invoke(result);
                prettyMethod = traceObj.getClass().getMethod("prettyPrint");
            } else {
                Object traceObj = result.getClass().getMethod("trace").invoke(result);
                prettyMethod = traceObj.getClass().getMethod("prettyPrint");
            }
            System.out.println(prettyMethod.invoke(result));
        } catch (Exception ex) {
            System.out.println("Live generation via reflection failed: " + ex.getMessage());
            System.out.println("Falling back to reference hardcoded version...\n");
            if (title.toLowerCase().contains("flat")) {
                demonstrateFlatConvergenceProofReference();
            } else {
                demonstrateNestedVectorSpaceQuestionReference();
            }
        }
    }

    // =================================================================================
    // FALLBACK / REFERENCE: Hard-coded version of the flat example (original data before Gemini integration)
    // =================================================================================
    private static void demonstrateFlatConvergenceProofReference() {
        System.out.println("--------------------------------------------------------------");
        System.out.println("EXAMPLE 1: Flat Question (Layered trace)");
        System.out.println("--------------------------------------------------------------\n");

        Question q = new Question("Prove that the sequence a_n = 1/n converges to 0.", false);

        // Build the exact thinking trace from the README (Layer 1)
        Trace trace = Trace.builder()
                .add(NodeType.READ,
                        """
                        We have a sequence: 1, 1/2, 1/3, 1/4, 1/5...
                         and we want to prove it's getting closer and closer to 0.""",
                        "Directly copied from the problem statement on the paper.")

                .add(NodeType.RECOGNIZE,
                        """
                        The word 'prove' + the word 'converges' tells us exactly
                         what type of problem this is: a convergence proof.""",
                        "Standard signal words that appear in real analysis problems.")

                .add(NodeType.STRATEGY,
                        """
                        Every convergence proof has one job: satisfy the formal
                         definition of convergence. You can't prove convergence
                         without using the definition - that's the rule.""",
                        "This is meta-knowledge about the genre of proof problems.")

                .addWithTranslation(NodeType.INSIGHT,
                        """
                        A sequence a_n converges to L if:
                         for ANY tiny distance epsilon you pick,
                         I can find a point N in the sequence,
                         after which EVERY term is within epsilon of L.
                         In symbols: |a_n - L| < epsilon for all n > N.""",
                        "We must use the official epsilon-N definition - no shortcuts allowed.",
                        "forall epsilon>0 exists N in Nat forall n>N : |a_n - L| < epsilon")

                .addWithTranslation(NodeType.INSIGHT,
                        """
                        Our sequence is 1/n, our target is L = 0.
                         So |a_n - L| becomes |1/n - 0| which is just 1/n.
                         Our job is now: make 1/n < epsilon.""",
                        "Specialize the general definition to this concrete sequence and limit.",
                        "|1/n - 0| < epsilon   <=>   1/n < epsilon")

                .add(NodeType.SUBGOAL,
                        """
                        We need to find N - a specific point in the sequence -
                         such that past that point, 1/n is always less than epsilon.
                         So we ask: when is 1/n < epsilon? When n > 1/epsilon.
                         So N = 1/epsilon works.""",
                        "Work the target inequality backwards to solve for the N that the definition demands.")

                .addWithTranslation(NodeType.VERIFY,
                        """
                        If n > N = 1/epsilon, then 1/n < 1/N = epsilon. OK
                         The definition is satisfied.""",
                        "Plug the candidate N back into the inequality and confirm it works for arbitrary epsilon > 0.",
                        "n > 1/epsilon  =>  1/n < epsilon")

                .add(NodeType.COMPOSE,
                        """
                        We take everything we just figured out and write it
                         cleanly in the standard proof format.""",
                        "Now that the logic and the value of N are known, produce the polished version that goes on the exam paper.")
                .build();

        // Exact final answer from the README
        FinalAnswer finalAnswer = new FinalAnswer(
                """
                Let epsilon > 0. Choose N = ceil(1/epsilon).
                Then for all n > N:
                |a_n - 0| = |1/n| = 1/n < 1/N <= epsilon.
                Therefore a_n -> 0 by definition of convergence.""",
                "a_n -> 0 by definition of convergence. QED"
        );

        // Layer 2 - exactly as written in README
        KnowledgeMap knowledgeMap = new KnowledgeMap(
                List.of("What is a sequence?", "What does \"getting closer to\" mean?"),
                List.of("The epsilon-N definition",
                        "How to translate definitions into algebra",
                        "How to reverse-engineer N from the inequality"),
                List.of("Basic inequality manipulation", "Absolute value")
        );

        // Layer 3 - exactly as written
        PatternSummary pattern = new PatternSummary(
                "Prove that a_n converges to L",
                "Writing out the epsilon-N definition with your specific a_n and L substituted in",
                "Solve the inequality for n - that gives you N",
                "You can verify that n > N guarantees |a_n - L| < epsilon",
                "Trying to write the proof forwards before finding N - always find N first on scratch paper, then write cleanly"
        );

        QuestionTrace qt = new QuestionTrace(q, trace, finalAnswer, knowledgeMap, pattern);

        // Render the whole thing
        System.out.println(qt.prettyPrint());
    }

    // =================================================================================
    // FALLBACK / REFERENCE: Hard-coded version of the nested example (original data before Gemini integration)
    // =================================================================================
    private static void demonstrateNestedVectorSpaceQuestionReference() {
        // The top-level nested question
        NestedQuestion nq = new NestedQuestion(
                "Let V be a vector space, W subset V",
                List.of(
                        new Subquestion("a", "Define subspace", List.of()),
                        new Subquestion("b", "Prove W cap V is a subspace", List.of()),   // standalone per README text
                        new Subquestion("c", "Find a basis for W cap V", List.of("b"))
                )
        );

        // Subquestion (a) - standalone definition
        SubquestionTrace sta = new SubquestionTrace(
                nq.subquestions().get(0),
                Trace.builder()
                        .add(NodeType.READ, "The question asks for the definition of a subspace of a vector space V.",
                                "Direct reading of part (a).")
                        .add(NodeType.RECOGNIZE, "This is a 'define' question - it wants the precise set of properties.",
                                "Common in linear algebra exams.")
                        .add(NodeType.COMPOSE,
                                "A subspace must contain the zero vector, be closed under addition, and closed under scalar multiplication.",
                                "Those are the three axioms we need to state.")
                        .build(),
                new FinalAnswer(
                        "A subset W of a vector space V is a subspace if:\n1. 0 in W\n2. For all u,v in W, u + v in W\n3. For all u in W and scalar c, c*u in W.",
                        "W is a subspace of V iff it is a vector space under the operations inherited from V. QED"
                )
        );

        // Subquestion (b) - prove W cap V is subspace, with the REMINDER node from the README
        SubquestionTrace stb = new SubquestionTrace(
                nq.subquestions().get(1),
                Trace.builder()
                        .add(NodeType.READ, "We must prove that W cap V is a subspace of V.",
                                "Part (b) of the question.")
                        .add(NodeType.REMINDER,
                                """
                                In (a) we established that a subspace
                                 needs three things: closed under addition,
                                 scalar multiplication, contains zero.
                                 That's exactly what we'll prove here.""",
                                "We do not reprove the definition; we simply recall the result from the previous subquestion and apply it.")
                        .add(NodeType.STRATEGY, "We will verify the three subspace properties for the set W cap V.",
                                "Direct application of the definition we were reminded of.")
                        .add(NodeType.VERIFY, "Zero is in W cap V (since it is in both). If x,y in intersection then x+y in both hence in intersection. Same for scalars.",
                                "All three properties hold by the definitions of W and V and the reminder of what 'subspace' requires.")
                        .add(NodeType.COMPOSE, "Write the short proof using the three checks.",
                                "Now turn the scratch work into the submitted answer.")
                        .build(),
                new FinalAnswer(
                        """
                        By (a), a subspace must contain 0 and be closed under addition and scalar multiplication.
                        W cap V contains 0 because 0 in W and 0 in V.
                        If x, y in W cap V then x, y in W and x, y in V => x + y in W and x + y in V => x + y in W cap V.
                        Similarly for c*x. Hence W cap V is a subspace.""",
                        "Therefore W cap V is a subspace of V. QED"
                )
        );

        // Subquestion (c) - find basis, depends on (b) via reminder
        SubquestionTrace stc = new SubquestionTrace(
                nq.subquestions().get(2),
                Trace.builder()
                        .add(NodeType.READ, "Find a basis for the subspace W cap V.",
                                "Part (c).")
                        .add(NodeType.REMINDER,
                                """
                                In (b) we proved W cap V is a subspace.
                                 We use that fact here as a given -
                                 we don't reprove it, we build on it.""",
                                "We are allowed to treat the result of (b) as already known.")
                        .add(NodeType.STRATEGY, "To find a basis we need a linearly independent spanning set for W cap V. We will use the basis of W (or intersection properties).",
                                "Standard linear algebra technique once we know it is a subspace.")
                        .add(NodeType.INSIGHT, "Any basis for W cap V must consist of vectors that lie in both W and V.",
                                "By definition of the intersection.")
                        .add(NodeType.COMPOSE, "State the basis (in a real problem we would compute it from the concrete W).",
                                "Assemble the answer using the prior result that it is a subspace.")
                        .build(),
                new FinalAnswer(
                        "Let B be a basis for W cap V obtained by taking a basis for W and retaining only those vectors that also lie in V (i.e., the intersection of the spanning set with V, then extract independent subset).",
                        "B = {v1, ..., vk} is a basis for W cap V. QED"
                )
        );

        NestedQuestionTrace nt = new NestedQuestionTrace(nq, List.of(sta, stb, stc));

        System.out.println(nt.prettyPrint());

        // Also show the dependsOn model
        System.out.println("Subquestion dependency model (from the Subquestion records):");
        nq.subquestions().forEach(sq ->
                System.out.printf("  (%s) dependsOn = %s%n", sq.label(), sq.dependsOn())
        );
    }
}
