import { useState } from 'react'

function QuizHistoryPage({ history, filterMode, onBack, onNextQuiz }) {
  const [selectedTopic, setSelectedTopic] = useState('')
  const [selectedResume, setSelectedResume] = useState('')
  const attempts = [...history].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
  const topics = [...new Set(attempts.flatMap((attempt) => (attempt.questionScores ?? []).map((item) => item.skill)).filter(Boolean))].sort()
  const resumes = [...new Map(attempts.filter((attempt) => attempt.resumeId).map((attempt) => [attempt.resumeId, attempt.resumeName || 'Uploaded resume']))]
  const filteredAttempts = attempts.filter((attempt) => {
    if (filterMode === 'topic' && selectedTopic) return attempt.questionScores?.some((item) => item.skill === selectedTopic)
    if (filterMode === 'resume' && selectedResume) return attempt.resumeId === selectedResume
    return true
  })
  const heading = filterMode === 'topic' ? 'Quizzes by topic' : filterMode === 'resume' ? 'Quizzes by resume' : 'Your quizzes'

  return (
    <main className="practice-shell library-page">
      <header className="topbar"><div><p className="eyebrow">YOUR PRACTICE LIBRARY</p><h1 className="library-title">{heading}</h1></div><button className="back-button" type="button" onClick={onBack}>← Home</button></header>

      {filterMode === 'topic' && topics.length > 0 && <div className="library-filters" aria-label="Filter quizzes by topic"><button className={!selectedTopic ? 'active' : ''} type="button" onClick={() => setSelectedTopic('')}>All topics</button>{topics.map((topic) => <button className={selectedTopic === topic ? 'active' : ''} type="button" key={topic} onClick={() => setSelectedTopic(topic)}>{topic}</button>)}</div>}
      {filterMode === 'resume' && resumes.length > 0 && <div className="library-filters" aria-label="Filter quizzes by resume"><button className={!selectedResume ? 'active' : ''} type="button" onClick={() => setSelectedResume('')}>All resumes</button>{resumes.map(([id, name]) => <button className={selectedResume === id ? 'active' : ''} type="button" key={id} onClick={() => setSelectedResume(id)}>{name}</button>)}</div>}

      {filteredAttempts.length === 0 ? (
        <section className="history-empty"><div className="empty-mark">▤</div><h2>No saved quizzes yet</h2><p>Complete a practice quiz and it will appear here for review.</p><button className="quiz-button" type="button" onClick={onBack}>Start from Home <span aria-hidden="true">→</span></button></section>
      ) : (
        <section className="quiz-library-list" aria-label="Saved quizzes">
          {filteredAttempts.map((attempt, index) => (
            <article className="quiz-library-card" key={attempt.id}>
              <div className="quiz-library-header"><div><span className="attempt-number">QUIZ {String(filteredAttempts.length - index).padStart(2, '0')}</span><h2>{attempt.resumeName || 'Resume practice'}</h2><p>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(attempt.completedAt))}</p></div><div className="history-score"><strong>{attempt.score}</strong><span>/ 5</span></div></div>
              <div className="library-skill-row">{attempt.questionScores?.map((item, itemIndex) => <span className="skill-score-chip" key={`${attempt.id}-skill-${itemIndex}`}>{item.skill} <strong>{item.score}/5</strong></span>)}</div>
              {attempt.questions?.length > 0 && <ol className="saved-question-list">{attempt.questions.map((question, questionIndex) => {
                const feedback = attempt.questionScores?.[questionIndex]
                return <li key={`${attempt.id}-question-${questionIndex}`}><span>{question.skill} · {feedback?.score ?? '—'}/5</span>{question.question}{feedback?.starFeedback && <p className="saved-coach-note"><strong>Answer coach:</strong> {feedback.starFeedback}</p>}</li>
              })}</ol>}
              {attempt.areasToImprove?.length > 0 && <p className="quiz-library-focus"><strong>Focus next:</strong> {attempt.areasToImprove.join(' · ')}</p>}
              <button className="quiz-button" type="button" onClick={() => onNextQuiz(attempt.resumeId, attempt.focusTopic || '')}>Next quiz for this resume <span aria-hidden="true">→</span></button>
            </article>
          ))}
        </section>
      )}
      <footer>ResumeIQ <span>·</span> Revisit, reflect, improve</footer>
    </main>
  )
}

export default QuizHistoryPage
