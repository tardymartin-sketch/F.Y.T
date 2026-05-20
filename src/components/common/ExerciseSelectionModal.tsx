import React, { useState, useMemo } from 'react';
import { Search, X, Dumbbell } from 'lucide-react';
import { Exercise, parseExerciseName } from '../../../types';

interface ExerciseSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  onSelect: (exerciseId: string) => void;
  title?: string;
}

// Helper to normalize string for case-insensitive search
function normalizeString(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function ExerciseSelectionModal({
  isOpen,
  onClose,
  exercises,
  onSelect,
  title = "Sélectionner un exercice"
}: ExerciseSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSearchItems, setExpandedSearchItems] = useState<Set<string>>(new Set());

  const searchResults = useMemo(() => {
    const term = searchTerm.trim();
    if (!term) return null;
    const normalized = normalizeString(term);

    // Group by base name to deduplicate variants
    const baseNameMap = new Map<string, Exercise[]>();
    exercises.forEach(ex => {
      const base = parseExerciseName(ex.name).baseName;
      if (!baseNameMap.has(base)) baseNameMap.set(base, []);
      baseNameMap.get(base)!.push(ex);
    });

    const exerciseResults: { baseName: string; variants: Exercise[] }[] = [];

    baseNameMap.forEach((variants, baseName) => {
      const matches = variants.some(ex =>
        normalizeString(ex.name).includes(normalized) ||
        (ex.aliasEn ? normalizeString(ex.aliasEn).includes(normalized) : false),
      );
      if (matches) {
        exerciseResults.push({ baseName, variants });
      }
    });

    return exerciseResults;
  }, [searchTerm, exercises]);

  const toggleSearchExpand = (id: string) => {
    setExpandedSearchItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-theme w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[80vh] border border-theme">
        <div className="p-4 border-b border-theme flex items-center justify-between">
          <h2 className="text-lg font-semibold text-theme">{title}</h2>
          <button onClick={onClose} className="p-2 text-theme-muted hover:bg-theme-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-theme">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder="Rechercher un exercice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 bg-theme-secondary border border-theme rounded-xl text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-theme-muted hover:text-theme"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!searchTerm ? (
            <div className="text-center py-8 text-theme-muted flex flex-col items-center">
              <Dumbbell className="w-8 h-8 mb-2 opacity-50" />
              <p>Tapez un nom d'exercice pour commencer la recherche</p>
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="flex flex-col gap-2">
              {searchResults.map(({ baseName, variants }) => {
                const isExpanded = expandedSearchItems.has(baseName);
                return (
                  <div key={baseName} className="flex flex-col bg-theme-secondary/30 rounded-xl border border-theme overflow-hidden">
                    <button
                      onClick={() => {
                        if (variants.length > 1) {
                          toggleSearchExpand(baseName);
                        } else {
                          onSelect(variants[0].id);
                          onClose();
                        }
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-theme-secondary text-sm text-theme flex items-center justify-between transition-colors"
                    >
                      <span className="font-medium">{baseName}</span>
                      {variants.length > 1 && (
                        <span className="text-xs px-2 py-0.5 bg-theme-secondary rounded-full text-theme-muted">
                          {variants.length} variantes
                        </span>
                      )}
                    </button>
                    {isExpanded && variants.length > 1 && (
                      <div className="px-2 pb-2 bg-theme-secondary/10">
                        {variants.map(variant => (
                          <button
                            key={variant.id}
                            onClick={() => {
                              onSelect(variant.id);
                              onClose();
                            }}
                            className="w-full text-left px-4 py-2 mt-1 rounded-lg hover:bg-theme-secondary text-sm text-theme-muted hover:text-theme transition-colors flex items-center before:content-[''] before:w-1 before:h-1 before:bg-theme-muted before:rounded-full before:mr-3"
                          >
                            {variant.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-theme-muted">
              Aucun exercice trouvé pour "{searchTerm}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
