/**
 * Types representing the Cognitive Trace analytical schema for math/science problems.
 */

export type NodeType =
  | 'READ'
  | 'RECOGNIZE'
  | 'STRATEGY'
  | 'SUBGOAL'
  | 'INSIGHT'
  | 'REMINDER'
  | 'VERIFY'
  | 'COMPOSE';

export interface Question {
  problemStatement: string;
  isNested: boolean;
}

export interface Subquestion {
  label: string; // e.g., "a", "b", "c"
  problemStatement: string;
  dependsOn?: string[]; // e.g., ["a"]
}

export interface NestedQuestion {
  context: string; // e.g., "Let V be a vector space, W ⊆ V..."
  subquestions: Subquestion[];
}

export interface TraceNode {
  nodeType: NodeType;
  what: string;           // plain English thought
  why: string;            // why this follows from previous
  translation: string | null;  // formal mathematical notation
}

export interface KnowledgeMap {
  before: string[];       // what you need coming in
  teaches: string[];      // what this trace gives you
  assumes: string[];      // background concepts silently used
}

export interface PatternSummary {
  whenYouSee: string;
  alwaysStartBy: string;
  theUnlockingMove: string;
  howYouKnowYoureDone: string;
  commonMistake: string;
}

export interface FinalAnswer {
  workings: string[];     // clean step-by-step math solver workings
  conclusion: string;     // closing exam-style answer
}

export interface CognitiveTrace {
  id: string;
  title: string;
  isCustom?: boolean;
  question: Question | null;
  nestedQuestion: NestedQuestion | null;
  traceNodes: TraceNode[];
  knowledgeMap: KnowledgeMap;
  patternSummary: PatternSummary;
  finalAnswer: FinalAnswer;
}
