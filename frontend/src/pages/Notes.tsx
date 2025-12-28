import React, { useEffect, useState } from 'react'
import * as notesApi from '../services/notes'

const NotesPage: React.FC = () => {
  const [notes, setNotes] = useState<Array<{id:string;title:string;body:string;createdAt:string}>>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await notesApi.listNotes()
      setNotes(res)
    } catch (err) {}
    finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  const create = async () => {
    if (!title && !body) return
    await notesApi.createNote({ title, body })
    setTitle(''); setBody('')
    await load()
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>Notes</h2>
        <div>
          <button className="btn" onClick={create}>Create</button>
        </div>
      </div>

      <div style={{marginTop:12}}>
        <div style={{display:'flex',gap:8}}>
          <input className="search" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
          <input className="search" placeholder="Body" value={body} onChange={e=>setBody(e.target.value)} />
        </div>

        {loading ? <div style={{marginTop:12}}>Loading…</div> : (
          <div style={{marginTop:12}}>
            {notes.length === 0 ? <div className="card">No notes yet</div> : (
              <div className="card">
                <ul>
                  {notes.map(n => (
                    <li key={n.id} style={{marginBottom:8}}>
                      <div style={{fontWeight:700}}>{n.title || '(no title)'}</div>
                      <div style={{color:'var(--muted)'}}>{n.body}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default NotesPage
