import React, { useEffect, useRef, useState } from 'react'

type Option = { value: string; label: string }

type Props = {
  options: Option[]
  value: string
  onChange: (val: string) => void
  id?: string
}

const Select: React.FC<Props> = ({ options, value, onChange, id }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const selected = options.find(o => o.value === value) || (options.length ? options[0] : { value: '', label: '' })

  return (
    <div className="select-wrapper" ref={ref} id={id}>
      <button type="button" className="custom-select-button" onClick={() => setOpen(v => !v)} aria-haspopup="listbox" aria-expanded={open}>
        {options.length ? selected.label : 'No options'}
        <span className="caret" aria-hidden>▾</span>
      </button>
      {open && (
        <ul className="custom-select-list" role="listbox">
          {options.length ? options.map(o => (
            <li key={o.value} role="option" aria-selected={o.value === value} className={`custom-select-item ${o.value === value ? 'selected' : ''}`} onClick={() => { onChange(o.value); setOpen(false) }}>
              {o.label}
            </li>
          )) : (
            <li className="custom-select-item" style={{opacity:0.7}}>No options</li>
          )}
        </ul>
      )}
    </div>
  )
}

export default Select
