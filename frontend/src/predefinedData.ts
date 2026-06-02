import { CognitiveTrace } from './types';

export const predefinedTraces: CognitiveTrace[] = [
  {
    id: 'sequence-convergence',
    title: 'Sequence Convergence Proof (Limit of 1/n)',
    isCustom: false,
    question: {
      problemStatement: "We have a sequence: 1, 1/2, 1/3, 1/4, 1/5... and we want to prove it's getting closer and closer to 0.",
      isNested: false
    },
    nestedQuestion: null,
    traceNodes: [
      {
        nodeType: 'READ',
        what: "We have a sequence: 1, 1/2, 1/3, 1/4, 1/5... and we want to prove it's getting closer and closer to 0.",
        why: "To explore any visual limit proof, we first state the explicit sequence formulation and identify our analytical target which is 0.",
        translation: "a_n = \\frac{1}{n} \\quad \\text{and} \\quad L = 0"
      },
      {
        nodeType: 'RECOGNIZE',
        what: "The word 'prove' + the word 'converges' tells us exactly what type of problem this is: a convergence proof.",
        why: "Matching problem terminology narrows the applicable logic domain to limits definitions.",
        translation: "\\lim_{n \\to \\infty} a_n = L"
      },
      {
        nodeType: 'STRATEGY',
        what: "Every convergence proof has one job: satisfy the formal definition of convergence. You can't prove convergence without using the definition — that's the rule.",
        why: "Definition matching forms the logical backbone of any advanced mathematical proof.",
        translation: "\\forall \\varepsilon > 0, \\, \\exists N \\in \\mathbb{N} \\quad \\text{s.t.} \\quad n > N \\implies |a_n - L| < \\varepsilon"
      },
      {
        nodeType: 'SUBGOAL',
        what: "A sequence aₙ converges to L if: for ANY tiny distance ε you pick, I can find a point N in the sequence, after which EVERY term is within ε of L. In symbols: |aₙ - L| < ε for all n > N.",
        why: "Translating words into concise logical symbology gives us a concrete inequality solver path.",
        translation: "|a_n - L| < \\varepsilon \\quad \\forall n > N"
      },
      {
        nodeType: 'INSIGHT',
        what: "Our sequence is 1/n, our target is L = 0. So |aₙ - L| becomes |1/n - 0| which is just 1/n. Our job is now: make 1/n < ε.",
        why: "Substituting clear, defined elements into the definition framework constructs our algebraic target.",
        translation: "\\left| \\frac{1}{n} - 0 \\right| < \\varepsilon \\iff \\frac{1}{n} < \\varepsilon"
      },
      {
        nodeType: 'VERIFY',
        what: "We need to find N — a specific point in the sequence — such that past that point, 1/n is always less than ε. So we ask: when is 1/n < ε? When n > 1/ε. So N = 1/ε works.",
        why: "Solving for the index index n lets us state the required bound index N unequivocally.",
        translation: "n > \\frac{1}{\\varepsilon} \\implies N = \\left\\lceil \\frac{1}{\\varepsilon} \\right\\rceil"
      },
      {
        nodeType: 'COMPOSE',
        what: "If n > N = 1/ε, then 1/n < 1/N = ε. ✓ The definition is satisfied.",
        why: "Checking sound reverse-engineering ensures correctness and completeness before typing final formal results.",
        translation: "n > N \\implies \\frac{1}{n} < \\varepsilon"
      },
      {
        nodeType: 'COMPOSE',
        what: "We take everything we just figured out and write it cleanly in the standard proof format.",
        why: "We finish by producing a forward-reading proof ready for standard grading boards.",
        translation: "\\text{Let } \\varepsilon > 0..."
      }
    ],
    knowledgeMap: {
      before: [
        'What is a sequence?',
        'What does "getting closer to" mean?'
      ],
      teaches: [
        'The epsilon-N definition',
        'How to translate definitions into algebra',
        'How to reverse-engineer N from the inequality'
      ],
      assumes: [
        'Basic inequality manipulation',
        'Absolute value'
      ]
    },
    patternSummary: {
      whenYouSee: 'Prove that aₙ converges to L',
      alwaysStartBy: 'Writing out the epsilon-N definition with your specific aₙ and L substituted in',
      theUnlockingMove: 'Solve the inequality for n — that gives you N',
      howYouKnowYoureDone: 'You can verify that n > N guarantees |aₙ - L| < ε',
      commonMistake: 'Trying to write the proof forwards before finding N — always find N first on scratch paper, then write cleanly'
    },
    finalAnswer: {
      workings: [
        'Let ε > 0.',
        'Choose N = ⌈1/ε⌉.',
        'Then for all n > N:',
        '|aₙ - 0| = |1/n| = 1/n < 1/N ≤ ε.'
      ],
      conclusion: 'Therefore aₙ → 0 by definition of convergence. □'
    }
  },
  {
    id: 'subspace-intersection',
    title: 'Vector Subspace Intersections',
    isCustom: false,
    question: null,
    nestedQuestion: {
      context: 'Let V be a vector space, W ⊆ V',
      subquestions: [
        {
          label: 'a',
          problemStatement: 'Define subspace.',
          dependsOn: []
        },
        {
          label: 'b',
          problemStatement: 'Prove W ∩ V is a subspace.',
          dependsOn: ['a']
        },
        {
          label: 'c',
          problemStatement: 'Find a basis for W ∩ V.',
          dependsOn: ['b']
        }
      ]
    },
    traceNodes: [
      {
        nodeType: 'READ',
        what: "Define subspace. We seek the structural axioms a subset must satisfy to share the space's closure characteristics.",
        why: "All algebraic structures start from defining minimal sets of criteria. An accurate list is required here.",
        translation: "W \\subseteq V \\quad \\text{is a subspace if...}"
      },
      {
        nodeType: 'RECOGNIZE',
        what: "To define a subspace, a subset must be non-empty and closed under vector addition and scalar multiplication.",
        why: "These fundamental closure conditions define subspaces across all abstract linear vectors.",
        translation: "1. \\; 0_V \\in W \\quad 2. \\; u+v \\in W \\quad 3. \\; c u \\in W"
      },
      {
        nodeType: 'REMINDER',
        what: "In (a) we established that a subspace needs three things: closed under addition, scalar multiplication, contains zero. That's exactly what we'll prove here.",
        why: "To prove W ∩ V is a subspace, we check the general intersection set elements (representing the elements residing simultaneously in W and V) against the 3 closure rules from (a).",
        translation: "W \\cap V \\subseteq V \\quad \\text{closed under addition, scalar products, has zero}"
      },
      {
        nodeType: 'INSIGHT',
        what: "Zero Vector check: W contains 0_V because W is a subspace. V contains 0_V because V is a vector space (any space contains zero). Thus, 0_V ∈ W ∩ V.",
        why: "Simultaneous membership is verified element-by-element using the properties of individual sets.",
        translation: "0_V \\in W \\land 0_V \\in V \\implies 0_V \\in W \\cap V"
      },
      {
        nodeType: 'INSIGHT',
        what: "Addition check: Let x, y ∈ W ∩ V. Then x, y ∈ W and x, y ∈ V. Since W and V are closed under addition (each is a subspace/space), x + y ∈ W and x + y ∈ V. Thus x + y ∈ W ∩ V.",
        why: "We break entry vectors down to individual sets, verify, and combine results back to the intersection set.",
        translation: "x+y \\in W \\land x+y \\in V \\implies x+y \\in W \\cap V"
      },
      {
        nodeType: 'INSIGHT',
        what: "Scalar check: Let c ∈ F, x ∈ W ∩ V. Then x ∈ W and x ∈ V. By scalar closure of each, cx ∈ W and cx ∈ V, so cx ∈ W ∩ V.",
        why: "Proving closure properties on general intersection memberships mimics coordinates addition proof structure.",
        translation: "c x \\in W \\land c x \\in V \\implies c x \\in W \\cap V"
      },
      {
        nodeType: 'REMINDER',
        what: "In (b) we proved W ∩ V is a subspace. We use that fact here as a given — we don't reprove it, we build on it.",
        why: "To find a vector space basis for W ∩ V, we can assume the subspace structure is sound and use it to construct coordinate spans.",
        translation: "\\text{Span}(\\mathcal{B}) = W \\cap V \\quad \\text{with } \\mathcal{B} \\text{ linearly independent}"
      }
    ],
    knowledgeMap: {
      before: [
        'Vector Space properties',
        'Set operation meaning of intersection (∩)'
      ],
      teaches: [
        'Subspace test rules',
        'Proving closure under intersections',
        'Leveraging dependent lemmas to solve chain problems'
      ],
      assumes: [
        'Vector linear combinations',
        'Standard component spanning definitions'
      ]
    },
    patternSummary: {
      whenYouSee: 'Prove that an intersection set is a subspace of V',
      alwaysStartBy: 'Checking and proving each of the three subspace closure rules from definition (a)',
      theUnlockingMove: 'Deduce element membership in individual sets before applying known closure of subspaces separately',
      howYouKnowYoureDone: 'Proven: containing zero, closed under addition, and closed under scalar scale factor.',
      commonMistake: 'Forgetting to check the zero element, or treating unions and intersections similarly (unions are NOT subspaces!)'
    },
    finalAnswer: {
      workings: [
        'Let x, y ∈ W ∩ V. Since W and V are subspaces, 0 ∈ W ∩ V.',
        'For addition: x, y ∈ W ⟹ x+y ∈ W; x, y ∈ V ⟹ x+y ∈ V.',
        'Thus x + y ∈ W ∩ V.',
        'For scalar product: c ∈ F, x ∈ W ⟹ cx ∈ W; x ∈ V ⟹ cx ∈ V.',
        'Thus cx ∈ W ∩ V.'
      ],
      conclusion: 'By satisfying all subspace conditions, the intersection W ∩ V is a subspace of V. □'
    }
  }
];
