import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const API = `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api`

function App() {
  const [people, setPeople] = useState([])
  const [selected, setSelected] = useState(null)
  const [profile, setProfile] = useState(null)
  const [rankings, setRankings] = useState([])
  const [tab, setTab] = useState('people')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    display_name: '', linkedin_url: '', instagram_url: '',
    linkedin_notes: '', instagram_notes: '', consent_confirmed: false
  })

  async function request(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json' }, ...options
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.detail || 'Request failed')
    return data
  }
  async function refresh() {
    try {
      const list = await request('/people')
      setPeople(list)
      if (selected && !list.some(p => p.id === selected.id)) {
        setSelected(null); setProfile(null); setRankings([])
      }
    } catch (e) { setMessage(`Backend unavailable: ${e.message}. Start FastAPI on port 8000.`) }
  }
  useEffect(() => { refresh() }, [])

  function update(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  async function addPerson(e) {
    e.preventDefault(); setBusy(true); setMessage('')
    try {
      const created = await request('/people', { method: 'POST', body: JSON.stringify(form) })
      setForm({ display_name: '', linkedin_url: '', instagram_url: '', linkedin_notes: '', instagram_notes: '', consent_confirmed: false })
      await refresh()
      setSelected(created); setProfile(null); setRankings([]); setTab('profile')
      setMessage('Participant added and agent created.')
    } catch (e) { setMessage(e.message) } finally { setBusy(false) }
  }

  async function openProfile(person) {
    setSelected(person); setTab('profile'); setMessage(''); setRankings([])
    try { setProfile(await request(`/agents/${person.id}/profile`)) }
    catch (e) { setProfile(null); setMessage(e.message) }
  }
  async function analyze() {
    if (!selected) return
    setBusy(true); setMessage('')
    try { setProfile(await request(`/agents/${selected.id}/analyze`, { method: 'POST' })); setMessage('Agent profile analyzed using only the two supplied source notes.') }
    catch (e) { setMessage(e.message) } finally { setBusy(false) }
  }
  async function loadRankings() {
    if (!selected) return
    setBusy(true); setMessage('')
    try { setRankings(await request(`/agents/${selected.id}/rankings`)); setTab('rankings') }
    catch (e) { setMessage(e.message) } finally { setBusy(false) }
  }
  async function removePerson(person) {
    if (!confirm(`Delete ${person.display_name} and their agent/profile data?`)) return
    try { await request(`/people/${person.id}`, { method: 'DELETE' }); await refresh(); setMessage('Participant deleted.') }
    catch (e) { setMessage(e.message) }
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">↗</div><div><strong>Pairwise</strong><small>Two-source dating agents</small></div></div>
      <div className="top-status"><span className="status-dot"/> Local prototype <span className="divider">/</span> {people.length} participants</div>
    </header>
    <main>
      <section className="hero">
        <div className="eyebrow">MULTI-AGENT MATCHMAKING LAB</div>
        <h1>People, represented<br/><em>by agents.</em></h1>
        <p>Each agent builds a grounded profile from exactly two sources, then ranks the other participants by shared, publicly stated interests.</p>
        <div className="hero-pills"><span>01 LinkedIn</span><span>02 Instagram</span><span>03 Agent profile</span><span>04 Rankings</span></div>
      </section>

      {message && <div className="notice" role="status"><span>{message}</span><button onClick={() => setMessage('')} aria-label="Dismiss">×</button></div>}

      <div className="workspace">
        <aside className="sidebar">
          <div className="section-heading"><span>WORKSPACE</span><span className="count">{String(people.length).padStart(2, '0')}</span></div>
          <button className={`nav-item ${tab === 'people' ? 'active' : ''}`} onClick={() => setTab('people')}><span>◫</span> Participants <b>{people.length}</b></button>
          <button className={`nav-item ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}><span>＋</span> Add participant</button>
          {selected && <>
            <div className="section-heading subhead"><span>SELECTED AGENT</span></div>
            <button className={`nav-item ${tab === 'profile' ? 'active' : ''}`} onClick={() => openProfile(selected)}><span>◎</span> Profile page</button>
            <button className={`nav-item ${tab === 'rankings' ? 'active' : ''}`} onClick={loadRankings}><span>↗</span> Compatibility <b>{Math.max(0, people.length - 1)}</b></button>
            <div className="selected-mini"><div className="avatar">{selected.display_name.slice(0,1).toUpperCase()}</div><div><strong>{selected.display_name}</strong><small>Agent #{selected.id}</small></div></div>
          </>}
          <div className="sidebar-note"><span className="lock">⌑</span><strong>Two-source policy</strong><p>Only LinkedIn and Instagram notes are analyzed. This prototype does not scrape profiles or query other sources.</p></div>
        </aside>

        <section className="content">
          {tab === 'people' && <PeopleView people={people} onOpen={openProfile} onDelete={removePerson} onAdd={() => setTab('add')} />}
          {tab === 'add' && <AddView form={form} update={update} onSubmit={addPerson} busy={busy} />}
          {tab === 'profile' && <ProfileView person={selected} profile={profile} onAnalyze={analyze} onRank={loadRankings} busy={busy} />}
          {tab === 'rankings' && <RankingView person={selected} rankings={rankings} onReload={loadRankings} busy={busy} onOpenCandidate={async id => { const p = people.find(x => x.id === id); if (p) await openProfile(p) }} />}
        </section>
      </div>
      <footer><span>PAIRWISE / PROTOTYPE 0.1</span><span>Scores are estimates, not facts. Consent required.</span></footer>
    </main>
  </div>
}

function PeopleView({ people, onOpen, onDelete, onAdd }) {
  return <div className="view">
    <div className="view-head"><div><div className="eyebrow">YOUR DATASET</div><h2>Participants <span className="muted">({people.length})</span></h2><p>Each participant has two source links and one agent.</p></div><button className="primary" onClick={onAdd}>＋ Add person</button></div>
    {people.length === 0 ? <div className="empty-state"><div className="empty-icon">◎</div><h3>Your participant list starts here</h3><p>Add a consenting participant and provide notes from their public LinkedIn and Instagram profiles.</p><button className="primary" onClick={onAdd}>Add first participant</button></div> :
      <div className="people-list">{people.map((p, i) => <article className="person-row" key={p.id}>
        <div className="avatar">{p.display_name.slice(0,1).toUpperCase()}</div>
        <div className="person-main"><strong>{p.display_name}</strong><small>Agent #{p.id} · Two source links</small><div className="source-chips"><a href={p.linkedin_url} target="_blank" rel="noreferrer">in LinkedIn ↗</a><a href={p.instagram_url} target="_blank" rel="noreferrer">◎ Instagram ↗</a></div></div>
        <span className="consent-badge">✓ Consent confirmed</span>
        <button className="text-button" onClick={() => onOpen(p)}>Open profile ↗</button><button className="icon-button danger" onClick={() => onDelete(p)} title="Delete participant">×</button>
      </article>)}</div>}
    <div className="dataset-foot"><span>DATASET PROGRESS</span><strong>{people.length} / 25 people</strong><div className="progress"><span style={{width: `${Math.min(100, people.length/25*100)}%`}}/></div><small>{people.length >= 25 ? 'Minimum target reached.' : `${25 - people.length} more participants needed to reach the target.`}</small></div>
  </div>
}

function AddView({ form, update, onSubmit, busy }) {
  return <div className="view narrow">
    <div className="eyebrow">NEW PARTICIPANT / NEW AGENT</div><h2>Add a person</h2><p className="lead">Enter only the two approved profile URLs and notes taken from those public profiles. This app will not scrape either platform.</p>
    <form className="person-form" onSubmit={onSubmit}>
      <label>Display name<input required maxLength="120" value={form.display_name} onChange={e => update('display_name', e.target.value)} placeholder="e.g. Alex Morgan"/></label>
      <div className="form-grid">
        <label><span className="label-icon linkedin">in</span> Public LinkedIn URL<input required type="url" value={form.linkedin_url} onChange={e => update('linkedin_url', e.target.value)} placeholder="https://www.linkedin.com/in/…"/></label>
        <label><span className="label-icon instagram">◎</span> Public Instagram URL<input required type="url" value={form.instagram_url} onChange={e => update('instagram_url', e.target.value)} placeholder="https://www.instagram.com/…"/></label>
      </div>
      <div className="source-box"><div className="source-title"><span className="source-number">01</span><div><strong>LinkedIn source notes</strong><small>Professional interests, projects, public hobbies</small></div></div><textarea maxLength="12000" rows="4" value={form.linkedin_notes} onChange={e => update('linkedin_notes', e.target.value)} placeholder="Summarize only what is publicly stated on this LinkedIn profile…&#10;Example: Software developer interested in AI and startups."/></div>
      <div className="source-box"><div className="source-title"><span className="source-number">02</span><div><strong>Instagram source notes</strong><small>Publicly shared hobbies and interests</small></div></div><textarea maxLength="12000" rows="4" value={form.instagram_notes} onChange={e => update('instagram_notes', e.target.value)} placeholder="Summarize only what is publicly shown or stated on this Instagram profile…&#10;Example: Shares hiking photos and cooking projects."/></div>
      <label className="checkbox-row"><input type="checkbox" checked={form.consent_confirmed} onChange={e => update('consent_confirmed', e.target.checked)}/><span><strong>Participation consent confirmed</strong><small>This person has agreed to participate in this matchmaking simulation. Public profiles alone are not consent.</small></span></label>
      <button className="primary wide" disabled={busy}>{busy ? 'Adding…' : 'Create person & agent →'}</button>
      <p className="form-footnote">Please don't enter sensitive personal information or guess someone's dating preferences. Leave unknowns blank.</p>
    </form>
  </div>
}

function ProfileView({ person, profile, onAnalyze, onRank, busy }) {
  if (!person) return <div className="empty-state"><h3>Select a participant</h3><p>Choose someone from Participants to view their profile.</p></div>
  return <div className="view">
    <div className="profile-banner"><div className="profile-avatar">{person.display_name.slice(0,1).toUpperCase()}</div><div className="profile-id"><div className="eyebrow">AGENT PROFILE / #{person.id}</div><h2>{person.display_name}</h2><p>Represented by Agent #{person.id}</p></div><span className="consent-badge">✓ Consent confirmed</span></div>
    <div className="view-head compact"><div><h3>Person model</h3><p>Derived only from the two source notes entered for this participant.</p></div><button className="primary" onClick={onAnalyze} disabled={busy}>{busy ? 'Analyzing…' : '↻ Analyze sources'}</button></div>
    {!profile ? <div className="empty-state slim"><p>Analyze the two source notes to create the structured profile.</p><button className="primary" onClick={onAnalyze} disabled={busy}>Analyze profile</button></div> : <>
      <div className="source-summary">
        <a className="source-card" href={person.linkedin_url} target="_blank" rel="noreferrer"><span className="label-icon linkedin">in</span><div><strong>LinkedIn</strong><small>Source 01 · Public profile</small></div><b>↗</b></a>
        <a className="source-card" href={person.instagram_url} target="_blank" rel="noreferrer"><span className="label-icon instagram">◎</span><div><strong>Instagram</strong><small>Source 02 · Public profile</small></div><b>↗</b></a>
      </div>
      <div className="profile-grid">
        <TagCard title="Interests" subtitle="Keywords supported by source notes" items={profile.interests} />
        <TagCard title="Hobbies" subtitle="Potential hobbies explicitly surfaced in notes" items={profile.hobbies} />
        <TagCard title="Stated preferences" subtitle="Only explicit preference statements" items={profile.stated_preferences} />
      </div>
      <section className="evidence-section"><div className="section-title"><h3>Evidence trail</h3><span>{profile.evidence.length} signals</span></div>
        {profile.evidence.length ? profile.evidence.map((ev, i) => <div className="evidence-row" key={i}><span className="evidence-dot"/><div><strong>{ev.supports}</strong><p>Keyword “{ev.matched_text}” found in supplied {ev.source} notes.</p><a href={ev.url} target="_blank" rel="noreferrer">Open source ↗</a></div><span className="evidence-source">{ev.source}</span></div>) : <p className="muted-block">No interests identified yet. Add more notes from the two approved sources and analyze again.</p>}
      </section>
      <div className="limitations"><strong>Interpretation limits</strong><ul>{profile.limitations.map((l,i)=><li key={i}>{l}</li>)}</ul></div>
      <button className="primary" onClick={onRank}>Rank this agent's matches →</button>
    </>}
  </div>
}

function TagCard({ title, subtitle, items }) {
  return <div className="tag-card"><h4>{title}</h4><p>{subtitle}</p><div className="tags">{items?.length ? items.map(t => <span className="tag" key={t}>{t}</span>) : <span className="empty-tag">Not enough evidence yet</span>}</div></div>
}

function RankingView({ person, rankings, onReload, busy, onOpenCandidate }) {
  if (!person) return <div className="empty-state"><h3>Select an agent first</h3><p>Open a participant profile to generate rankings.</p></div>
  return <div className="view">
    <div className="eyebrow">AGENT-TO-AGENT SIMULATION</div><div className="view-head"><div><h2>Compatibility <span className="muted">/ #{person.id}</span></h2><p>Who appears to share the most publicly documented interests with {person.display_name}?</p></div><button className="secondary" onClick={onReload} disabled={busy}>{busy ? 'Calculating…' : '↻ Recalculate'}</button></div>
    <div className="ranking-note"><strong>How scores work</strong><span>Jaccard overlap of extracted interest tags. This is a transparent baseline, not a prediction of attraction or consent.</span></div>
    {rankings.length ? <div className="ranking-list">{rankings.map((r, i) => <article className="ranking-row" key={r.person_id}>
      <div className={`rank-number ${i < 3 ? 'top' : ''}`}>{String(i+1).padStart(2,'0')}</div><div className="avatar small">{r.display_name.slice(0,1).toUpperCase()}</div>
      <div className="rank-main"><strong>{r.display_name}</strong><p>{r.explanation}</p><div className="tags">{r.shared_interests.map(t => <span className="tag" key={t}>{t}</span>)}</div></div>
      <div className="score-wrap"><strong>{r.score}</strong><small>match score</small><div className="score-bar"><span style={{width: `${r.score}%`}}/></div></div>
      <button className="icon-button" title="Open candidate profile" onClick={() => onOpenCandidate(r.person_id)}>↗</button>
    </article>)}</div> : <div className="empty-state slim"><p>No rankings loaded yet. Add at least two participants.</p><button className="primary" onClick={onReload} disabled={busy}>Generate rankings</button></div>}
  </div>
}

createRoot(document.getElementById('root')).render(<App />)
