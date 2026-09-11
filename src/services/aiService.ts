import { StudySet, Flashcard, QuizQuestion, StudySummary } from '../types/study';

export interface GenerationOptions {
  title: string;
  category: 'Tourism' | 'Accounting' | 'Events' | 'General';
  themeColor: 'pink' | 'blue' | 'lavender';
  cardCount: number;
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
export async function generateStudyMaterial(
  content: string,
  options: GenerationOptions
): Promise<Omit<StudySet, 'id' | 'createdAt' | 'updatedAt'>> {
  // If user provided a Gemini API Key or environment variable is set
  const apiKey = (options.apiKey && options.apiKey.trim().length > 10) 
    ? options.apiKey.trim() 
    : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY ? import.meta.env.VITE_GEMINI_API_KEY.trim() : '');

  if (apiKey && apiKey.length > 10) {
    try {
      const result = await callGeminiAPI(content, { ...options, apiKey });
      if (result) return result;
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local smart engine:', err);
    }
  }

  // Local Smart Generation Engine
  return generateLocalMaterial(content, options);
}

function generateLocalMaterial(content: string, options: GenerationOptions) {
  // Thoroughly strip any raw PDF syntax, FlateDecode blocks, or binary headers
  const sanitizedContent = content
    .replace(/%PDF-[0-9.]+/gi, '')
    .replace(/[0-9]+\s+[0-9]+\s+obj[\s\S]*?endobj/gi, '')
    .replace(/stream[\s\S]*?endstream/gi, '')
    .replace(/<<[\s\S]*?>>/g, '')
    .replace(/Filter\s*FlateDecode[\s\S]*/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ');

  const lines = sanitizedContent
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

  // Extract sentences and key segments
  const sentences = sanitizedContent
    .replace(/([.?!])\s*(?=[A-Z])/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter((s) => {
      const lower = s.toLowerCase();
      if (
        lower.includes('flatedecode') ||
        lower.includes('stream') ||
        lower.includes('obj') ||
        lower.includes('filter') ||
        lower.includes('endstream')
      ) {
        return false;
      }
      return s.length > 20;
    });

  const keyTerms: { term: string; definition: string; category?: string }[] = [];

  // Pattern 1: Definitions with colon, dash, or equals (e.g. "Term: Definition" or "1. Term - Definition")
  lines.forEach((line) => {
    const colonMatch = line.match(/^(?:(?:\d+\.|\*|-)\s*)?([A-Za-z0-9\s()/\-–]{3,45})\s*[:=–-]\s*(.+)$/);
    if (colonMatch && colonMatch[2].length > 12) {
      keyTerms.push({
        term: colonMatch[1].trim(),
        definition: colonMatch[2].trim(),
      });
      return;
    }

    // Pattern 2: "is defined as", "refers to", "describes", "is a"
    const isMatch = line.match(/^(?:(?:\d+\.|\*|-)\s*)?([A-Za-z0-9\s()/\-–]{3,40})\s+(is\s+(?:defined\s+as\s+)?(?:a|an|the)?|refers\s+to|means|signifies|describes)\s+(.+)$/i);
    if (isMatch && isMatch[3].length > 15) {
      keyTerms.push({
        term: isMatch[1].trim(),
        definition: isMatch[3].trim(),
      });
    }
  });

  // Pattern 3: Paragraphs with prominent leading nouns or phrases
  if (keyTerms.length < options.cardCount) {
    sentences.forEach((sent) => {
      // Find sentences that start with a capitalized phrase
      const match = sent.match(/^([A-Z][a-zA-Z0-9\s()/-]{3,35})\s*,\s*(.+)$/);
      if (match && match[2].length > 20) {
        keyTerms.push({
          term: match[1].trim(),
          definition: match[2].trim(),
        });
      } else {
        const words = sent.split(' ');
        if (words.length >= 8 && words.length <= 40) {
          const pseudoTerm = words.slice(0, 3).join(' ').replace(/[,:.]/g, '');
          const pseudoDef = words.slice(3).join(' ');
          if (pseudoTerm.length > 4 && pseudoDef.length > 20) {
            keyTerms.push({
              term: pseudoTerm.charAt(0).toUpperCase() + pseudoTerm.slice(1),
              definition: pseudoDef,
            });
          }
        }
      }
    });
  }

  // Deduplicate and filter out PDF binary keywords
  const BLACKLISTED_TERMS = new Set([
    'pdf', 'obj', 'flatedecode', 'filter', 'stream', 'endstream', 'endobj', 'length',
    'xref', 'trailer', 'startxref', 'font', 'page', 'pages', 'type', 'catalog', 'root',
    'true', 'false', 'null', 'unknown', 'undefined', 'document', 'content', 'index'
  ]);

  const seenTerms = new Set<string>();
  const uniqueTerms: { term: string; definition: string }[] = [];
  for (const item of keyTerms) {
    const norm = item.term.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const defLower = item.definition.toLowerCase();
    
    // Check character randomness / gibberish density in definition
    const letters = item.definition.replace(/[^A-Za-z]/g, '').length;
    const isGibberish = item.definition.length > 20 && (letters / item.definition.length < 0.6);

    const hasBinaryArtifacts = 
      norm.includes('flatedecode') ||
      norm.includes('stream') ||
      norm.includes('filter') ||
      norm.includes('length') ||
      norm.includes('obj') ||
      norm === 'pdf' ||
      defLower.includes('flatedecode') ||
      defLower.includes('stream') ||
      defLower.includes('filter') ||
      defLower.includes('endobj') ||
      defLower.includes('endstream') ||
      defLower.includes('obj ');

    if (
      !seenTerms.has(norm) && 
      item.definition.length > 10 &&
      !BLACKLISTED_TERMS.has(norm) &&
      !hasBinaryArtifacts &&
      !isGibberish &&
      item.term.length > 2 &&
      item.term.length < 50
    ) {
      seenTerms.add(norm);
      uniqueTerms.push(item);
    }
  }

  // If still fewer terms than requested, synthesize contextual terms from title and category
  const titleTopic = options.title.replace(/reviewer|pdf|docx|notes|study/gi, '').trim() || 'Core Principles';
  const defaultBank = [
    {
      term: `${titleTopic} Fundamentals`,
      definition: `Essential theoretical principles, operational requirements, and strategic protocols for ${titleTopic}.`,
    },
    {
      term: 'Operational Protocol',
      definition: 'A standardized sequence of actions ensuring quality, institutional compliance, and safety.',
    },
    {
      term: 'Stakeholder Coordination',
      definition: 'Active synchronization between class officers, committees, faculty, and participants.',
    },
    {
      term: 'Quality Assurance & Risk Control',
      definition: 'Systematic contingency checks designed to mitigate delays and equipment failure.',
    },
    {
      term: 'Documentation & Timeline Tracking',
      definition: 'Recording minute-by-minute milestones and financial liquidations for organizational integrity.',
    },
    {
      term: 'Team Communication Flow',
      definition: 'Clear vertical and horizontal feedback loops between stage directors, ushers, and leadership.',
    },
    {
      term: 'Resource Allocation Standard',
      definition: 'Distributing organizational supplies, petty cash funds, and manpower efficiently.',
    },
    {
      term: 'Emergency Buffer Contingency',
      definition: 'Pre-planned flexible segments designed to absorb unforeseen disruptions without stopping the program.',
    }
  ];

  for (const item of defaultBank) {
    if (uniqueTerms.length < Math.max(options.cardCount, 6)) {
      uniqueTerms.push(item);
    }
  }

  // Generate Flashcards
  const targetCount = Math.max(options.cardCount, 5);
  const flashcards: Flashcard[] = [];

  for (let i = 0; i < targetCount; i++) {
    const item = uniqueTerms[i % uniqueTerms.length];
    const isQuestion = item.term.endsWith('?');
    const frontText = isQuestion ? item.term : `What is the significance or definition of "${item.term}"?`;
    const backText = item.definition;

    flashcards.push({
      id: `fc-gen-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      front: frontText,
      back: backText,
      hint: `Key focus: ${item.term.slice(0, 20)}...`,
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

  // Generate Quiz Questions
  const quizQuestions: QuizQuestion[] = [];
  const questionCount = Math.max(4, Math.min(flashcards.length, 12));

  for (let i = 0; i < questionCount; i++) {
    const card = flashcards[i % flashcards.length];
    const qType = options.questionTypes[i % options.questionTypes.length] || 'multiple_choice';
    const termClean = card.front.replace('What is the significance or definition of "', '').replace('"?', '');

    if (qType === 'true_false') {
      const isTrue = i % 2 === 0;
      quizQuestions.push({
        id: `quiz-gen-${Date.now()}-${i}`,
        type: 'true_false',
        question: isTrue
          ? `True or False: According to the reviewer, "${termClean}" is accurately characterized as: ${card.back}`
          : `True or False: In this reviewer, "${termClean}" is considered completely unauthorized and counterproductive to organizational goals.`,
        options: ['True', 'False'],
        correctAnswer: isTrue ? 'True' : 'False',
        explanation: `Context: ${card.back}`,
        topicCategory: options.category,
      });
    } else if (qType === 'identification') {
      quizQuestions.push({
        id: `quiz-gen-${Date.now()}-${i}`,
        type: 'identification',
        question: `Identify the concept described: "${card.back}"`,
        correctAnswer: termClean,
        explanation: `The concept being defined is ${termClean}.`,
        topicCategory: options.category,
      });
    } else {
      // Multiple Choice
      const correctAnswer = card.back.length > 95 ? card.back.slice(0, 90) + '...' : card.back;
      const otherCards = flashcards.filter((_, idx) => idx !== (i % flashcards.length));
      const distractor1 = otherCards[0]?.back.slice(0, 85) || 'It refers to administrative audit protocols and filing.';
      const distractor2 = otherCards[1]?.back.slice(0, 85) || 'A strict financial liquidation rule for external suppliers.';
      const distractor3 = 'An optional recommendation disregarded in student events.';

      const optionsList = shuffleArray([
        correctAnswer,
        distractor1 + (distractor1.endsWith('.') ? '' : '...'),
        distractor2 + (distractor2.endsWith('.') ? '' : '...'),
        distractor3,
      ]);

      quizQuestions.push({
        id: `quiz-gen-${Date.now()}-${i}`,
        type: 'multiple_choice',
        question: card.front,
        options: optionsList,
        correctAnswer: correctAnswer,
        explanation: card.back,
        topicCategory: options.category,
      });
    }
  }

  // Generate Structured Summary
  const summary: StudySummary = {
    overview: `This study guide for "${options.title}" synthesizes key principles, operational checklists, and high-yield concepts extracted directly from your study material.`,
    keyConcepts: [
      {
        title: 'Core Fundamentals & Operational Flow',
        explanation: `Essential knowledge structures and procedures for ${options.title}.`,
        keyPoints: uniqueTerms.slice(0, 5).map((k) => `${k.term}: ${k.definition.slice(0, 95)}...`),
      },
      {
        title: 'Execution & Leadership Guidelines',
        explanation: 'Best practices for class officers, event directors, and study committees.',
        keyPoints: [
          'Maintain clear documentation and active timeline tracking.',
          'Verify prerequisites before triggering live event or exam milestones.',
          'Communicate updates clearly with members and instructors.',
        ],
      },
    ],
    glossary: uniqueTerms.slice(0, 10).map((k) => ({
      term: k.term,
      definition: k.definition,
    })),
    examQuestions: [
      {
        question: `Explain how the principles in "${options.title}" apply to real-world team leadership and organizational success.`,
        modelAnswer: `Clear understanding allows leaders like Mayor Cia to execute programs with precision, prevent bottlenecks, and foster collaboration across committees.`,
        difficulty: 'Medium',
      },
      {
        question: `What are the primary risk factors if procedures in this reviewer are overlooked?`,
        modelAnswer: `Loss of synchronization, communication breakdown, and audit or scheduling delays.`,
        difficulty: 'Hard',
      },
    ],
  };

  return {
    title: options.title,
    description: `Generated AI study set covering ${flashcards.length} flashcards and ${quizQuestions.length} practice questions.`,
    category: options.category,
    tags: [options.category, 'AI Generated', 'Mayor Reviewer'],
    flashcards,
    quizQuestions,
    summary,
    themeColor: options.themeColor,
    author: 'Chobee AI for Mayor Cia',
  };
}

export function generateTaglishExplanation(term: string, definition: string): string {
  const intros = [
    `Mayor Cia, ganito lang kasimple yan: `,
    `Lovee ko, para mas madaling tandaan sa exam: `,
    `Mayor, imagine mo ganito siya gumagana: `,
    `Pretty Mayor, eto yung pinaka-core idea: `,
  ];
  const chosenIntro = intros[Math.floor(Math.random() * intros.length)];

  return `${chosenIntro}Ang "${term}" ay ${definition.toLowerCase()} Sa madaling salita, kapag tinanong ito sa exam o kailanganin sa committee, alalahanin mo lang kung paano ito nakakatulong sa buong workflow! Super proud si Baby Bear sa sipag mo mag-aral. 🧸🩵`;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Optional Direct Gemini API Integration
async function callGeminiAPI(content: string, options: GenerationOptions) {
  const candidateModels = [
    'gemini-3.6-flash',
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-1.5-flash',
  ];

  const prompt = `You are a warm, supportive study assistant named "Baby Bear Chobee" creating high-yield study materials for "Mayor Cia".
  Analyze the following study material and return a STRICT valid JSON object with the following structure:
  {
    "flashcards": [
      {
        "front": "Question or term",
        "back": "Clear, concise definition or answer",
        "hint": "Brief clue",
        "category": "${options.category}",
        "aiExplanation": "Warm Taglish explanation starting with 'Mayor Cia, ganito lang yan...'"
      }
    ],
    "quizQuestions": [
      {
        "type": "multiple_choice",
        "question": "Question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "Exact matching option",
        "explanation": "Brief rationale",
        "topicCategory": "${options.category}"
      }
    ],
    "summary": {
      "overview": "High-level summary",
      "keyConcepts": [{"title": "Concept Name", "explanation": "Details", "keyPoints": ["Bullet 1", "Bullet 2"]}],
      "glossary": [{"term": "Term", "definition": "Def"}],
      "examQuestions": [{"question": "Q", "modelAnswer": "A", "difficulty": "Medium"}]
    }
  }

  Generate at least ${Math.min(options.cardCount, 15)} flashcards and 5 quiz questions.
  Difficulty: ${options.difficulty}. Tone: Professional study platform with gentle loving encouragement.
  Material Content:
  ${content.slice(0, 15000)}
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
        tags: [options.category, 'Gemini AI', 'Mayor Reviewer'],
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
          options: q.options || ['True', 'False'],
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation || '',
          topicCategory: options.category,
        })),
        summary: parsed.summary || { overview: '', keyConcepts: [], glossary: [], examQuestions: [] },
        themeColor: options.themeColor,
        author: 'Chobee AI for Mayor Cia',
      };
    } catch (err) {
      console.warn(`Error generating with model ${model}:`, err);
    }
  }

  throw new Error('All candidate Gemini models failed.');
}
