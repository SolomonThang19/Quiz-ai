// ============================================================
//  QuizAI — script.js
//  AI Quiz Generator powered by Claude (Anthropic API)
// ============================================================

// ⚠️  IMPORTANT: Replace with your real Anthropic API key.
//     Get one at https://console.anthropic.com/
//     NEVER commit a real API key to a public GitHub repository.
//     For production, proxy through a backend or use environment variables.
const API_KEY = "YOUR_ANTHROPIC_API_KEY_HERE";

// ---- State ----
let currentQuiz = [];     // Array of question objects
let userAnswers = {};     // { questionIndex: choiceIndex }

// ============================================================
//  GENERATE QUIZ — calls Claude API
// ============================================================
async function generateQuiz() {
  const topic     = document.getElementById("topic").value.trim();
  const difficulty = document.getElementById("difficulty").value;
  const num       = parseInt(document.getElementById("numQuestions").value);

  if (!topic) {
    alert("Please enter a topic first!");
    return;
  }

  if (API_KEY === "YOUR_ANTHROPIC_API_KEY_HERE") {
    alert("⚠️ Please add your Anthropic API key to script.js before generating a quiz.");
    return;
  }

  // UI: loading state
  const btn     = document.getElementById("generateBtn");
  const btnText = document.getElementById("btnText");
  btn.disabled  = true;
  btnText.innerHTML = '<span class="spinner"></span> Generating…';

  // Hide previous quiz / results
  document.getElementById("quizArea").style.display    = "none";
  document.getElementById("resultsArea").style.display = "none";

  // Build the prompt — asks Claude to return valid JSON
  const prompt = `Generate a ${difficulty} difficulty multiple-choice quiz about "${topic}".
Create exactly ${num} questions.

Return ONLY a valid JSON array with no extra text, markdown, or code fences.
Each item must follow this exact structure:
{
  "question": "Question text here?",
  "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
  "answer": 0
}
Where "answer" is the 0-based index of the correct choice among the four choices.
Make the distractors plausible. Vary question styles (who, what, when, why, how).`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.content
      .filter(block => block.type === "text")
      .map(block => block.text)
      .join("");

    // Strip any accidental markdown fences
    const clean = rawText.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(clean);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Received unexpected quiz format from API.");
    }

    currentQuiz   = questions;
    userAnswers   = {};

    renderQuiz(topic);

  } catch (err) {
    console.error("Quiz generation failed:", err);
    alert("❌ Failed to generate quiz:\n" + err.message);
  } finally {
    btn.disabled  = false;
    btnText.innerHTML = "✨ Generate Quiz";
  }
}

// ============================================================
//  RENDER QUIZ
// ============================================================
function renderQuiz(topic) {
  document.getElementById("quizTopicLabel").textContent = topic;
  document.getElementById("progressText").textContent =
    `0 of ${currentQuiz.length} answered`;
  document.getElementById("progressBar").style.width = "0%";

  const container = document.getElementById("questionsContainer");
  container.innerHTML = "";

  currentQuiz.forEach((q, qi) => {
    const card = document.createElement("div");
    card.className = "question-card";
    card.id = `qcard-${qi}`;

    card.innerHTML = `
      <div class="question-num">Question ${qi + 1} of ${currentQuiz.length}</div>
      <div class="question-text">${escapeHtml(q.question)}</div>
      <div class="choices" id="choices-${qi}"></div>
    `;

    const choicesDiv = card.querySelector(`#choices-${qi}`);
    q.choices.forEach((choice, ci) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = choice;
      btn.onclick = () => selectChoice(qi, ci);
      choicesDiv.appendChild(btn);
    });

    container.appendChild(card);
  });

  document.getElementById("submitBtn").style.display = "none";
  document.getElementById("quizArea").style.display  = "block";
  document.getElementById("quizArea").scrollIntoView({ behavior: "smooth" });
}

// ============================================================
//  SELECT A CHOICE
// ============================================================
function selectChoice(questionIndex, choiceIndex) {
  userAnswers[questionIndex] = choiceIndex;

  // Highlight selected
  const choicesBtns = document.querySelectorAll(`#choices-${questionIndex} .choice-btn`);
  choicesBtns.forEach((btn, i) => {
    btn.classList.toggle("selected", i === choiceIndex);
  });

  // Update progress
  const answered = Object.keys(userAnswers).length;
  const total    = currentQuiz.length;
  document.getElementById("progressText").textContent =
    `${answered} of ${total} answered`;
  document.getElementById("progressBar").style.width =
    `${Math.round((answered / total) * 100)}%`;

  // Show submit once all answered
  if (answered === total) {
    document.getElementById("submitBtn").style.display = "block";
    document.getElementById("submitBtn").scrollIntoView({ behavior: "smooth" });
  }
}

// ============================================================
//  SUBMIT QUIZ & SHOW RESULTS
// ============================================================
function submitQuiz() {
  const total   = currentQuiz.length;
  let correct   = 0;

  const reviewContainer = document.getElementById("answersReview");
  reviewContainer.innerHTML = "<h3 style='margin-bottom:1rem;'>Answer Review</h3>";

  currentQuiz.forEach((q, qi) => {
    const userAnswer    = userAnswers[qi];
    const correctAnswer = q.answer;
    const isCorrect     = userAnswer === correctAnswer;

    if (isCorrect) correct++;

    const reviewCard = document.createElement("div");
    reviewCard.className = `review-card ${isCorrect ? "correct" : "incorrect"}`;

    const userAnswerText    = q.choices[userAnswer]    ?? "Not answered";
    const correctAnswerText = q.choices[correctAnswer] ?? "N/A";

    reviewCard.innerHTML = `
      <div class="review-q">${qi + 1}. ${escapeHtml(q.question)}</div>
      <div class="review-answer ${isCorrect ? "correct" : "incorrect"}">
        ${isCorrect ? "✅" : "❌"} Your answer: ${escapeHtml(userAnswerText)}
      </div>
      ${!isCorrect ? `<div class="review-correct-answer">✔ Correct: ${escapeHtml(correctAnswerText)}</div>` : ""}
    `;
    reviewContainer.appendChild(reviewCard);
  });

  // Score
  const pct = Math.round((correct / total) * 100);
  document.getElementById("scorePercent").textContent = `${pct}%`;
  document.getElementById("scoreLabel").textContent   = "Score";
  document.getElementById("scoreDetail").textContent  = `You got ${correct} out of ${total} correct.`;

  let feedback;
  if (pct === 100) feedback = "🏆 Perfect score! Outstanding!";
  else if (pct >= 80) feedback = "🎉 Great job! You know your stuff!";
  else if (pct >= 60) feedback = "👍 Good effort — keep studying!";
  else if (pct >= 40) feedback = "📚 Not bad, but there's room to improve.";
  else feedback = "💪 Keep practicing — you'll get there!";

  document.getElementById("scoreFeedback").textContent = feedback;

  document.getElementById("quizArea").style.display    = "none";
  document.getElementById("resultsArea").style.display = "block";
  document.getElementById("resultsArea").scrollIntoView({ behavior: "smooth" });
}

// ============================================================
//  RESET
// ============================================================
function resetQuiz() {
  currentQuiz = [];
  userAnswers = {};
  document.getElementById("questionsContainer").innerHTML = "";
  document.getElementById("answersReview").innerHTML      = "";
  document.getElementById("resultsArea").style.display   = "none";
  document.getElementById("quizArea").style.display      = "none";
  document.getElementById("topic").value                  = "";
  document.getElementById("generate").scrollIntoView({ behavior: "smooth" });
}

// ============================================================
//  UTILITY
// ============================================================
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Allow pressing Enter in topic field to trigger generation
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("topic").addEventListener("keydown", (e) => {
    if (e.key === "Enter") generateQuiz();
  });
});
