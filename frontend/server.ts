import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables (prefer .env.local)
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Body parser
app.use(express.json());

// Initialize Gemini Client safely
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Clean logging of key status
console.log(`[Cognitive Trace Server] API Key present: ${!!apiKey}`);

// API: Generate a custom cognitive trace for any mathematical or analytical problem
app.post('/api/generate-trace', async (req, res) => {
  try {
    const { problemStatement = '', images = [] } = req.body;

    const hasText = typeof problemStatement === 'string' && problemStatement.trim().length > 0;
    const hasImages = Array.isArray(images) && images.length > 0;

    if (!hasText && !hasImages) {
      return res.status(400).json({ error: 'Please provide a problem statement or attach image screenshot(s) of the question(s).' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API not configured. Please add GEMINI_API_KEY in the Secrets panel.',
      });
    }

    const systemInstruction = `
You are MindTrace, a world-class system that captures the precise internal step-by-step reasoning process used by an expert mathematician or strong student when solving a problem of ANY type (proof, computation, verification, conceptual check such as "is this a basis?", finding coordinates, definitions, explanations of theory, "state what a X is", "explain the difference", etc.).

Your output must faithfully follow the exact data model (see responseSchema). Use a natural "thinking out loud" voice appropriate to the problem type: clear, rigorous expert reasoning with proper English sentences (spaces, punctuation, capitalization). Choose node types that fit the cognitive steps. Provide high-quality KnowledgeMap and PatternSummary in the exact phrasing style shown in examples. For the FinalAnswer use clean step-by-step workings and a clear conclusion. For pure theory/definition questions, the trace builds the concept rigorously, and the final conclusion is the clean formal statement/definition the student would write.

IMPORTANT FORMATTING (CRITICAL - this makes or breaks the app):
- "what" and "why" MUST be complete, natural English sentences with proper spaces, punctuation, capitalization, and newlines (\n) where a new thought begins. NEVER output concatenated text like "properties.Part(i):[x+y]..." or repeat the input question. Use full stops and spaces. Put NO LaTeX, math symbols, or equations in "what"/"why" — extract them to the corresponding "translation" field.
- "translation" MUST be EITHER a string with ONLY valid KaTeX-compatible LaTeX (use \( ... \) or \[ ... \] or bare, e.g. "A = \\begin{pmatrix} 1 & -1 \\\\ 2 & 1 \\end{pmatrix}" or "c_1 = 1" or a multi-line "\\begin{aligned} \\Gamma_{00} &= 1 \\\\ \\Gamma_{10} &= 0 \\end{aligned}") OR exactly null (not the string "null" or "Null"). 
  - NEVER put English words, "Since", "This is", explanations, or prose inside "translation".
  - For multiple equations in one step, combine into ONE aligned block using \\\\ or use \\quad separators. Use proper double backslashes for LaTeX linebreaks inside the string.
- All other text fields (title, knowledgeMap items, patternSummary, finalAnswer workings/conclusion) must have clean spacing, proper newlines where lists are needed, and no duplication.
- For image-only inputs (no text problemStatement), still fully populate question.problemStatement by transcribing from the image.
- Output must be valid JSON matching the schema exactly.

NODE TYPES (use exactly these strings):
READ, RECOGNIZE, STRATEGY, SUBGOAL, INSIGHT, REMINDER, VERIFY, COMPOSE

For custom input problem (text and/or images):
- The user may provide plain text and/or one or more image screenshots of the question (these may show sub-questions labeled (a), (b), (c) etc. or a single problem).
- ALWAYS populate either "question" (for single self-contained problem: {problemStatement: the exact main wording, isNested: false}) or "nestedQuestion" (for multi-part: {context: the shared outer text/setup, subquestions: [{label:"a", problemStatement: "...", dependsOn?:["a"]}, ...]} ). This must be done for BOTH pure text inputs and image inputs so the UI structure is identical.
- If images are present, read the mathematical content, symbols, variables, and structure *directly from the image(s)* with high accuracy (OCR the exact wording, including vectors, sets, matrices, tasks). The optional text problemStatement supplements or clarifies the image.
- If it appears to be a single problem, populate the "question" object (with the original problemStatement, isNested:false).
- If it is clearly a multi-part/nested question (mentions (a), (b), parts, or shared context + multiple asks visible in text or image), populate "nestedQuestion" with parsed context and subquestions (including logical dependsOn like ["a"] for later parts), and include REMINDER nodes in later sub traces.

Produce all three layers (trace, knowledgeMap, patternSummary, finalAnswer) adapted to the problem type (including pure theory/definitions). Use proper LaTeX (double backslashes in JSON) ONLY in the translation field and symbolic math.
Output strictly matching the schema, no extra text outside the JSON.
`;

    // Build multimodal contents (text + any attached screenshots) or plain text
    let contents: any;
    const imageParts = (images || []).map((img: any) => ({
      inlineData: {
        mimeType: img.mimeType || 'image/png',
        data: img.data,
      },
    }));

    if (imageParts.length > 0) {
      const textPart = hasText
        ? `The image(s) show the full mathematical question (possibly with vectors, sets, matrices, multiple tasks like "check if basis and find coordinates"). Additional clarification: "${problemStatement}". Read/OCR the question EXACTLY from the image(s) (transcribe symbols, labels, tasks precisely) and produce the cognitive trace. Text is optional; image alone is sufficient.`
        : `The image(s) show the full mathematical question (possibly with vectors, sets, matrices, multiple tasks like "check if basis and find coordinates"). Read/OCR the question EXACTLY from the image(s) (transcribe symbols, labels, tasks precisely) and produce the cognitive trace. No accompanying text is required or attached.`;
      contents = [{ text: textPart }, ...imageParts];
    } else {
      // Pure text path: make the instruction as strong as the image path so that typed and image produce
      // IDENTICAL structures (always populate question or nestedQuestion) and obey formatting 100%.
      contents = `You are given this exact question text — transcribe and use its wording precisely (do not paraphrase the main statement):

"${problemStatement}"

Carefully decide:
- Single problem? Populate "question": { "problemStatement": the exact main statement text, "isNested": false }
- Multi-part / shared context + (a)(b) / Part i etc? Populate "nestedQuestion": { "context": the outer/shared setup, "subquestions": [ { "label": "a", "problemStatement": "the text of part a", "dependsOn": ["a"]? }, ... ] }

Then produce the COMPLETE Cognitive Trace (all layers) obeying the system rules with absolute rigor — especially pure ONLY-LaTeX "translation" fields (no prose mixed in), natural full sentences in what/why, clean newlines, and correct question/nestedQuestion population so the resulting data structure is the same as for image inputs.
`;
    }

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'A crisp, academic title for this problem solving trace.',
        },
        question: {
          type: Type.OBJECT,
          description: 'Used for standard single-question statements. Otherwise null if nested.',
          properties: {
            problemStatement: { type: Type.STRING },
            isNested: { type: Type.BOOLEAN },
          },
          required: ['problemStatement', 'isNested'],
        },
        nestedQuestion: {
          type: Type.OBJECT,
          description: 'Used if the problem contains multiple sub-parts (like a, b). Otherwise null if standard.',
          properties: {
            context: { type: Type.STRING, description: 'The outer setting of the question.' },
            subquestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: 'Usually "a", "b", etc.' },
                  problemStatement: { type: Type.STRING },
                  dependsOn: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['label', 'problemStatement'],
              },
            },
          },
          required: ['context', 'subquestions'],
        },
        traceNodes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nodeType: {
                type: Type.STRING,
                description: 'Must match exactly: READ, RECOGNIZE, STRATEGY, SUBGOAL, INSIGHT, REMINDER, VERIFY, or COMPOSE',
              },
              what: { type: Type.STRING, description: 'The plain English expert thought representing actions, observations, or self-dialogue.' },
              why: { type: Type.STRING, description: 'The metacognitive reason for this thought following the previous.' },
              translation: {
                type: Type.STRING,
                description: 'A formal LaTeX rendering or equation illustrating this thought step. Use null if there is no mathematical representation.',
              },
            },
            required: ['nodeType', 'what', 'why'],
          },
        },
        knowledgeMap: {
          type: Type.OBJECT,
          properties: {
            before: { type: Type.ARRAY, items: { type: Type.STRING } },
            teaches: { type: Type.ARRAY, items: { type: Type.STRING } },
            assumes: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['before', 'teaches', 'assumes'],
        },
        patternSummary: {
          type: Type.OBJECT,
          properties: {
            whenYouSee: { type: Type.STRING },
            alwaysStartBy: { type: Type.STRING },
            theUnlockingMove: { type: Type.STRING },
            howYouKnowYoureDone: { type: Type.STRING },
            commonMistake: { type: Type.STRING },
          },
          required: ['whenYouSee', 'alwaysStartBy', 'theUnlockingMove', 'howYouKnowYoureDone', 'commonMistake'],
        },
        finalAnswer: {
          type: Type.OBJECT,
          properties: {
            workings: { type: Type.ARRAY, items: { type: Type.STRING } },
            conclusion: { type: Type.STRING },
          },
          required: ['workings', 'conclusion'],
        },
      },
      required: ['title', 'traceNodes', 'knowledgeMap', 'patternSummary', 'finalAnswer'],
    };

    console.log(`[Cognitive Trace Server] Dispatching generation request to Gemini (model: gemini-3.1-pro-preview)...`);
    const result = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema as any,
        temperature: 0.2, // low temp for accurate structure and deterministic logic
      },
    });

    const responseText = result.text;
    if (!responseText) {
      throw new Error('Gemini returned an empty reply.');
    }

    // Try to safely parse the returned JSON
    const parsedData = JSON.parse(responseText.trim());

    // Rigorous post-processing for clean formatting (fixes mangling, "Null", spacing, image-only cases)
    function cleanString(str: any): string | null {
      if (str === null || str === undefined) return null;
      if (typeof str !== 'string') str = String(str);
      let cleaned = str.trim();
      if (cleaned.toLowerCase() === 'null' || cleaned === '') return null;
      // Preserve newlines (\n) for proper multi-line rendering in translations, workings, patterns, etc.
      // Only collapse runs of horizontal whitespace. Also nuke zero-width junk.
      cleaned = cleaned.replace(/[ \t\r]+/g, ' ');
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
      cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
      // Fix common concat issues like "text.Part" -> "text. Part" (but be conservative)
      cleaned = cleaned.replace(/([a-zA-Z0-9.,;:!?)])([A-Z(])/g, '$1 $2');
      cleaned = cleaned.replace(/([)}\]])([A-Za-z])/g, '$1 $2');
      // strip common leaks of "Read Problem X: ..." or "Problem 1: [full original]" that model sometimes injects into trace fields (seen in both typed and image paths)
      cleaned = cleaned.replace(/\s*Read\s+Problem\s*\d*[:\.\-][\s\S]*$/gi, '');
      cleaned = cleaned.replace(/\s*Problem\s*\d*[:\.\-][\s\S]*$/gi, '');
      // strip leading numbering e.g. "1. " "2) " from lines (esp. final solution workings for calc answers; you don't number steps in actual exam write-ups)
      cleaned = cleaned.replace(/^\s*\d+[\.\)\:\-\s]+/, '');
      return cleaned;
    }

    // Extra defense for "translation" fields which must stay PURE LaTeX (model sometimes leaks prose + repeated math).
    function sanitizeTranslation(raw: any): string | null {
      let s = cleanString(raw);
      if (!s) return null;
      if (s.toLowerCase() === 'null') return null;

      // If it leaked prose (common failure mode), cut before the first English sentence starter after math.
      // Keep only up to (and including) the last clear math expression.
      const proseCut = /\s+(Since|This is|Because|Note that|We have|Observe that|Hence|Thus|Therefore|It follows|Consistent with|For n\s*=|Given that)\b/i;
      const cutIdx = s.search(proseCut);
      if (cutIdx > 8) {
        s = s.slice(0, cutIdx).trim();
      }

      // Remove obvious repeated blocks (model sometimes pastes "visual" + plain version).
      // If the second half looks very similar to first half, keep only first.
      if (s.length > 60) {
        const mid = Math.floor(s.length / 2);
        const first = s.slice(0, mid);
        const second = s.slice(mid);
        if (second.length > 10 && first.includes(second.slice(0, 10))) {
          s = first.trim();
        }
      }

      // If after all this it still contains long English words mixed with symbols, aggressively keep only symbol-heavy chunks.
      if (/\b[a-z]{4,}\b/i.test(s) && /[\\^_{}=+\-*/∑∫ΓΔ]/.test(s)) {
        // Extract stretches that look like math expressions (contain operators, commands, subscripts, under, greek etc.)
        // This helps when model dumps "Given: {latex} Relation: latex ... To show: latex" into a translation field.
        const chunks = s.match(/([A-Za-z_]*\\?[A-Za-z0-9_\^={}\(\)\[\]\+\-*/⋅,.:;∑∫≠≤≥\\ ]{3,}|\\underline\{[^}]+\}|\\overline\{[^}]+\})/g) || [];
        if (chunks.length) {
          s = chunks.join(' \\quad ').trim();
        }
      }

      // extra anywhere (not just end) removal of problem read leaks for trans specifically
      s = s.replace(/Read\s+Problem\s*\d*[:\.\-][\s\S]*?/gi, '');
      s = s.replace(/Problem\s*\d*[:\.\-][\s\S]*?/gi, '');

      // Turn any remaining newlines into proper LaTeX line breaks for multi-line symbolic translations
      s = s.replace(/\n+/g, ' \\ ');

      s = cleanString(s) || '';
      if (!s || s.toLowerCase() === 'null') return null;
      // Also normalize over-escaped \ here so the data sent to client is already sane for KaTeX
      s = s.replace(/\\{2}([a-zA-Z{(_^0-9])/g, '\\$1');
      return s;
    }

    if (parsedData.title) {
      parsedData.title = cleanString(parsedData.title) || parsedData.title;
    }
    if (Array.isArray(parsedData.traceNodes)) {
      parsedData.traceNodes = parsedData.traceNodes.map((node: any) => ({
        ...node,
        what: cleanString(node.what) || node.what,
        why: cleanString(node.why) || node.why,
        translation: sanitizeTranslation(node.translation),  // extra strict: pure LaTeX or null
      }));
    }
    if (parsedData.knowledgeMap) {
      ['before', 'teaches', 'assumes'].forEach((key) => {
        if (Array.isArray(parsedData.knowledgeMap[key])) {
          parsedData.knowledgeMap[key] = parsedData.knowledgeMap[key]
            .map((s: any) => cleanString(s) || s)
            .filter((x: any) => x != null && x !== '');
        }
      });
    }
    if (parsedData.patternSummary) {
      Object.keys(parsedData.patternSummary).forEach((key) => {
        parsedData.patternSummary[key] = cleanString(parsedData.patternSummary[key]) || parsedData.patternSummary[key];
      });
    }
    if (parsedData.finalAnswer) {
      if (Array.isArray(parsedData.finalAnswer.workings)) {
        parsedData.finalAnswer.workings = parsedData.finalAnswer.workings
          .map((s: any) => cleanString(s) || s)
          .filter((x: any) => x != null && x !== '');
      }
      parsedData.finalAnswer.conclusion = cleanString(parsedData.finalAnswer.conclusion) || parsedData.finalAnswer.conclusion;
    }
    if (parsedData.question && parsedData.question.problemStatement) {
      parsedData.question.problemStatement = cleanString(parsedData.question.problemStatement) || parsedData.question.problemStatement;
    }
    if (parsedData.nestedQuestion && parsedData.nestedQuestion.context) {
      parsedData.nestedQuestion.context = cleanString(parsedData.nestedQuestion.context) || parsedData.nestedQuestion.context;
      if (Array.isArray(parsedData.nestedQuestion.subquestions)) {
        parsedData.nestedQuestion.subquestions = parsedData.nestedQuestion.subquestions.map((sq: any) => ({
          ...sq,
          problemStatement: cleanString(sq.problemStatement) || sq.problemStatement,
        }));
      }
    }

    // Ensure custom generations always populate question/nestedQuestion for UI consistency
    const effectiveStatement = hasText ? problemStatement : 'Problem from image';
    let finalData = parsedData;
    if (!finalData.question && !finalData.nestedQuestion) {
      finalData = {
        ...finalData,
        question: { problemStatement: effectiveStatement, isNested: false },
        nestedQuestion: null,
      };
    }
    return res.json(finalData);
  } catch (error: any) {
    console.error('[Cognitive Trace Server] Exception generated:', error);
    return res.status(500).json({
      error: 'Failed to construct Cognitive Trace.',
      details: error.message || error,
    });
  }
});

// Configure Vite or Static Assets based on environment
async function initServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 MindTrace running on port ${PORT} (http://localhost:${PORT} locally)`);
  });
}

initServer().catch((err) => {
  console.error('[Server Start Failure]', err);
});
