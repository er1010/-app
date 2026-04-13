export function createQuestionBank(questionSet) {
  const regularQuestions = [...(questionSet?.regularQuestions ?? [])];
  const specialQuestions = [...(questionSet?.specialQuestions ?? [])];

  const questionById = new Map();
  [...regularQuestions, ...specialQuestions].forEach((question) => {
    questionById.set(question.id, question);
  });

  const getQuestionById = (questionId) => questionById.get(questionId) ?? null;

  return {
    regularQuestions,
    specialQuestions,
    flow: questionSet?.flow ?? {
      insertQuestionId: null,
      insertMode: "none",
      conditionalQuestions: []
    },
    getQuestionById
  };
}
