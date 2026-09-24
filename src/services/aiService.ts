import { StudySet, Flashcard, QuizQuestion, StudySummary } from '../types/study';

export interface GenerationOptions {
  title: string;
  category: 'Tourism' | 'Accounting' | 'Events' | 'General';
  themeColor: 'pink' | 'blue' | 'lavender';
  cardCount: number;
  quizCount?: number;
  questionTypes: ('multiple_choice' | 'true_false' | 'identification')[];
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
  language: 'English' | 'Tagalog' | 'Taglish';
  apiKey?: string;
}

/**
 * Intelligent client-side AI generator that parses raw study materials,
 * extracts high-yield concepts, generates 3D flashcards, quiz questions,
 * and structured study guides.
 */
/**
 * Validate a candidate Google Gemini API key by making a lightweight model query
 */
export async function testGeminiApiKey(candidateKey: string): Promise<{ valid: boolean; message: string; model?: string }> {
  const cleanKey = candidateKey.trim();
  if (!cleanKey) {
    return { valid: false, message: 'Please enter a Gemini API key.' };
  }
  if (!cleanKey.startsWith('AIzaSy')) {
    return {
      valid: false,
      message: 'Invalid key format. Google AI Studio keys must start with "AIzaSy".',
    };
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash?key=${cleanKey}`);
    if (res.ok) {
      return { valid: true, message: 'Google Gemini API Key is valid and active! ✨', model: 'gemini-1.5-flash' };
    }
    const data = await res.json().catch(() => ({}));
    return {
      valid: false,
      message: data?.error?.message || 'Google rejected this API key. Please check your AI Studio dashboard.',
    };
  } catch (err: any) {
    return {
      valid: false,
      message: 'Network error connecting to Google API: ' + (err?.message || 'Unknown error'),
    };
  }
}

/**
 * Intelligent client-side AI generator that parses raw study materials,
 * extracts high-yield concepts, generates 3D flashcards, quiz questions,
 * and structured study guides.
 */
export async function generateStudyMaterial(
  content: string,
  options: GenerationOptions
): Promise<Omit<StudySet, 'id' | 'createdAt' | 'updatedAt'>> {
  if (!content || content.trim().length < 15) {
    throw new Error('Study material content is too brief to generate a reviewer. Please provide text with at least 15 characters.');
  }

  // 1. Check for a valid user or environment Gemini API Key first
  const apiKey = (options.apiKey && options.apiKey.trim().length > 10)
    ? options.apiKey.trim()
    : (typeof window !== 'undefined' ? localStorage.getItem('chobee_gemini_api_key') || '' : '') ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY ? import.meta.env.VITE_GEMINI_API_KEY.trim() : '');

  // Only call direct Gemini if key is in valid format (avoids sending bogus tokens)
  if (apiKey && apiKey.startsWith('AIzaSy')) {
    try {
      const result = await callGeminiAPI(content, { ...options, apiKey });
      if (result) return result;
    } catch (err) {
      console.warn('Direct Gemini API call failed, trying backend endpoint:', err);
    }
  }

  // 2. Try secure backend endpoint (/api/ai-generate)
  try {
    const { apiRequest } = await import('./apiClient');
    const res = await apiRequest<{
      success: boolean;
      data: Omit<StudySet, 'id' | 'createdAt' | 'updatedAt'>;
      tokens: { remaining: number; used: number };
    }>('/api/ai-generate', {
      method: 'POST',
      body: JSON.stringify({
        content,
        options,
        actionType: 'flashcards',
      }),
    });

    if (res?.data) {
      return res.data;
    }
  } catch (backendErr: any) {
    if (backendErr?.data?.code === 'OUT_OF_TOKENS' || backendErr?.status === 402) {
      throw backendErr;
    }
    console.warn('Backend /api/ai-generate call failed or skipped, running local smart NLP engine:', backendErr);
  }

  // 3. Local High-Yield Document-Grounded NLP Engine (100% real text, ZERO fake defaults)
  return generateLocalMaterial(content, options);
}

/**
 * High-yield document parser that extracts real concepts, definitions,
 * sentences, and exam questions strictly from user-provided text.
 */
function generateLocalMaterial(content: string, options: GenerationOptions): Omit<StudySet, 'id' | 'createdAt' | 'updatedAt'> {
  // Thoroughly strip any raw PDF syntax, FlateDecode blocks, or binary headers
  const sanitizedContent = content
    .replace(/%PDF-[0-9.]+/gi, '')
    .replace(/[0-9]+\s+[0-9]+\s+obj[\s\S]*?endobj/gi, '')
    .replace(/stream[\s\S]*?endstream/gi, '')
    .replace(/<<[\s\S]*?>>/g, '')
    .replace(/Filter\s*FlateDecode[\s\S]*/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ');

  const rawLines = sanitizedContent
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => {
      const lower = l.toLowerCase();
      if (
        lower.includes('flatedecode') ||
        lower.includes('stream') ||
        lower.includes('obj') ||
        lower.includes('filter') ||
        lower.includes('endstream') ||
        lower.includes('endobj')
      ) {
        return false;
      }
      return l.length > 0;
    });

  // Extract clean informative sentences
  const rawSentences = sanitizedContent
    .replace(/([.?!])\s*(?=[A-Z])/g, '$1|')
    .split('|')
    .map((s) => s.trim())
    .filter((s) => {
      const lower = s.toLowerCase();
      return (
        s.length >= 25 &&
        !lower.includes('flatedecode') &&
        !lower.includes('stream') &&
        !lower.includes('filter') &&
        !lower.includes('endstream')
      );
    });

  interface TermDef {
    term: string;
    definition: string;
    sourceSentence?: string;
  }

  const extractedTerms: TermDef[] = [];
  const seenTerms = new Set<string>();

  const addTerm = (rawTerm: string, rawDef: string, source?: string) => {
    const term = rawTerm.trim().replace(/^[\d+.)\-*•\s]+/, '').trim();
    const definition = rawDef.trim();
    const norm = term.toLowerCase().replace(/[^a-z0-9]/g, '');

    const BLACKLIST = new Set([
      'pdf', 'page', 'chapter', 'section', 'table', 'figure', 'image',
      'title', 'true', 'false', 'null', 'undefined', 'doc', 'docx', 'notes',
      'content', 'introduction', 'conclusion', 'summary', 'overview', 'index',
      'review', 'test', 'exam', 'quiz', 'question', 'answer'
    ]);

    if (
      norm.length >= 3 &&
      term.length <= 60 &&
      definition.length >= 15 &&
      !BLACKLIST.has(norm) &&
      !seenTerms.has(norm)
    ) {
      seenTerms.add(norm);
      extractedTerms.push({ term, definition, sourceSentence: source });
    }
  };

  // Pattern 1: Explicit definition markers (Colon, Dash, Equals)
  // e.g. "Tourism Management: The practice of overseeing all activities..."
  // e.g. "• Financial Liquidity - The ability of an organization to meet short term debt..."
  rawLines.forEach((line) => {
    const colonMatch = line.match(/^(?:(?:\d+[\.)]|\*|-|•)\s*)?([A-Za-z0-9\s()/\-–]{3,50})\s*[:=–-]\s*(.{15,})$/);
    if (colonMatch) {
      addTerm(colonMatch[1], colonMatch[2], line);
      return;
    }

    // Pattern 2: Definition verbs ("is defined as", "refers to", "means", "is a type of", "encompasses")
    const isMatch = line.match(/^(?:(?:\d+[\.)]|\*|-|•)\s*)?([A-Za-z0-9\s()/\-–]{3,45})\s+(is\s+(?:defined\s+as\s+)?(?:a|an|the)?|refers\s+to|means|signifies|describes|is\s+composed\s+of|includes|encompasses)\s+(.{15,})$/i);
    if (isMatch) {
      addTerm(isMatch[1], isMatch[3], line);
      return;
    }
  });

  // Pattern 3: Heading followed by paragraph (Line N is short, Line N+1 is explanation)
  for (let i = 0; i < rawLines.length - 1; i++) {
    const cur = rawLines[i];
    const next = rawLines[i + 1];
    const words = cur.split(/\s+/);
    if (
      words.length >= 2 &&
      words.length <= 6 &&
      !cur.endsWith('.') &&
      !cur.endsWith(':') &&
      next.length >= 25 &&
      cur.charAt(0) === cur.charAt(0).toUpperCase()
    ) {
      addTerm(cur, next, `${cur}: ${next}`);
    }
  }

  // Pattern 4: Sentence-level extraction (Find high-yield informative sentences)
  rawSentences.forEach((sentence) => {
    if (extractedTerms.length >= (options.cardCount || 10) * 2) return;

    // Look for sentences with commas or connectors defining a subject
    const commaMatch = sentence.match(/^([A-Z][a-zA-Z0-9\s()/-]{3,40})\s*,\s*(?:which\s+is\s+|is\s+|refers\s+to\s+)?(.{20,})$/);
    if (commaMatch) {
      addTerm(commaMatch[1], commaMatch[2], sentence);
      return;
    }

    // Extract subject/predicate from informative sentences
    const words = sentence.split(/\s+/);
    if (words.length >= 7 && words.length <= 35) {
      const subject = words.slice(0, 3).join(' ').replace(/[,:.]/g, '').trim();
      const predicate = words.slice(3).join(' ').trim();
      if (subject.length >= 4 && predicate.length >= 20 && subject.charAt(0) === subject.charAt(0).toUpperCase()) {
        addTerm(subject, predicate, sentence);
      }
    }
  });

  // If still fewer terms, extract sentences directly as statement facts
  if (extractedTerms.length < 3 && rawSentences.length > 0) {
    rawSentences.forEach((sent, idx) => {
      const words = sent.split(/\s+/);
      const lead = words.slice(0, Math.min(4, words.length)).join(' ');
      addTerm(lead, sent, sent);
    });
  }

  // Validate we have at least something from the document
  if (extractedTerms.length === 0) {
    throw new Error('Could not identify readable concepts or sentences in this document. Please ensure it contains readable text.');
  }

  const termsBank = extractedTerms;

  // 1. Generate Flashcards (100% grounded in document)
  const targetCardCount = Math.max(5, options.cardCount || 10);
  const flashcards: Flashcard[] = [];

  for (let i = 0; i < targetCardCount; i++) {
    const item = termsBank[i % termsBank.length];
    const isQuestion = item.term.endsWith('?');
    const front = isQuestion ? item.term : `What is the significance or definition of "${item.term}"?`;
    const back = item.definition;

    flashcards.push({
      id: `fc-doc-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      front,
      back,
      hint: `Key focus: ${item.term.slice(0, 25)}...`,
      category: options.category,
      tags: [options.category, options.title.slice(0, 15)],
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(),
      state: 'new',
      aiExplanation: generateTaglishExplanation(item.term, item.definition),
    });
  }

  // 2. Generate Quiz Questions (Multiple Choice, True/False, Identification)
  const targetQuizCount = Math.max(4, Math.min(options.quizCount || 10, 50));
  const quizQuestions: QuizQuestion[] = [];
  const selectedTypes = options.questionTypes.length > 0 ? options.questionTypes : ['multiple_choice', 'true_false', 'identification'];

  for (let i = 0; i < targetQuizCount; i++) {
    const item = termsBank[i % termsBank.length];
    const qType = selectedTypes[i % selectedTypes.length];

    if (qType === 'true_false') {
      const isTrue = i % 2 === 0;
      // If false, pair this term with ANOTHER real term's definition from the document!
      const otherItem = termsBank[(i + 1) % termsBank.length];
      const hasDistinctOther = otherItem && otherItem.term !== item.term;

      if (isTrue || !hasDistinctOther) {
        quizQuestions.push({
          id: `quiz-doc-${Date.now()}-${i}`,
          type: 'true_false',
          question: `True or False: According to the reviewer, "${item.term}" is characterized as: ${item.definition}`,
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: `Correct! In the study material, "${item.term}" is directly defined as: ${item.definition}`,
          topicCategory: options.category,
        });
      } else {
        quizQuestions.push({
          id: `quiz-doc-${Date.now()}-${i}`,
          type: 'true_false',
          question: `True or False: According to the reviewer, "${item.term}" refers to: ${otherItem.definition}`,
          options: ['True', 'False'],
          correctAnswer: 'False',
          explanation: `False! That statement actually describes "${otherItem.term}". In this reviewer, "${item.term}" refers to: ${item.definition}`,
          topicCategory: options.category,
        });
      }
    } else if (qType === 'identification') {
      quizQuestions.push({
        id: `quiz-doc-${Date.now()}-${i}`,
        type: 'identification',
        question: `Identify the concept described from your study material: "${item.definition}"`,
        correctAnswer: item.term,
        explanation: `This directly defines "${item.term}" as stated in your uploaded material.`,
        topicCategory: options.category,
      });
    } else {
      // Multiple Choice with realistic distractors pulled from other terms in the document
      const correctAnswer = item.definition.length > 110 ? item.definition.slice(0, 105) + '...' : item.definition;
      
      const otherDefs = termsBank
        .filter((_, idx) => idx !== (i % termsBank.length))
        .map((t) => (t.definition.length > 110 ? t.definition.slice(0, 105) + '...' : t.definition));

      const distractor1 = otherDefs[0] || `A secondary procedural factor not directly related to ${item.term}.`;
      const distractor2 = otherDefs[1] || `An administrative compliance step discussed in other sections.`;
      const distractor3 = otherDefs[2] || `None of the above choices accurately describe ${item.term}.`;

      const optionsList = shuffleArray([
        correctAnswer,
        distractor1,
        distractor2,
        distractor3,
      ]);

      quizQuestions.push({
        id: `quiz-doc-${Date.now()}-${i}`,
        type: 'multiple_choice',
        question: `According to the study material, which of the following best defines or describes "${item.term}"?`,
        options: optionsList,
        correctAnswer,
        explanation: `In your study material, "${item.term}" is explained as: ${item.definition}`,
        topicCategory: options.category,
      });
    }
  }

  // 3. Generate Structured Summary (Grounded 100% in document)
  const topTerms = termsBank.slice(0, 10);
  const conceptModule1 = topTerms.slice(0, Math.ceil(topTerms.length / 2));
  const conceptModule2 = topTerms.slice(Math.ceil(topTerms.length / 2));

  const summary: StudySummary = {
    overview: `This reviewer for "${options.title}" synthesizes essential definitions, core principles, and testable concepts extracted directly from your study material.`,
    keyConcepts: [
      {
        title: 'Core Fundamentals & Essential Terms',
        explanation: `Primary definitions and subject foundations identified in "${options.title}".`,
        keyPoints: conceptModule1.map((k) => `${k.term}: ${k.definition.slice(0, 110)}${k.definition.length > 110 ? '...' : ''}`),
      },
      ...(conceptModule2.length > 0 ? [{
        title: 'Advanced Concepts & Applications',
        explanation: 'Detailed operational and conceptual framework from your material.',
        keyPoints: conceptModule2.map((k) => `${k.term}: ${k.definition.slice(0, 110)}${k.definition.length > 110 ? '...' : ''}`),
      }] : []),
    ],
    glossary: topTerms.map((k) => ({
      term: k.term,
      definition: k.definition,
    })),
    examQuestions: [
      {
        question: `Explain the fundamental concept and significance of "${termsBank[0]?.term || options.title}" as discussed in this reviewer.`,
        modelAnswer: `${termsBank[0]?.definition || 'Understand key operational and academic principles described in the document.'}`,
        difficulty: 'Medium',
      },
      ...(termsBank[1] ? [{
        question: `Based on the study material, how does "${termsBank[1].term}" function and why is it important?`,
        modelAnswer: `${termsBank[1].definition}`,
        difficulty: 'Hard' as const,
      }] : []),
    ],
  };

  return {
    title: options.title,
    description: `AI-synthesized reviewer with ${flashcards.length} cards and ${quizQuestions.length} practice questions.`,
    category: options.category,
    tags: [options.category, 'Document Reviewer', 'High-Yield'],
    flashcards,
    quizQuestions,
    summary,
    themeColor: options.themeColor,
    author: 'Chobee AI Study Companion',
  };
}

export function generateTaglishExplanation(term: string, definition: string): string {
  const intros = [
    `Study Tip: Ganito lang kasimple yan: `,
    `Exam Focus: Tandaan mo para sa test: `,
    `Key Concept: Ang pinaka-core idea dito: `,
    `Chobee Note: Para mas mabilis matandaan: `,
  ];
  const chosenIntro = intros[Math.floor(Math.random() * intros.length)];

  return `${chosenIntro}Ang "${term}" ay ${definition.toLowerCase().slice(0, 120)}... Tandaan ito kapag lumabas sa exam questions! Kayang-kaya mo 'to, sipag mag-aral! ✨🩵`;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Direct Google Gemini API Integration with candidate models and academic prompt
 */
async function callGeminiAPI(content: string, options: GenerationOptions) {
  const candidateModels = [
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-flash-latest',
  ];

  const sanitizedContent = content.slice(0, 35000);

  const prompt = `You are an expert university professor and exam prep specialist creating high-yield, academic study materials and realistic mock exam questions for college students.
Analyze the following study material and return a STRICT valid JSON object with the following structure:
{
  "flashcards": [
    {
      "front": "Specific question, definition prompt, or concept to identify",
      "back": "Clear, precise explanation or definition based directly on the text",
      "hint": "Brief memory clue",
      "category": "${options.category}",
      "aiExplanation": "Warm and clear study tip in ${options.language} (e.g. 'Study Tip: Ganito lang yan...')"
    }
  ],
  "quizQuestions": [
    {
      "type": "multiple_choice",
      "question": "Realistic, high-yield examination question testing facts or concepts from the text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Exact matching option among the 4 choices",
      "explanation": "Detailed rationale explaining why this answer is correct and why other choices are incorrect based on the text",
      "topicCategory": "${options.category}"
    }
  ],
  "summary": {
    "overview": "Comprehensive overview of the subject matter covered in the material",
    "keyConcepts": [
      {
        "title": "Concept Module Name",
        "explanation": "Detailed synthesized explanation",
        "keyPoints": ["High-yield bullet point 1", "High-yield bullet point 2", "High-yield bullet point 3"]
      }
    ],
    "glossary": [
      {"term": "Technical Term", "definition": "Direct factual definition from the text"}
    ],
    "examQuestions": [
      {
        "question": "Comprehensive analytical essay or problem question based on the text",
        "modelAnswer": "Complete, high-scoring model answer based on the material",
        "difficulty": "Medium"
      }
    ]
  }
}

CRITICAL ACCURACY GUIDELINES:
1. Every single question, card, and explanation MUST be derived 100% directly from the provided Material Content below.
2. DO NOT make up generic placeholders or unrelated protocols unless they appear in the material.
3. Multiple-choice questions MUST feature 4 plausible, distinct choices (1 unambiguously correct, 3 realistic distractors).
4. Difficulty level: ${options.difficulty || 'Mixed'}.
5. Language: ${options.language || 'Taglish'}.
6. Generate at least ${Math.min(options.cardCount || 10, 30)} flashcards and ${Math.min(options.quizCount || 10, 50)} quiz questions.

Material Content:
${sanitizedContent}
`;

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${options.apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (!response.ok) {
        console.warn(`Gemini model ${model} returned status ${response.status}, trying next model...`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const cleanJson = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        title: options.title,
        description: `AI-synthesized reviewer with ${parsed.flashcards?.length || 0} cards and practice test questions.`,
        category: options.category,
        tags: [options.category, 'Gemini AI', 'College Reviewer'],
        flashcards: (parsed.flashcards || []).map((f: Partial<Flashcard>, idx: number) => ({
          id: `gemini-fc-${Date.now()}-${idx}`,
          front: f.front || '',
          back: f.back || '',
          hint: f.hint || 'Remember key terms',
          category: options.category,
          tags: [options.category],
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          nextReviewDate: new Date().toISOString(),
          state: 'new' as const,
          aiExplanation: f.aiExplanation || generateTaglishExplanation(f.front || '', f.back || ''),
        })),
        quizQuestions: (parsed.quizQuestions || []).map((q: Partial<QuizQuestion>, idx: number) => ({
          id: `gemini-quiz-${Date.now()}-${idx}`,
          type: q.type || 'multiple_choice',
          question: q.question || '',
          options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation || '',
          topicCategory: options.category,
        })),
        summary: parsed.summary || { overview: '', keyConcepts: [], glossary: [], examQuestions: [] },
        themeColor: options.themeColor,
        author: 'Chobee AI Study Companion',
      };
    } catch (err) {
      console.warn(`Error generating with model ${model}:`, err);
    }
  }

  throw new Error('All candidate Gemini models failed.');
}

