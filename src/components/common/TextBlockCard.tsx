/**
 * TextBlockCard - Composant pour afficher/éditer un bloc de texte riche dans une séance.
 *
 * Utilisé dans :
 * - SessionsList.tsx (édition coach)
 * - SessionDetail.tsx (création de séance)
 * - SessionPreview.tsx (affichage lecture seule)
 * - ActiveSessionMobile.tsx (affichage pendant l'entraînement)
 */
import React, { useState } from 'react';
import {
  GripVertical,
  Trash2,
  FileText,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { RichTextDisplay } from '../desktop/RichTextEditor';
import { LexicalRichTextEditor } from '../desktop/LexicalEditor';

// ===========================================
// PROPS
// ===========================================

interface TextBlockCardProps {
  /** Contenu HTML du bloc */
  content: string;
  /** Callback quand le contenu change */
  onChange?: (content: string) => void;
  /** Callback pour supprimer le bloc */
  onDelete?: () => void;
  /** Mode édition activé (drag, delete, edit) */
  isEditing?: boolean;
  /** Props pour le drag & drop */
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  /** Classes CSS additionnelles */
  className?: string;
  /** Style visuel quand l'item est draggé */
  isDragged?: boolean;
  /** Mode compact (pour mobile/preview) */
  compact?: boolean;
}

// ===========================================
// COMPOSANT
// ===========================================

export const TextBlockCard: React.FC<TextBlockCardProps> = ({
  content,
  onChange,
  onDelete,
  isEditing = false,
  draggable = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  className = '',
  isDragged = false,
  compact = false,
}) => {
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const handleStartEdit = () => {
    setEditedContent(content);
    setIsEditingContent(true);
  };

  const handleSave = () => {
    onChange?.(editedContent);
    setIsEditingContent(false);
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditingContent(false);
  };

  // ---- Mode lecture seule (preview / athlete) ----
  if (!isEditing && !isEditingContent) {
    return (
      <div
        className={`rounded-lg border-2 border-blue-500/30 bg-blue-500/5 overflow-hidden ${className}`}
        onDragOver={onDragOver}
      >
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border-b border-blue-500/20">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-blue-400">Instructions</span>
        </div>
        <div className={`px-3 ${compact ? 'py-2' : 'py-3'}`}>
          <RichTextDisplay
            html={content}
            className="text-sm text-theme-secondary"
          />
        </div>
      </div>
    );
  }

  // ---- Mode édition inline (contenu en cours de modification) ----
  if (isEditingContent) {
    return (
      <div
        className={`rounded-lg border-2 border-blue-500/50 bg-blue-500/5 overflow-hidden ${className}`}
        onDragOver={onDragOver}
      >
        <div className="flex items-center justify-between px-3 py-2 bg-blue-500/10 border-b border-blue-500/20">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">Modifier les instructions</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              className="p-1.5 rounded-md bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors"
              title="Sauvegarder"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
              title="Annuler"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-3">
          <LexicalRichTextEditor
            value={editedContent}
            onChange={setEditedContent}
            placeholder="Ajoutez des instructions pour les athlètes..."
          />
        </div>
      </div>
    );
  }
  // ---- Mode édition (coach - avec grip, boutons action) ----
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`rounded-lg border-2 border-blue-500/30 bg-blue-500/5 overflow-hidden transition-all duration-200 ${
        isDragged ? 'opacity-70 shadow-lg shadow-blue-500/30 scale-[1.02] ring-2 ring-blue-500' : ''
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${className}`}
    >
      {/* Header avec grip + actions */}
      <div className="flex items-center justify-between px-3 py-2 bg-blue-500/10 border-b border-blue-500/20">
        <div className="flex items-center gap-2">
          {draggable && (
            <GripVertical className="w-4 h-4 text-blue-400/60 cursor-move" />
          )}
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-blue-400">Instructions</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleStartEdit}
            className="p-1.5 rounded-md text-theme-muted hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
            title="Modifier"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-md text-theme-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Supprimer le bloc"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {/* Contenu */}
      <div className="px-3 py-2">
        {content ? (
          <RichTextDisplay
            html={content}
            className="text-sm text-theme-secondary"
          />
        ) : (
          <p className="text-sm text-theme-muted italic">
            Cliquez sur le crayon pour ajouter des instructions...
          </p>
        )}
      </div>
    </div>
  );
};

export default TextBlockCard;
