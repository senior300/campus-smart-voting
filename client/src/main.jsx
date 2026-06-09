import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BadgeCheck,
  BarChart3,
  CalendarClock,
  Check,
  ClipboardList,
  LogOut,
  ShieldCheck,
  UserPlus,
  Vote
} from 'lucide-react';
import { api, clearSession, getUser, setSession } from './api.js';
import './styles.css';

function AuthView({ onSession }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    studentNo: '',
    fullName: '',
    email: '',
    password: '',
    department: ''
  });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      if (mode === 'register') {
        await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify(form)
        });
        setMode('login');
        setMessage('Account created. You can log in now.');
      } else {
        const session = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: form.email, password: form.password })
        });
        setSession(session);
        onSession(session.user);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-backdrop">
        <span>Student Elections</span>
        <strong>Trusted digital voting for campus leadership</strong>
      </div>
      <section className="auth-panel">
        <div className="brand-mark"><Vote size={28} /></div>
        <h1>CampusVote</h1>
        <p>Secure student council elections with verified access, private ballots, and instant tallying.</p>

        <div className="segmented" aria-label="Authentication mode">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">
            Login
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">
            Register
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <>
              <label>
                Registration number
                <input
                  name="studentNo"
                  placeholder="e.g. TTU/2026/001"
                  value={form.studentNo}
                  onChange={updateField}
                  required
                />
              </label>
              <label>
                Full name
                <input name="fullName" value={form.fullName} onChange={updateField} required />
              </label>
              <label>
                Department
                <input name="department" value={form.department} onChange={updateField} />
              </label>
            </>
          )}
          <label>
            Email
            <input
              type="email"
              name="email"
              placeholder={mode === 'register' ? 'name@student.ttu.ac.ke' : 'ogelobilly12@gmail.com'}
              value={form.email}
              onChange={updateField}
              required
            />
          </label>
          <label>
            Password
            <input type="password" name="password" value={form.password} onChange={updateField} required />
          </label>
          <button className="primary" disabled={busy} type="submit">
            {mode === 'login' ? <ShieldCheck size={18} /> : <UserPlus size={18} />}
            {busy ? 'Please wait' : mode === 'login' ? 'Enter voting portal' : 'Create student account'}
          </button>
        </form>
        {message && <p className="notice">{message}</p>}
      </section>
    </main>
  );
}

function ElectionList({ elections, selectedId, onSelect }) {
  return (
    <aside className="sidebar">
      <div className="section-title">
        <ClipboardList size={18} />
        Elections
      </div>
      {elections.map((election) => (
        <button
          className={`election-row ${selectedId === election.id ? 'selected' : ''}`}
          key={election.id}
          onClick={() => onSelect(election.id)}
          type="button"
        >
          <span>{election.title}</span>
          <small>{election.has_voted ? 'Voted' : election.status}</small>
        </button>
      ))}
    </aside>
  );
}

function VotingPanel({ electionId, onVoted }) {
  const [data, setData] = useState(null);
  const [selections, setSelections] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!electionId) return;
    api(`/elections/${electionId}`)
      .then(setData)
      .catch((error) => setMessage(error.message));
  }, [electionId]);

  async function submitVote() {
    setBusy(true);
    setMessage('');
    try {
      const response = await api(`/elections/${electionId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ selections })
      });
      setMessage(`${response.message} Receipt: ${response.receiptCode}`);
      onVoted();
      const fresh = await api(`/elections/${electionId}`);
      setData(fresh);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <section className="panel">Loading election...</section>;
  }

  const hasVoted = Boolean(data.ballot);
  const allSelected = data.positions.every((position) => selections[position.id]);
  const selectedCount = Object.keys(selections).length;

  return (
    <section className="panel voting-panel">
      <div className="panel-heading">
        <div>
          <h2>{data.election.title}</h2>
          <p>{data.election.description}</p>
        </div>
        <span className={`status ${data.election.status}`}>{data.election.status}</span>
      </div>

      <div className="vote-progress">
        <span>{selectedCount} of {data.positions.length} positions selected</span>
        <div><i style={{ width: `${data.positions.length ? (selectedCount / data.positions.length) * 100 : 0}%` }} /></div>
      </div>

      {hasVoted && (
        <div className="receipt">
          <BadgeCheck size={20} />
          Ballot received. Receipt code: <strong>{data.ballot.receipt_code}</strong>
        </div>
      )}

      {data.positions.map((position) => (
        <div className="position-block" key={position.id}>
          <h3>{position.title}</h3>
          <div className="candidate-grid">
            {position.candidates.filter(Boolean).map((candidate) => (
              <label className={`candidate ${selections[position.id] === candidate.id ? 'chosen' : ''}`} key={candidate.id}>
                <input
                  checked={selections[position.id] === candidate.id}
                  disabled={hasVoted}
                  name={`position-${position.id}`}
                  onChange={() => setSelections({ ...selections, [position.id]: candidate.id })}
                  type="radio"
                />
                <img alt="" src={candidate.photoUrl} />
                <span className="candidate-name">{candidate.fullName}</span>
                <small>{candidate.department}</small>
                <p>{candidate.manifesto}</p>
              </label>
            ))}
          </div>
        </div>
      ))}

      {!hasVoted && (
        <button className="primary submit-vote" disabled={!allSelected || busy} onClick={submitVote} type="button">
          <Check size={18} />
          {busy ? 'Submitting ballot' : 'Submit final vote'}
        </button>
      )}
      {message && <p className="notice">{message}</p>}
    </section>
  );
}

function ResultsPanel({ electionId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!electionId) return;
    api(`/elections/${electionId}/results`).then(setData).catch(() => setData(null));
  }, [electionId]);

  const grouped = useMemo(() => {
    if (!data) return [];
    return Object.values(
      data.results.reduce((groups, row) => {
        groups[row.position_id] ||= { title: row.position_title, candidates: [] };
        groups[row.position_id].candidates.push(row);
        return groups;
      }, {})
    );
  }, [data]);

  if (!data) return null;

  const turnout = Number(data.turnout.ballots_cast || 0);
  const eligible = Number(data.turnout.eligible_voters || 0);
  const percentage = eligible ? Math.round((turnout / eligible) * 100) : 0;

  return (
    <section className="panel results-panel">
      <div className="section-title">
        <BarChart3 size={18} />
        Results and turnout
      </div>
      <div className="turnout">
        <span>{turnout} ballots</span>
        <div><i style={{ width: `${percentage}%` }} /></div>
        <span>{percentage}% turnout</span>
      </div>
      {grouped.map((position) => (
        <div className="result-group" key={position.title}>
          <h3>{position.title}</h3>
          {position.candidates.map((candidate) => (
            <div className="result-row" key={candidate.candidate_id}>
              <span>{candidate.full_name}</span>
              <strong>{candidate.vote_count}</strong>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

function AdminOverview({ user }) {
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      api('/admin/overview').then(setOverview).catch(() => setOverview(null));
    }
  }, [user]);

  if (user?.role !== 'admin' || !overview) return null;

  return (
    <section className="panel admin-panel">
      <div className="section-title">
        <ShieldCheck size={18} />
        Admin overview
      </div>
      <div className="stat-grid">
        <strong>{overview.stats.students}<span>Students</span></strong>
        <strong>{overview.stats.elections}<span>Elections</span></strong>
        <strong>{overview.stats.candidates}<span>Candidates</span></strong>
        <strong>{overview.stats.ballots}<span>Ballots</span></strong>
      </div>
      <h3>Recent audit log</h3>
      {overview.logs.map((log) => (
        <div className="audit-row" key={log.id}>
          <span>{log.action.replaceAll('_', ' ')}</span>
          <small>{log.full_name || 'System'}</small>
        </div>
      ))}
    </section>
  );
}

function App() {
  const [user, setUser] = useState(getUser());
  const [elections, setElections] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  async function loadElections() {
    const data = await api('/elections');
    setElections(data.elections);
    setSelectedId((current) => current || data.elections[0]?.id || null);
  }

  useEffect(() => {
    if (user) loadElections().catch(() => clearSession());
  }, [user]);

  if (!user) {
    return <AuthView onSession={setUser} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="brand-line"><Vote size={22} /> CampusVote</span>
          <p>{user.fullName} · {user.role}</p>
        </div>
        <button
          className="icon-button"
          onClick={() => {
            clearSession();
            setUser(null);
          }}
          title="Log out"
          type="button"
        >
          <LogOut size={20} />
        </button>
      </header>

      <div className="workspace">
        <ElectionList elections={elections} selectedId={selectedId} onSelect={setSelectedId} />
        <div className="main-column">
          <div className="portal-summary">
            <div className="summary-card">
              <Vote size={20} />
              <strong>{elections.length}</strong>
              <span>Elections</span>
            </div>
            <div className="summary-card accent-red">
              <ShieldCheck size={20} />
              <strong>{user.role}</strong>
              <span>Access level</span>
            </div>
            <div className="summary-card accent-gold">
              <CalendarClock size={20} />
              <strong>Verified</strong>
              <span>Voting session</span>
            </div>
          </div>
          {selectedId && <VotingPanel electionId={selectedId} onVoted={loadElections} />}
          {selectedId && <ResultsPanel electionId={selectedId} />}
          <AdminOverview user={user} />
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
