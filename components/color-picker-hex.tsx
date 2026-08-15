'use client'

import { useState } from 'react'

const REGEX_HEX = /^#[0-9A-Fa-f]{6}$/

// Sin dependencias nuevas: <input type="color"> ya da un selector visual
// nativo en todos los navegadores modernos (incluido mobile). Lo único que
// agrega este componente es la sincronización con un input de texto para
// poder tipear el HEX a mano, como pediste explícitamente ("[selector] #2563EB").
export function ColorPickerHex({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (hex: string) => void
}) {
  const [textoLocal, setTextoLocal] = useState(value)
  const [error, setError] = useState(false)

  function onCambiarTexto(nuevo: string) {
    setTextoLocal(nuevo)
    if (REGEX_HEX.test(nuevo)) {
      setError(false)
      onChange(nuevo)
    } else {
      setError(true)
    }
  }

  function onCambiarPicker(nuevo: string) {
    setTextoLocal(nuevo)
    setError(false)
    onChange(nuevo)
  }

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={REGEX_HEX.test(textoLocal) ? textoLocal : value}
          onChange={(e) => onCambiarPicker(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border p-0.5"
        />
        <input
          type="text"
          value={textoLocal}
          onChange={(e) => onCambiarTexto(e.target.value)}
          placeholder="#RRGGBB"
          maxLength={7}
          className={`w-28 rounded border px-2 py-1.5 text-sm font-mono ${error ? 'border-red-400 text-red-600' : ''}`}
        />
      </div>
      {error && <p className="text-xs text-red-600">Formato inválido — usá #RRGGBB (ej: #2563EB)</p>}
    </div>
  )
}
