import { useEffect, useState } from 'react'

const EVALUATE_URL = 'http://localhost:8080/api/resumes/quiz/evaluate'
const QUIZ_TIME_LIMIT_SECONDS = 30 * 60

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainingSeconds}`
}

function PracticePage({ quiz, jobDescription, onBack, onProgress, onEvaluationComplete, onNextQuiz, activeResumeId, focusTopic }) {
  const questions = quiz?.questions ?? []
  const [answers, setAnswers] = useState(() => questions.map(() => ''))
  const [evaluation, setEvaluation] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [savedAttempt, setSavedAttempt] = useState(null)
  const [secondsRemaining, setSecondsRemaining] = useState(QUIZ_TIME_LIMIT_SECONDS)
  const [timerExpired, setTimerExpired] = useState(false)
  const [evaluationQuestionIndexes, setEvaluationQuestionIndexes] = useState([])

  useEffect(() => {
    if (evaluation) return undefined
    const interval = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(interval)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [evaluation])

  useEffect(() => {
    if (secondsRemaining === 0) setTimerExpired(true)
  }, [secondsRemaining])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setEvaluation(null)
    setSavedAttempt(null)
    setLoading(true)
    const answeredIndexes = questions.map((_, index) => index).filter((index) => (answers[index] ?? '').trim())
    if (answeredIndexes.length === 0) {
      setError('Write at least one answer before requesting feedback.')
      setLoading(false)
      return
    }
    const payload = {
      jobDescription,
      answers: answeredIndexes.map((index) => ({
        question: questions[index].question,
        skill: questions[index].skill,
        type: questions[index].type,
        answer: answers[index],
      })),
    }

    try {
      const response = await fetch(EVALUATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.detail || body.message || 'Could not evaluate your answers. Try again.')
      }
      const result = await response.json()
      setEvaluation(result)
      setEvaluationQuestionIndexes(answeredIndexes)
      setSavedAttempt(await onEvaluationComplete(result, answeredIndexes.map((index) => questions[index]), focusTopic))
    } catch (requestError) {
      setError(requestError.message || 'Could not connect to ResumeIQ.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="practice-shell">
      <header className="topbar">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); onBack() }}><span className="brand-mark">R</span> ResumeIQ</a>
        <div className="practice-nav"><button className="back-button" type="button" onClick={onProgress}>My progress</button><button className="back-button" type="button" onClick={onBack}>← Back to analysis</button></div>
      </header>

      {!quiz ? (
        <section className="practice-empty">
          <p className="eyebrow">PRACTICE SESSION</p>
          <h1>Your quiz session isn’t loaded.</h1>
          <p>Go back to your analysis and generate a new quiz.</p>
          <button className="quiz-button" type="button" onClick={onBack}>Back to analysis</button>
        </section>
      ) : (
        <>
          <section className="practice-intro">
            <p className="eyebrow">AI INTERVIEW PRACTICE</p>
            <h1>Let’s practice<br /><span>your next answer.</span></h1>
            <p>Answer each question in your own words. Submit once to get feedback on every answer.</p>
            <div className="practice-progress">{questions.length} questions <span>·</span> one feedback report</div>
            <div className={`quiz-timer ${secondsRemaining <= 300 ? 'urgent' : ''}`} aria-live="polite"><span>TIME REMAINING</span><strong>{formatTime(secondsRemaining)}</strong></div>
            {timerExpired && <p className="timer-expired" role="status">Time is up. Your answers are locked; submit to get feedback on the ones you completed.</p>}
          </section>

          <form className="practice-form" onSubmit={handleSubmit}>
            {questions.map((question, index) => (
              <article className="practice-question" key={`${index}-${question.skill}`}>
                <div className="practice-question-heading">
                  <span className="practice-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="practice-tag">{question.skill} · {question.type}</span>
                </div>
                <h2>{question.question}</h2>
                <p className="question-reason">{question.whyThisQuestion}</p>
                <label className="field-label" htmlFor={`answer-${index}`}>Your answer</label>
                <textarea id={`answer-${index}`} value={answers[index] ?? ''} onChange={(event) => setAnswers((current) => current.map((answer, answerIndex) => answerIndex === index ? event.target.value : answer))} placeholder="Write your answer here. Use a real example when you can..." required={!timerExpired} disabled={timerExpired} rows={5} />
                {evaluationQuestionIndexes.includes(index) && <AnswerFeedback result={evaluation?.evaluations?.[evaluationQuestionIndexes.indexOf(index)]} />}
              </article>
            ))}

            {error && <p className="error-message" role="alert">{error}</p>}
            <div className="submit-panel">
              <div><strong>Ready for feedback?</strong><p>Gemini will review relevance, clarity, and specific evidence in your answers.</p></div>
              <button className="analyze-button" type="submit" disabled={loading}>{loading ? 'Evaluating answers…' : timerExpired ? 'Evaluate completed answers' : 'Submit and evaluate'} <span aria-hidden="true">→</span></button>
            </div>
            {savedAttempt === true && <p className="save-status" role="status">Your score was saved to My progress on this browser.</p>}
            {savedAttempt === false && <p className="error-message" role="alert">Your feedback is ready, but this browser could not save the score.</p>}
          </form>

          {evaluation?.overallAreasToImprove?.length > 0 && (
            <section className="overall-feedback" aria-live="polite">
              <p className="eyebrow">YOUR FEEDBACK</p>
              <h2>Areas to improve</h2>
              <ul>{evaluation.overallAreasToImprove.map((area, index) => <li key={`${index}-${area}`}>{area}</li>)}</ul>
              <p className="honesty-note">Use the feedback to describe your real experience more clearly. Don’t add claims that aren’t true.</p>
            </section>
          )}
          {evaluation && <section className="next-quiz-panel"><div><strong>Ready to keep practicing?</strong><p>{focusTopic ? `The next quiz will focus on ${focusTopic} with different questions.` : 'Your next quiz will use different questions for this resume.'}</p></div><button className="quiz-button" type="button" onClick={() => onNextQuiz(activeResumeId, focusTopic)}>Next quiz <span aria-hidden="true">→</span></button></section>}
        </>
      )}
      <footer>ResumeIQ <span>·</span> Practice makes progress</footer>
    </main>
  )
}

function AnswerFeedback({ result }) {
  return (
    <section className="answer-feedback" aria-live="polite">
      <div className="feedback-score"><strong>{result.score}/5</strong><span>answer score</span></div>
      <p className="feedback-summary">{result.overallFeedback}</p>
      {result.starFeedback && <div className="answer-coach"><strong>Answer coach · STAR</strong><p>{result.starFeedback}</p></div>}
      <div className="feedback-columns">
        <div><h3>What worked</h3><ul>{result.strengths.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>
        <div><h3>Try improving</h3><ul>{result.improvements.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>
      </div>
      <p className="answer-tip"><strong>Answer tip:</strong> {result.answerTip}</p>
    </section>
  )
}

export default PracticePage
