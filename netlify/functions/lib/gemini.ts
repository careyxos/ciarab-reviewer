import https from 'https';

export interface ServerGenerationOptions {
  title: string;
  category: 'Tourism' | 'Accounting' | 'Events' | 'General';
  themeColor?: 'pink' | 'blue' | 'lavender';
  cardCount: number;
  quizCount?: number;
  questionTypes: ('multiple_choice' | 'true_false' | 'identification')[];
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
  language: 'English' | 'Tagalog' | 'Taglish';
}

const CANDIDATE_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-flash-latest',
];

export async function callServerGemini(
  content: string,
  options: ServerGenerationOptions
): Promise<any> {
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length < 10) {
    throw new Error('Server Gemini API key is not configured in environment variables.');
  }

  // Enforce document length limit to prevent abuse
  const sanitizedContent = content.slice(0, 50000);

  const prompt = `You are a master academic educator and exam prep specialist creating high-yield, university-grade study materials and mock exam questions.
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
2. DO NOT make up generic placeholders or unrelated management/event protocols unless they appear in the material.
3. Multiple-choice questions MUST feature 4 plausible, distinct choices (1 unambiguously correct, 3 realistic distractors).
4. Difficulty level: ${options.difficulty || 'Mixed'}.
5. Language: ${options.language || 'Taglish'}.
6. Generate at least ${Math.min(options.cardCount || 10, 30)} flashcards and ${Math.min(options.quizCount || 10, 50)} quiz questions.

Material Content:
${sanitizedContent}
`;

  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const payload = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });

      const responseText = await new Promise<string>((resolve, reject) => {
        const req = https.request(
          endpoint,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
            timeout: 35000,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve(data);
              } else {
                reject(new Error(`Model ${model} returned status ${res.statusCode}: ${data.slice(0, 200)}`));
              }
            });
          }
        );

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`Request to model ${model} timed out after 35 seconds`));
        });

        req.write(payload);
        req.end();
      });

      const data = JSON.parse(responseText);
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const cleanJson = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        title: options.title,
        description: `AI-synthesized study material with ${parsed.flashcards?.length || 0} cards and practice test questions.`,
        category: options.category,
        tags: [options.category, 'Gemini AI', 'Chobee Reviewer'],
        flashcards: (parsed.flashcards || []).map((f: any, idx: number) => ({
          id: `fc-${Date.now()}-${idx}`,
          front: f.front || '',
          back: f.back || '',
          hint: f.hint || 'Review key concepts',
          category: options.category,
          tags: [options.category],
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          nextReviewDate: new Date().toISOString(),
          state: 'new',
          aiExplanation: f.aiExplanation || '',
        })),
        quizQuestions: (parsed.quizQuestions || []).map((q: any, idx: number) => ({
          id: `quiz-${Date.now()}-${idx}`,
          type: q.type || 'multiple_choice',
          question: q.question || '',
          options: q.options || ['True', 'False'],
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation || '',
          topicCategory: options.category,
        })),
        summary: parsed.summary || { overview: '', keyConcepts: [], glossary: [], examQuestions: [] },
        themeColor: options.themeColor || 'pink',
        author: 'Chobee AI Study Companion',
      };
    } catch (err: any) {
      lastError = err;
      console.warn(`Error using Gemini model ${model}:`, err?.message || err);
    }
  }

  throw new Error(lastError ? `Gemini AI failed: ${lastError.message}` : 'All candidate Gemini models failed.');
}
