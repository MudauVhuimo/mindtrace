package com.mindtrace.model;

/**
 * Layer 3 — the generalizable "pattern" extracted from a trace (Readme.md).
 * Used to recognize the same shape of problem in the future and know the reliable moves.
 */
public record PatternSummary(
        String whenYouSee,
        String alwaysStartBy,
        String theUnlockingMove,
        String howYouKnowYoureDone,
        String commonMistake
) {

    public PatternSummary {
        if (whenYouSee == null || whenYouSee.isBlank()) {
            throw new IllegalArgumentException("whenYouSee is required");
        }
        if (alwaysStartBy == null || alwaysStartBy.isBlank()) {
            throw new IllegalArgumentException("alwaysStartBy is required");
        }
        if (theUnlockingMove == null || theUnlockingMove.isBlank()) {
            throw new IllegalArgumentException("theUnlockingMove is required");
        }
        if (howYouKnowYoureDone == null || howYouKnowYoureDone.isBlank()) {
            throw new IllegalArgumentException("howYouKnowYoureDone is required");
        }
        if (commonMistake == null || commonMistake.isBlank()) {
            throw new IllegalArgumentException("commonMistake is required");
        }
    }
}
