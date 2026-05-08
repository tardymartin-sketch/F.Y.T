// ============================================================
// F.Y.T - SET AS TEMPLATE MODAL
// After completing a session, save it as a reusable template.
// ============================================================

import React, { useState } from 'react';
import { X, Pin } from 'lucide-react';

interface Props {
  onConfirm: (name: string, pinned: boolean) => void;
  onClose?: () => void;
  onCancel?: () => void;
}

export function SetAsTemplateModal({ onConfirm, onClose, onCancel }: Props) {
  const dismiss = onCancel ?? onClose ?? (() => {});
  const [name, setName] = useState('');
  const [pinned, setPinned] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed, pinned);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={dismiss}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: '16px 16px 0 0',
          padding: '24px',
          width: '100%',
          maxWidth: 480,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
            Sauvegarder comme template
          </h2>
          <button
            onClick={dismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Template name input */}
          <label style={{ display: 'block', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
              Nom du template
            </span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex. Push A, Full Body, Jambes..."
              autoFocus
              style={{
                display: 'block',
                width: '100%',
                marginTop: 6,
                padding: '12px 14px',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                color: 'var(--color-text)',
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </label>

          {/* Pinned toggle */}
          <button
            type="button"
            onClick={() => setPinned(p => !p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 16,
              padding: '12px 14px',
              width: '100%',
              background: pinned ? 'rgba(217, 119, 6, 0.08)' : 'var(--color-surface-elevated)',
              border: `1px solid ${pinned ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 10,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Pin
              size={16}
              style={{ color: pinned ? 'var(--color-accent)' : 'var(--color-text-muted)', flexShrink: 0 }}
            />
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: pinned ? 'var(--color-accent)' : 'var(--color-text)' }}>
                Épingler en haut
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                Apparaît en premier dans la liste des templates
              </div>
            </div>
          </button>

          {/* Submit */}
          <button
            type="submit"
            disabled={!name.trim()}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 20,
              padding: '14px',
              fontFamily: 'var(--font-display)',
              fontSize: 15,
              fontWeight: 700,
              color: name.trim() ? '#fff' : 'var(--color-text-muted)',
              background: name.trim() ? 'var(--color-accent)' : 'var(--color-surface-elevated)',
              border: 'none',
              borderRadius: 12,
              cursor: name.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Sauvegarder
          </button>
        </form>
      </div>
    </div>
  );
}
