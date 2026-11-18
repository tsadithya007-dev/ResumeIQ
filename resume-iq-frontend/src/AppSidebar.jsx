function AppSidebar({ active, quizFilter = 'all', topics = [], onHome, onQuizzes, onProgress, onTopic }) {
  return (
    <aside className="app-sidebar">
      <a className="sidebar-brand" href="/" onClick={(event) => { event.preventDefault(); onHome() }}><span className="brand-mark">R</span> ResumeIQ</a>
      <nav className="sidebar-nav" aria-label="Main navigation">
        <button className={`sidebar-link ${active === 'home' ? 'selected' : ''}`} type="button" onClick={onHome}><span>⌂</span> Home</button>
        <div className={`sidebar-group ${active === 'quizzes' ? 'selected' : ''}`}>
          <button className="sidebar-link" type="button" onClick={() => onQuizzes('all')}><span>▤</span> Quizzes</button>
          <button className={`sidebar-sublink ${active === 'quizzes' && quizFilter === 'all' ? 'selected' : ''}`} type="button" onClick={() => onQuizzes('all')}>All quizzes</button>
          <button className={`sidebar-sublink ${active === 'quizzes' && quizFilter === 'resume' ? 'selected' : ''}`} type="button" onClick={() => onQuizzes('resume')}>By resume</button>
        </div>
        {topics.length > 0 && <div className="sidebar-topics"><p className="sidebar-section-label">QUIZZES BY TOPIC</p>{topics.map((topic) => <button className="sidebar-topic" type="button" key={topic} title={`Practice ${topic}`} onClick={() => onTopic(topic)}>{topic}</button>)}</div>}
        <button className={`sidebar-link ${active === 'progress' ? 'selected' : ''}`} type="button" onClick={onProgress}><span>↗</span> Progress</button>
      </nav>
      <p className="sidebar-caption">Practice with purpose.<br />See how you grow.</p>
    </aside>
  )
}

export default AppSidebar
