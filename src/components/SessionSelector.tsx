import React, { useMemo, useEffect, useRef } from 'react';
import { WorkoutRow, FilterState } from '../../types';
import { Calendar, Check, ChevronDown } from 'lucide-react';

interface Props {
  data: WorkoutRow[];
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
}

export const SessionSelector: React.FC<Props> = ({ data, filters, onChange }) => {
  const hasAutoSelected = useRef(false);

  // Années disponibles
  const years = useMemo(() => 
    Array.from(new Set(data.map(d => d.annee))).filter(Boolean).sort().reverse(), 
    [data]
  );
  
  // Mois disponibles pour l'année sélectionnée
  const months = useMemo(() => {
    if (!filters.selectedAnnee) return [];
    const filtered = data.filter(d => d.annee === filters.selectedAnnee);
    const uniqueMonths = new Map<string, string>();
    filtered.forEach(d => {
      if (d.moisNum && !uniqueMonths.has(d.moisNum)) {
        uniqueMonths.set(d.moisNum, d.moisNom);
      }
    });
    return Array.from(uniqueMonths.entries()).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  }, [data, filters.selectedAnnee]);

  // Semaines disponibles
  const weeks = useMemo(() => {
    if (!filters.selectedAnnee || !filters.selectedMois) return [];
    const filtered = data.filter(d => 
      d.annee === filters.selectedAnnee && 
      d.moisNum === filters.selectedMois
    );
    return Array.from(new Set(filtered.map(d => d.semaine)))
      .filter(Boolean)
      .sort((a, b) => parseInt(a) - parseInt(b));
  }, [data, filters.selectedAnnee, filters.selectedMois]);

  // Sessions disponibles
  const sessions = useMemo(() => {
    if (!filters.selectedAnnee || !filters.selectedMois || !filters.selectedSemaine) return [];
    const filtered = data.filter(d => 
      d.annee === filters.selectedAnnee && 
      d.moisNum === filters.selectedMois &&
      d.semaine === filters.selectedSemaine
    );
    return Array.from(new Set(filtered.map(d => d.seance)))
      .filter(Boolean)
      .sort((a, b) => parseInt(a) - parseInt(b));
  }, [data, filters.selectedAnnee, filters.selectedMois, filters.selectedSemaine]);

  // Auto-sélection initiale
  useEffect(() => {
    if (data.length > 0 && !hasAutoSelected.current && years.length > 0) {
      const now = new Date();
      const currentYear = now.getFullYear().toString();
      const currentMonth = (now.getMonth() + 1).toString();
      
      const hasYear = years.includes(currentYear);
      const targetYear = hasYear ? currentYear : years[0];
      
      const availableMonths = data
        .filter(d => d.annee === targetYear)
        .map(d => d.moisNum)
        .filter(Boolean);
      
      const matchingMonth = availableMonths.find(m => parseInt(m) === parseInt(currentMonth)) 
        || availableMonths[0];

      if (targetYear && matchingMonth) {
        onChange({
          selectedAnnee: targetYear,
          selectedMois: matchingMonth,
          selectedSemaine: null,
          selectedSeances: []
        });
      }
      hasAutoSelected.current = true;
    }
  }, [data, years, onChange]);

  const handleYearChange = (value: string) => {
    onChange({ 
      selectedAnnee: value, 
      selectedMois: null, 
      selectedSemaine: null, 
      selectedSeances: [] 
    });
  };

  const handleMonthChange = (value: string) => {
    onChange({ 
      ...filters, 
      selectedMois: value, 
      selectedSemaine: null, 
      selectedSeances: [] 
    });
  };

  const handleWeekChange = (value: string) => {
    onChange({ 
      ...filters, 
      selectedSemaine: value, 
      selectedSeances: [] 
    });
  };
  
  const toggleSession = (session: string) => {
    const current = filters.selectedSeances;
    if (current.includes(session)) {
      onChange({ ...filters, selectedSeances: current.filter(s => s !== session) });
    } else {
      onChange({ ...filters, selectedSeances: [...current, session] });
    }
  };

  const selectAllSessions = () => {
    onChange({ ...filters, selectedSeances: sessions });
  };

  const clearSessions = () => {
    onChange({ ...filters, selectedSeances: [] });
  };

  // Obtenir le nom court du mois
  const getShortMonthName = (monthNum: string): string => {
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const idx = parseInt(monthNum) - 1;
    return monthNames[idx] || monthNum;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Filtres principaux - 3 en ligne */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {/* Année */}
        <div>
          <label className="block text-xs md:text-sm font-medium text-slate-400 mb-1 md:mb-2">Année</label>
          <div className="relative">
            <select 
              className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-lg md:rounded-xl px-2 md:px-4 py-2 md:py-3 pr-6 md:pr-10 text-sm md:text-base appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
              value={filters.selectedAnnee || ''}
              onChange={(e) => handleYearChange(e.target.value)}
            >
              <option value="">—</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 md:right-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Mois */}
        <div>
          <label className="block text-xs md:text-sm font-medium text-slate-400 mb-1 md:mb-2">Mois</label>
          <div className="relative">
            <select 
              className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-lg md:rounded-xl px-2 md:px-4 py-2 md:py-3 pr-6 md:pr-10 text-sm md:text-base appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              value={filters.selectedMois || ''}
              onChange={(e) => handleMonthChange(e.target.value)}
              disabled={!filters.selectedAnnee}
            >
              <option value="">—</option>
              {months.map(([num, name]) => (
                <option key={num} value={num}>
                  {/* Afficher le nom court sur mobile via le nom complet */}
                  {name || `Mois ${num}`}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 md:right-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Semaine */}
        <div>
          <label className="block text-xs md:text-sm font-medium text-slate-400 mb-1 md:mb-2">Semaine</label>
          <div className="relative">
            <select 
              className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-lg md:rounded-xl px-2 md:px-4 py-2 md:py-3 pr-6 md:pr-10 text-sm md:text-base appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              value={filters.selectedSemaine || ''}
              onChange={(e) => handleWeekChange(e.target.value)}
              disabled={!filters.selectedMois}
            >
              <option value="">—</option>
              {weeks.map(w => <option key={w} value={w}>Sem {w}</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 md:right-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Sélection des sessions */}
      <div>
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <label className="text-xs md:text-sm font-medium text-slate-400">
            Sessions
          </label>
          {sessions.length > 0 && (
            <div className="flex gap-2">
              <button 
                onClick={selectAllSessions}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Tout
              </button>
              {filters.selectedSeances.length > 0 && (
                <>
                  <span className="text-slate-600">|</span>
                  <button 
                    onClick={clearSessions}
                    className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    Effacer
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {!filters.selectedSemaine ? (
          <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-lg md:rounded-xl p-4 md:p-6 text-center">
            <Calendar className="w-6 h-6 md:w-8 md:h-8 text-slate-600 mx-auto mb-1 md:mb-2" />
            <p className="text-slate-500 text-xs md:text-sm">Sélectionnez une semaine</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-lg md:rounded-xl p-4 md:p-6 text-center">
            <p className="text-slate-500 text-xs md:text-sm">Aucune session trouvée</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 md:gap-3">
            {sessions.map((s) => {
              const isSelected = filters.selectedSeances.includes(s);
              const selectionIndex = filters.selectedSeances.indexOf(s);
              
              return (
                <button
                  key={s}
                  onClick={() => toggleSession(s)}
                  className={`
                    relative px-3 md:px-5 py-2 md:py-3 rounded-lg md:rounded-xl font-medium text-xs md:text-sm border-2 transition-all duration-200
                    ${isSelected 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/25 scale-[1.02]' 
                      : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
                    }
                  `}
                >
                  <div className="flex items-center gap-1.5 md:gap-2">
                    {isSelected && (
                      <div className="w-4 h-4 md:w-5 md:h-5 bg-white/20 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      </div>
                    )}
                    <span>S{s}</span>
                    {isSelected && filters.selectedSeances.length > 1 && (
                      <span className="bg-white/20 text-xs w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full">
                        {selectionIndex + 1}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {filters.selectedSeances.length > 1 && (
          <p className="text-xs text-slate-500 mt-2 md:mt-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            Sessions combinées dans l'ordre
          </p>
        )}
      </div>
    </div>
  );
};
