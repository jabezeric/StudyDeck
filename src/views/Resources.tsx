import { useMemo, useState } from 'react'
import { CATEGORIES, RESOURCES, TOOLS } from '../data/resources'
import { Empty, Icon, Modal } from '../components/ui'
import { useApp } from '../store'

export default function Resources() {
  const { state, addResource, removeResource, toast } = useApp()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('All')
  const [draft, setDraft] = useState<{
    name: string
    url: string
    category: string
    note: string
  } | null>({ name: '', url: '', category: 'Exam prep', note: '' })

  const all = useMemo(
    () => [
      ...state.resources.map((r) => ({
        id: r.id,
        name: r.name,
        url: r.url,
        category: r.category,
        note: r.note,
        custom: true,
      })),
      ...RESOURCES.map((r, i) => ({ ...r, id: `seed-${i}`, custom: false })),
    ],
    [state.resources],
  )

  const filtered = all.filter((r) => {
    const matchesCategory = category === 'All' || r.category === category
    const q = query.trim().toLowerCase()
    const matchesQuery =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.note.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    return matchesCategory && matchesQuery
  })

  function add() {
    if (!draft) return
    let url = draft.url.trim()
    if (!draft.name.trim()) {
      toast('Give the resource a name', 'warn')
      return
    }
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`
    try {
      new URL(url)
    } catch {
      toast('That does not look like a web address', 'warn')
      return
    }
    addResource({
      name: draft.name.trim(),
      url,
      category: draft.category,
      note: draft.note.trim() || 'Added by you.',
    })
    setDraft(null)
    toast('Resource saved', 'good')
  }

  return (
    <>
      <section className="card">
        <div className="row" style={{ gap: 10 }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <input
              className="input"
              placeholder="Search subjects, sites, topics…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: 34 }}
            />
            <span
              style={{
                position: 'absolute',
                left: 11,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--dim)',
                display: 'grid',
              }}
            >
              <Icon name="search" size={15} />
            </span>
          </div>
          <button
            className="btn"
            onClick={() => setDraft({ name: '', url: '', category: 'Exam prep', note: '' })}
          >
            <Icon name="plus" size={14} /> Add a site
          </button>
        </div>
        <div className="row" style={{ gap: 6, marginTop: 12 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`pill ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="card-head" style={{ marginBottom: 10 }}>
          <div className="card-title">Library</div>
          <span className="card-sub">
            {filtered.length} site{filtered.length === 1 ? '' : 's'} · opens in a new tab
          </span>
        </div>
        {filtered.length === 0 ? (
          <Empty>Nothing matches that search. Try a broader term, or add the site you use.</Empty>
        ) : (
          <div className="res-grid">
            {filtered.map((r) => (
              <div className="res-card" key={r.id}>
                {r.custom && (
                  <button
                    className="icon-btn res-remove"
                    onClick={() => removeResource(r.id)}
                    aria-label="Remove resource"
                  >
                    <Icon name="trash" size={13} />
                  </button>
                )}
                <div className="res-name">{r.name}</div>
                <div className="res-note">{r.note}</div>
                <div className="res-foot">
                  <span className="badge">{r.category}</span>
                  <a className="btn btn-sm btn-ghost" href={r.url} target="_blank" rel="noreferrer">
                    Open <Icon name="external" size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="card-head" style={{ marginBottom: 10 }}>
          <div className="card-title">AI tutors & virtual labs</div>
          <span className="card-sub">Use these beside your own work — then explain it back</span>
        </div>
        <div className="res-grid">
          {TOOLS.map((t) => (
            <div className="res-card" key={t.name}>
              <div className="res-name">{t.name}</div>
              <div className="res-note">{t.blurb}</div>
              <div className="res-foot">
                <span className="badge low">{t.tag}</span>
                <a className="btn btn-sm btn-ghost" href={t.url} target="_blank" rel="noreferrer">
                  Launch <Icon name="external" size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-title">How to use a solver without wasting the lesson</div>
        <ol className="card-sub" style={{ marginTop: 10, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>Try it yourself first for 5 minutes. Write down where exactly you stall.</li>
          <li>Ask for the next step only, not the whole answer.</li>
          <li>Close the site and redo the question from a blank page.</li>
          <li>If you cannot redo it, you did not learn it yet — schedule a review block.</li>
        </ol>
      </section>

      {draft && (
        <Modal
          title="Add a study site"
          sub="Anything you use: Learner AI, MathGPT, your school portal, a YouTube channel."
          onClose={() => setDraft(null)}
        >
          <div className="stack" style={{ gap: 12 }}>
            <div className="field">
              <label>Name</label>
              <input
                className="input"
                autoFocus
                placeholder="e.g. Learner AI"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Web address</label>
              <input
                className="input"
                placeholder="https://…"
                value={draft.url}
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Category</label>
                <select
                  className="select"
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Why it helps</label>
                <input
                  className="input"
                  placeholder="Short note for future you"
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={add}>
              Save site
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
