function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function ProgressPage({ history, onBack, onQuizzes, onNextQuiz }) {
  const attempts = [...history].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
  const average = attempts.length
    ? (attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length).toFixed(1)
    : '—'
  const latest = attempts[0]
  const previous = attempts[1]
  const change = latest && previous ? Number((latest.score - previous.score).toFixed(1)) : null
  const resumeGroups = [...new Map(attempts.filter((attempt) => attempt.resumeId).map((attempt) => [attempt.resumeId, {
    id: attempt.resumeId,
    name: attempt.resumeName || 'Uploaded resume',
    attempts: attempts.filter((item) => item.resumeId === attempt.resumeId),
  }])).values()]

  function readinessLabel(score) {
    if (score >= 4.3) return 'Strong practice'
    if (score >= 3.5) return 'Consistent practice'
    if (score >= 2.5) return 'Building confidence'
    return 'Getting started'
  }

  return (
    <main className="practice-shell">
      <header className="topbar">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); onBack() }}><span className="brand-mark">R</span> ResumeIQ</a>
        <button className="back-button" type="button" onClick={() => onQuizzes('all')}>View quizzes</button>
      </header>

      <section className="progress-intro">
        <p className="eyebrow">YOUR PRACTICE HISTORY</p>
        <h1>Progress, one answer<br /><span>at a time.</span></h1>
        <p>Your completed quiz scores are saved in this browser. Resume files and written answers are not saved here.</p>
      </section>

      <section className="progress-summary" aria-label="Practice summary">
        <article className="progress-stat"><span>Completed quizzes</span><strong>{attempts.length}</strong></article>
        <article className="progress-stat"><span>Average score</span><strong>{average}{attempts.length ? <small> / 5</small> : null}</strong></article>
        <article className="progress-stat"><span>Latest score</span><strong>{latest ? <>{latest.score}<small> / 5</small></> : '—'}</strong>
          {change !== null && <em className={change >= 0 ? 'score-change positive' : 'score-change negative'}>{change > 0 ? '+' : ''}{change} from last quiz</em>}
        </article>
      </section>

      {resumeGroups.length > 0 && <section className="readiness-section"><div className="history-heading"><h2>Interview practice readiness</h2><span>By resume</span></div><p className="readiness-explainer">Readiness unlocks after 5 completed quizzes for one resume. It reflects practice answers, not hiring chances.</p><div className="readiness-grid">{resumeGroups.map((group) => {
        const recentFive = group.attempts.slice(0, 5)
        const ready = recentFive.length >= 5
        const score = ready ? Number((recentFive.reduce((sum, attempt) => sum + attempt.score, 0) / 5).toFixed(1)) : null
        return <article className="readiness-card" key={group.id}><div className="readiness-card-title"><span>{group.name}</span><span>{group.attempts.length} {group.attempts.length === 1 ? 'quiz' : 'quizzes'}</span></div>{ready ? <><strong className="readiness-label">{readinessLabel(score)}</strong><p>Average of the latest 5 quizzes: <b>{score}/5</b></p></> : <><strong className="readiness-label pending">{recentFive.length}/5 quizzes completed</strong><p>Complete {5 - recentFive.length} more {5 - recentFive.length === 1 ? 'quiz' : 'quizzes'} to see your readiness summary.</p></>}<button className="quiz-button" type="button" onClick={() => onNextQuiz(group.id, '')}>Next quiz <span aria-hidden="true">→</span></button></article>
      })}</div></section>}

      {attempts.length === 0 ? (
        <section className="history-empty">
          <div className="empty-mark">↗</div>
          <h2>Your first score will show up here</h2>
          <p>Complete an AI practice quiz to start building your history.</p>
          <button className="quiz-button" type="button" onClick={onBack}>Back to resume analysis <span aria-hidden="true">→</span></button>
        </section>
      ) : (
        <section className="history-list" aria-label="Past quiz attempts">
          <div className="history-heading"><h2>Past attempts</h2><span>Most recent first</span></div>
          <button className="text-link-button" type="button" onClick={() => onQuizzes('all')}>Browse saved quizzes →</button>
          {attempts.map((attempt, index) => (
            <article className="history-card" key={attempt.id}>
              <div className="history-card-top">
                <div><span className="attempt-number">ATTEMPT {String(attempts.length - index).padStart(2, '0')}</span><p>{formatDate(attempt.completedAt)}</p></div>
                <div className="history-score"><strong>{attempt.score}</strong><span>/ 5 average</span></div>
              </div>
              <div className="history-meter" role="img" aria-label={`Average score ${attempt.score} out of 5`}><span style={{ width: `${Math.max(0, Math.min(100, attempt.score * 20))}%` }} /></div>
              <p className="history-detail">{attempt.questionCount} answers evaluated</p>
              {attempt.questionScores?.length > 0 && <div className="skill-scores"><span className="skill-scores-label">By question</span>{attempt.questionScores.map((item, itemIndex) => <span className="skill-score-chip" key={`${attempt.id}-${itemIndex}`}>{item.skill}: <strong>{item.score}/5</strong></span>)}</div>}
              {attempt.areasToImprove?.length > 0 && <div className="history-improvements"><h3>Focus for next time</h3><ul>{attempt.areasToImprove.map((area, areaIndex) => <li key={`${attempt.id}-area-${areaIndex}`}>{area}</li>)}</ul></div>}
            </article>
          ))}
        </section>
      )}
      <footer>ResumeIQ <span>·</span> Your practice history stays in this browser</footer>
    </main>
  )
}

export default ProgressPage
