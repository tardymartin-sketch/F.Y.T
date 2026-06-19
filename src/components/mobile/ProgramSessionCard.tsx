import React, { useState } from 'react';
import { Dumbbell, Video, MessageSquare } from 'lucide-react';
import { ProgramSession } from '../../../types';
import { VideoModal } from '../common/VideoModal';
import { RichTextDisplay } from '../common/RichTextDisplay';

interface Props {
  session: ProgramSession;
  onLaunch: (session: ProgramSession) => void;
  disabled?: boolean;
}

export function ProgramSessionCard({ session, onLaunch, disabled = false }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [videoModal, setVideoModal] = useState<{ url: string; name: string } | null>(null);

  const exercises = session.rows.filter(r => !r.isTextBlock);
  const exerciseCount = exercises.length;

  // Notes du coach par semaine (lignes bloc-texte du programme)
  const textBlocks = session.rows
    .filter(r => r.isTextBlock && (r.textBlockContent ?? '').trim() !== '')
    .sort((a, b) => a.ordre - b.ordre);

  return (
    <div
      style={{
        background: 'var(--color-surface-2)',
        border: isExpanded
          ? '1.5px solid var(--color-accent)'
          : '1px solid var(--color-border)',
        borderRadius: 12,
        marginBottom: 10,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
    >
      {/* ── Header : clic pour expand ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(v => !v)}
        onKeyDown={e => e.key === 'Enter' && setIsExpanded(v => !v)}
        style={{
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Icône */}
        <div
          style={{
            width: 44,
            height: 44,
            background: 'var(--color-surface)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Dumbbell size={20} color="var(--color-accent)" />
        </div>

        {/* Nom + compteur */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {session.seanceType}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {exerciseCount} exercice{exerciseCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Lancer + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); onLaunch(session); }}
            disabled={disabled}
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 14,
              color: disabled ? 'var(--color-text-muted)' : 'var(--color-accent)',
              background: 'none',
              border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              padding: '4px',
              flexShrink: 0,
            }}
          >
            Lancer
          </button>
          <div style={{ color: 'var(--color-text-muted)', lineHeight: 0 }}>
            {isExpanded
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            }
          </div>
        </div>
      </div>

      {/* ── Contenu déplié : notes du coach + liste des exercices ── */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '10px 16px 14px' }}>
          {textBlocks.map((block) => (
            <div
              key={block.id}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-accent)',
                borderLeft: '3px solid var(--color-accent)',
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <MessageSquare size={13} color="var(--color-accent)" />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--color-accent)',
                  }}
                >
                  Note du coach
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                <RichTextDisplay html={block.textBlockContent ?? ''} />
              </div>
            </div>
          ))}
          {exercises.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '8px 0' }}>
              Aucun exercice
            </p>
          ) : (
            exercises.map((row, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: idx < exercises.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--color-text-primary)', flex: 1 }}>
                  {row.exercice}
                </span>
                {row.video && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setVideoModal({ url: row.video, name: row.exercice });
                    }}
                    aria-label={`Voir la vidéo de ${row.exercice}`}
                    title="Voir la vidéo"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginLeft: 8,
                      padding: 4,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-accent)',
                      lineHeight: 0,
                    }}
                  >
                    <Video size={16} />
                  </button>
                )}
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', flexShrink: 0, marginLeft: 8 }}>
                  {row.series || '—'} × {row.repsDuree || '—'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {videoModal && (
        <VideoModal
          url={videoModal.url}
          exerciseName={videoModal.name}
          onClose={() => setVideoModal(null)}
        />
      )}
    </div>
  );
}
