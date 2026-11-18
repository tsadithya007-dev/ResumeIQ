import { useEffect, useState } from 'react'
import PracticePage from './PracticePage.jsx'
import ProgressPage from './ProgressPage.jsx'
import QuizHistoryPage from './QuizHistoryPage.jsx'
import AppSidebar from './AppSidebar.jsx'
import './App.css'

const API_URL = 'http://localhost:8080/api/resumes/analyze'
const QUIZ_URL = 'http://localhost:8080/api/resumes/quiz'
const HISTORY_API_URL = 'http://localhost:8080/api/quiz-history'
const HISTORY_KEY = 'resumeiq.quizHistory.v1'
const CLIENT_ID_KEY = 'resumeiq.browserId.v1'

function readQuizHistory() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function getBrowserId() {
  const generateUuid = () => window.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16)
  })
  try {
    const saved = window.localStorage.getItem(CLIENT_ID_KEY)
    if (saved) return saved
    const generated = generateUuid()
    window.localStorage.setItem(CLIENT_ID_KEY, generated)
    return generated
  } catch {
    return generateUuid()
  }
}

function pageFromPath(path) {
  if (path === '/practice') return 'practice'
  if (path === '/preparing') return 'preparing'
  if (path === '/progress') return 'progress'
  if (path.startsWith('/quizzes')) return 'quizzes'
  return 'analysis'
}

async function getResumeId(file) {
  if (window.crypto?.subtle) {
    const bytes = await file.arrayBuffer()
    const digest = await window.crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
  }
  return `${file.name}-${file.size}-${file.lastModified}`
}

async function getPracticeSetId(resumeId, jobDescription) {
  const source = `${resumeId}\n${jobDescription.trim().toLowerCase().replace(/\s+/g, ' ')}`
  if (!window.crypto?.subtle) {
    let hash = 2166136261
    for (let index = 0; index < source.length; index += 1) {
      hash = Math.imul(hash ^ source.charCodeAt(index), 16777619)
    }
    return `${resumeId}-${(hash >>> 0).toString(16)}`
  }
  const bytes = new TextEncoder().encode(source)
  const digest = await window.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}

function App() {
  const initialPath = window.location.pathname
  const [page, setPage] = useState(() => pageFromPath(initialPath))
  const [quizFilter, setQuizFilter] = useState(() => initialPath.endsWith('/topic') ? 'topic' : initialPath.endsWith('/resume') ? 'resume' : 'all')
  const [history, setHistory] = useState(readQuizHistory)
  const [file, setFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [result, setResult] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [activeResumeId, setActiveResumeId] = useState('')
  const [activeResumeName, setActiveResumeName] = useState('')
  const [activePracticeSetId, setActivePracticeSetId] = useState('')
  const [practiceTopic, setPracticeTopic] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    async function loadSavedHistory() {
      const clientId = getBrowserId()
      const cachedHistory = readQuizHistory()
      try {
        const response = await fetch(`${HISTORY_API_URL}?clientId=${encodeURIComponent(clientId)}`)
        if (!response.ok) throw new Error('Could not load saved quiz history.')
        const savedHistory = await response.json()
        const savedIds = new Set(savedHistory.map((attempt) => attempt.id))

        // Move existing browser-only history into the database the first time it is available.
        for (const attempt of cachedHistory) {
          if (savedIds.has(attempt.id)) continue
          const saveResponse = await fetch(HISTORY_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId, attempt }),
          })
          if (saveResponse.ok) savedHistory.push(attempt)
        }

        savedHistory.sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt))
        if (!active) return
        setHistory(savedHistory)
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(savedHistory))
      } catch {
        // Keep the browser cache available if the backend is offline.
      }
    }
    loadSavedHistory()
    return () => { active = false }
  }, [])

  useEffect(() => {
    const handleBack = () => {
      const path = window.location.pathname
      setPage(pageFromPath(path))
      setQuizFilter(path.endsWith('/topic') ? 'topic' : path.endsWith('/resume') ? 'resume' : 'all')
    }
    window.addEventListener('popstate', handleBack)
    return () => window.removeEventListener('popstate', handleBack)
  }, [])

  async function handleAnalyze(event) {
    event.preventDefault()
    setError('')
    setResult(null)
    setQuiz(null)
    if (!file) {
      setError('Choose your resume file first.')
      return
    }
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('jobDescription', jobDescription)
    try {
      const response = await fetch(API_URL, { method: 'POST', body: formData })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.detail || body.message || body.error || `Resume analysis failed (HTTP ${response.status}).`)
      }
      setResult(await response.json())
    } catch (requestError) {
      setError(requestError.message || 'Could not connect to ResumeIQ.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateQuiz(topic = practiceTopic) {
    setError('')
    if (!file) {
      window.history.pushState({}, '', '/')
      setPage('analysis')
      setError('Choose the resume again to start another quiz.')
      return
    }
    if (!jobDescription.trim()) {
      window.history.pushState({}, '', '/')
      setPage('analysis')
      setError('Add the job description again to start another quiz.')
      return
    }
    window.history.pushState({}, '', '/preparing')
    setPage('preparing')
    setError('')
    setLoading(true)
    let resumeId
    let practiceSetId
    const formData = new FormData()
    formData.append('file', file)
    formData.append('jobDescription', jobDescription)
    if (topic) formData.append('topic', topic)
    try {
      resumeId = await getResumeId(file)
      practiceSetId = await getPracticeSetId(resumeId, jobDescription)
      const previousQuestions = history
        .filter((attempt) => attempt.resumeId === resumeId && attempt.practiceSetId === practiceSetId)
        .flatMap((attempt) => attempt.questions ?? [])
        .map((question) => question.question)
        .filter(Boolean)
        .filter((question, index, list) => list.indexOf(question) === index)
        .slice(0, 50)
      previousQuestions.forEach((question) => formData.append('previousQuestions', question))
      const response = await fetch(QUIZ_URL, { method: 'POST', body: formData })
      if (!response.ok) {
        const responseText = await response.text()
        let body = {}
        try { body = JSON.parse(responseText) } catch { /* Keep the HTTP status if the server returned non-JSON. */ }
        const detail = body.detail || body.message || body.error || body.title
        throw new Error(detail || `Quiz generation failed (HTTP ${response.status}). Check the backend terminal for details.`)
      }
      const generatedQuiz = await response.json()
      setActiveResumeId(resumeId)
      setActiveResumeName(file.name)
      setActivePracticeSetId(practiceSetId)
      setQuiz({ ...generatedQuiz, topic: topic || '', sessionId: `${Date.now()}` })
      window.history.pushState({}, '', '/practice')
      setPage('practice')
    } catch (requestError) {
      setError(requestError.message || 'Could not connect to ResumeIQ.')
    } finally {
      setLoading(false)
    }
  }

  function returnToAnalysis() {
    window.history.pushState({}, '', '/')
    setPage('analysis')
  }

  function navigate(path, nextPage, filter = 'all') {
    window.history.pushState({}, '', path)
    setPage(nextPage)
    if (nextPage === 'quizzes') setQuizFilter(filter)
  }

  function openQuizzes(filter = 'all') {
    const suffix = filter === 'all' ? '' : `/${filter}`
    navigate(`/quizzes${suffix}`, 'quizzes', filter)
  }

  async function saveQuizResult(evaluation, questions, focusTopic = '') {
    const questionScores = (evaluation.evaluations ?? []).map((item, index) => ({
      skill: questions[index]?.skill || `Question ${index + 1}`,
      score: Number(item.score) || 0,
      overallFeedback: item.overallFeedback ?? '',
      starFeedback: item.starFeedback ?? '',
      strengths: item.strengths ?? [],
      improvements: item.improvements ?? [],
      answerTip: item.answerTip ?? '',
    }))
    if (questionScores.length === 0) return false

    const attempt = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      completedAt: new Date().toISOString(),
      resumeId: activeResumeId,
      resumeName: activeResumeName,
      practiceSetId: activePracticeSetId,
      focusTopic,
      score: Number((questionScores.reduce((sum, item) => sum + item.score, 0) / questionScores.length).toFixed(1)),
      questionCount: questionScores.length,
      questionScores,
      questions: questions.map(({ question, skill, type }) => ({ question, skill, type })),
      areasToImprove: evaluation.overallAreasToImprove ?? [],
    }
    const updatedHistory = [attempt, ...history].slice(0, 50)
    try {
      setHistory(updatedHistory)
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory))
    } catch {
      // Continue to try saving the authoritative copy in the database.
    }
    try {
      const response = await fetch(HISTORY_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: getBrowserId(), attempt }),
      })
      return response.ok
    } catch {
      return false
    }
  }

  function goHome() { navigate('/', 'analysis') }
  function goProgress() { navigate('/progress', 'progress') }
  async function startNextQuiz(targetResumeId, targetTopic = practiceTopic) {
    if (!file || !jobDescription.trim()) {
      navigate('/', 'analysis')
      setError('To continue this resume’s practice, choose the resume and add its job description again.')
      return
    }
    if (targetResumeId && await getResumeId(file) !== targetResumeId) {
      navigate('/', 'analysis')
      setError('Choose the same resume file to continue that quiz history.')
      return
    }
    setPracticeTopic(targetTopic || '')
    handleGenerateQuiz(targetTopic || '')
  }

  function startTargetedPractice(topic) {
    setPracticeTopic(topic)
    if (!file || !jobDescription.trim()) {
      navigate('/', 'analysis')
      setError(`Choose a resume and add its job description to practice ${topic}.`)
      return
    }
    handleGenerateQuiz(topic)
  }

  const topics = [...new Set(history.flatMap((attempt) =>
    (attempt.questions ?? []).map((question) => question.skill).filter(Boolean)))].sort()
  const sidebarProps = { topics, onHome: goHome, onQuizzes: openQuizzes, onProgress: goProgress, onTopic: startTargetedPractice }

  if (page === 'preparing') {
    return <div className="app-layout"><AppSidebar {...sidebarProps} active="quizzes" /><main className="preparing-shell">
      <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">R</span> ResumeIQ</a><span className="topbar-note">Your next opportunity starts here</span></header>
      <section className="preparing-card" aria-live="polite">
        {loading && <div className="preparing-spinner" aria-hidden="true" />}
        <p className="eyebrow">AI INTERVIEW PRACTICE</p>
        <h1>{error ? 'We couldn’t prepare your quiz.' : <>Preparing your<br /><span>quiz.</span></>}</h1>
        <p className="preparing-copy">{error ? error : `We’re creating questions tailored to your resume and job description${practiceTopic ? `, with a focus on ${practiceTopic}` : ''}. This can take a little while.`}</p>
        {!error && <section className="preparing-tips">
          <h2>While you wait</h2>
          <ul>
            <li><strong>Use a real example.</strong> Describe what you personally did.</li>
            <li><strong>Give the outcome.</strong> Include a result or detail when you can.</li>
            <li><strong>Keep it honest.</strong> Clear, genuine answers are stronger than guessed claims.</li>
          </ul>
        </section>}
        {error ? <div className="preparing-actions"><button className="quiz-button" type="button" onClick={() => handleGenerateQuiz(practiceTopic)}>Try again <span aria-hidden="true">→</span></button><button className="back-button" type="button" onClick={returnToAnalysis}>Back to home</button></div> : <p className="privacy-note">Keep this page open. Your quiz will appear as soon as it’s ready.</p>}
      </section>
      <footer>ResumeIQ <span>·</span> Practice makes progress</footer>
    </main></div>
  }

  if (page === 'practice') {
    return <div className="app-layout"><AppSidebar {...sidebarProps} active="quizzes" /><PracticePage key={quiz?.sessionId} quiz={quiz} jobDescription={jobDescription} focusTopic={quiz?.topic || ''} activeResumeId={activeResumeId} onBack={returnToAnalysis} onProgress={goProgress} onEvaluationComplete={saveQuizResult} onNextQuiz={startNextQuiz} /></div>
  }

  if (page === 'progress') {
    return <div className="app-layout"><AppSidebar {...sidebarProps} active="progress" /><ProgressPage history={history} onBack={goHome} onQuizzes={openQuizzes} onNextQuiz={startNextQuiz} /></div>
  }

  if (page === 'quizzes') {
    return <div className="app-layout"><AppSidebar {...sidebarProps} active="quizzes" quizFilter={quizFilter} /><QuizHistoryPage history={history} filterMode={quizFilter} onBack={goHome} onNextQuiz={startNextQuiz} /></div>
  }

  return (
    <div className="app-layout"><AppSidebar {...sidebarProps} active="home" /><main className="page-shell">
      <header className="topbar">
        <a className="brand" href="#top"><span className="brand-mark">R</span> ResumeIQ</a>
        <span className="topbar-note">Your next opportunity starts here</span>
      </header>
      <section className="intro" id="top">
        <p className="eyebrow">RESUME MATCH</p>
        <h1>Make your experience<br /><span>stand out.</span></h1>
        <p className="intro-copy">See how your resume lines up with a role, and find keywords to review.</p>
      </section>
      <form className="analyzer-card" onSubmit={handleAnalyze}>
        <label className="field-label" htmlFor="resume">Your resume</label>
        <label className={`upload-box ${file ? 'has-file' : ''}`} htmlFor="resume">
          <input id="resume" type="file" accept=".pdf,.txt,application/pdf,text/plain" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <span className="upload-icon" aria-hidden="true">↑</span>
          <span className="upload-title">{file ? file.name : 'Choose a PDF or TXT file'}</span>
          <span className="upload-hint">Select a file from your device</span>
        </label>
        <label className="field-label description-label" htmlFor="job-description">Job description</label>
        <textarea id="job-description" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the job description you want to compare against..." required rows={7} />
        {error && <p className="error-message" role="alert">{error}</p>}
        <button className="analyze-button" type="submit" disabled={loading}>{loading ? 'Working…' : 'Analyze my resume'} <span aria-hidden="true">→</span></button>
        <p className="privacy-note">Your resume is analyzed for this request only.</p>
      </form>
      {result && (
        <section className="results-card" aria-live="polite">
          <div className="results-heading">
            <div><p className="eyebrow">YOUR RESULTS</p><h2>Resume match</h2></div>
            <div className="score"><strong>{result.analysisMode === 'ai' ? result.roleFitScore : result.keywordMatchPercent}%</strong><span>{result.analysisMode === 'ai' ? 'AI role-fit score' : 'keyword coverage only'}</span></div>
          </div>
          {result.analysisNotice && <p className="analysis-notice" role="status">{result.analysisNotice}</p>}
          <p className="stats">{result.wordCount} words <span>·</span> {result.characterCount} characters</p>
          {result.analysisMode === 'ai' && <>
            <p className="assessment-summary">{result.summary}</p>
            <div className="score-breakdown"><h3>What this score measures</h3><div className="score-breakdown-grid">
              {[['Skills match', result.scoreBreakdown.skillsMatch, '40%'], ['Resume evidence', result.scoreBreakdown.evidenceQuality, '30%'], ['Relevant experience', result.scoreBreakdown.experienceRelevance, '20%'], ['Impact and clarity', result.scoreBreakdown.impactAndClarity, '10%']].map(([label, value, weight]) => <div className="score-breakdown-item" key={label}><span>{label} <small>({weight})</small></span><strong>{value}/100</strong></div>)}
            </div><p>The weighted score is guidance about how clearly this resume fits the role; it is not a prediction of hiring.</p></div>
            {result.strengths?.length > 0 && <section className="assessment-section"><h3>Relevant strengths</h3><ul>{result.strengths.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></section>}
            {result.gaps?.length > 0 && <section className="assessment-section"><h3>Important requirements not demonstrated</h3><ul>{result.gaps.map((gap, index) => <li key={`${index}-${gap.requirement}`}><strong>{gap.requirement}</strong> <span className={`priority priority-${gap.priority?.toLowerCase()}`}>{gap.priority} priority</span><br />{gap.explanation}</li>)}</ul><p>These are gaps in the resume evidence; they do not prove you lack the skill.</p></section>}
            {result.improvementActions?.length > 0 && <section className="assessment-section"><h3>Specific resume improvements</h3><ul>{result.improvementActions.map((item, index) => <li key={`${index}-${item.action}`}><strong>{item.action}</strong><br />{item.reason}</li>)}</ul></section>}
            {result.skillsToDevelop?.length > 0 && <section className="assessment-section"><h3>Skills to consider developing</h3><ul>{result.skillsToDevelop.map((item, index) => <li key={`${index}-${item.skill}`}><strong>{item.skill}</strong> — {item.reason} <span className="first-step">First step: {item.firstStep}</span></li>)}</ul></section>}
          </>}
          <div className="result-columns">
            <div><h3>Found in your resume <span className="count">{result.matchedKeywords.length}</span></h3><div className="chips">{result.matchedKeywords.map((word) => <span className="chip matched" key={word}>{word}</span>)}</div></div>
            <div><h3>Keywords to review <span className="count">{result.missingKeywords.length}</span></h3><div className="chips">{result.missingKeywords.map((word) => <span className="chip missing" key={word}>{word}</span>)}</div></div>
          </div>
          <p className="honesty-note">Only add experience or skills that are true. A missing keyword may mean the resume does not mention it, not that you lack it.</p>
          <div className="quiz-launch">
            <div><h3>{practiceTopic ? `Focused practice: ${practiceTopic}` : 'Ready to practice?'}</h3><p>{practiceTopic ? 'Generate questions specifically for this topic.' : 'Generate an AI interview quiz tailored to this resume and job description.'}</p>{practiceTopic && <button className="text-link-button" type="button" onClick={() => setPracticeTopic('')}>Clear topic focus</button>}</div>
            <button className="quiz-button" type="button" onClick={() => handleGenerateQuiz()} disabled={loading}>{loading ? 'Creating quiz…' : practiceTopic ? 'Practice this topic' : 'Start AI practice'} <span aria-hidden="true">→</span></button>
          </div>
          <p className="privacy-note">For this prototype, use a sample or anonymized resume. Gemini receives the extracted resume text when creating a quiz.</p>
        </section>
      )}
      <footer>ResumeIQ <span>·</span> A clearer way to tailor your resume</footer>
    </main></div>
  )
}

export default App
