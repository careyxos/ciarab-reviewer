import { StudySet, QuizQuestion, Flashcard } from '../types/study';

// Utility to shuffle an array immutably
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Prepares a quiz questions pool of the requested size (e.g. 5, 10, 30, 50 max).
 * If the studySet already has enough quiz questions, it takes a randomized sample.
 * If the studySet has fewer questions than requested, it dynamically synthesizes
 * high-quality multiple choice, true/false, and identification questions from
 * the deck's flashcards and summary concepts to fulfill the requested count.
 */
export function prepareQuizPool(studySet: StudySet, requestedCount: number): QuizQuestion[] {
  const targetCount = Math.max(1, Math.min(requestedCount, 50));
  const existingQuestions: QuizQuestion[] = (studySet.quizQuestions || []).map((q, idx) => ({
    ...q,
    id: q.id || `preset-q-${idx}`,
  }));

  // If existing questions alone meet or exceed target, sample directly
  if (existingQuestions.length >= targetCount) {
    return shuffleArray(existingQuestions).slice(0, targetCount);
  }

  // Otherwise, start with all existing questions and synthesize additional ones
  const pool: QuizQuestion[] = [...existingQuestions];
  const flashcards: Flashcard[] = studySet.flashcards || [];
  const category = studySet.category || 'General';

  // Extract candidate terms & definitions from flashcards
  const candidateCards = shuffleArray(flashcards);

  let synthesizedIndex = 0;
  for (let i = 0; i < candidateCards.length && pool.length < targetCount; i++) {
    const card = candidateCards[i];
    if (!card.front || !card.back) continue;

    // Check if a question for this card's concept is already in pool
    const alreadyExists = pool.some(
      (q) => q.question.toLowerCase().includes(card.front.toLowerCase().slice(0, 20))
    );
    if (alreadyExists && pool.length >= existingQuestions.length + 5) continue;

    synthesizedIndex++;
    const qTypeMod = synthesizedIndex % 3;

    if (qTypeMod === 0) {
      // True / False
      const isTrue = synthesizedIndex % 2 === 0;
      const altCard = candidateCards[(i + 1) % candidateCards.length];
      const displayedDefinition = isTrue ? card.back : (altCard && altCard.back !== card.back ? altCard.back : `an unrelated standard in administrative operations.`);

      pool.push({
        id: `synth-tf-${card.id || synthesizedIndex}-${Date.now()}`,
        type: 'true_false',
        question: `True or False: In ${category}, "${card.front}" is accurately defined as: "${displayedDefinition}"`,
        options: ['True', 'False'],
        correctAnswer: isTrue ? 'True' : 'False',
        explanation: isTrue 
          ? `Correct! "${card.front}" indeed refers to: ${card.back}`
          : `False. "${card.front}" actually refers to: ${card.back}`,
        topicCategory: card.category || category,
      });
    } else if (qTypeMod === 1) {
      // Identification
      pool.push({
        id: `synth-ident-${card.id || synthesizedIndex}-${Date.now()}`,
        type: 'identification',
        question: `Identify the term or concept being described: "${card.back}"`,
        correctAnswer: card.front.replace(/^(what is|define|explain)\s+/i, '').replace(/[?.]+$/, '').trim(),
        explanation: `The concept defined is "${card.front}". Rationale: ${card.aiExplanation || card.back}`,
        topicCategory: card.category || category,
      });
    } else {
      // Multiple Choice
      const otherCards = candidateCards.filter((c) => c.front !== card.front);
      const distractor1 = otherCards[0]?.back || 'It establishes administrative and regulatory compliance protocols.';
      const distractor2 = otherCards[1]?.back || 'A secondary advisory framework utilized during peak period audits.';
      const distractor3 = otherCards[2]?.back || 'A voluntary practice guideline not strictly mandated in operations.';

      const options = shuffleArray([
        card.back,
        distractor1.length > 120 ? distractor1.slice(0, 115) + '...' : distractor1,
        distractor2.length > 120 ? distractor2.slice(0, 115) + '...' : distractor2,
        distractor3.length > 120 ? distractor3.slice(0, 115) + '...' : distractor3,
      ]);

      pool.push({
        id: `synth-mc-${card.id || synthesizedIndex}-${Date.now()}`,
        type: 'multiple_choice',
        question: card.front.includes('?') ? card.front : `What is the primary significance or definition of "${card.front}"?`,
        options,
        correctAnswer: card.back,
        explanation: card.aiExplanation || `Definition: ${card.back}`,
        topicCategory: card.category || category,
      });
    }
  }

  // Also harvest from summary examQuestions if still below targetCount
  if (pool.length < targetCount && studySet.summary?.examQuestions) {
    for (const examQ of studySet.summary.examQuestions) {
      if (pool.length >= targetCount) break;
      pool.push({
        id: `synth-exam-${pool.length}-${Date.now()}`,
        type: 'identification',
        question: examQ.question,
        correctAnswer: examQ.modelAnswer.split('.')[0] || examQ.modelAnswer,
        explanation: examQ.modelAnswer,
        topicCategory: category,
      });
    }
  }

  // Return a randomized pool capped at targetCount
  return shuffleArray(pool).slice(0, targetCount);
}
