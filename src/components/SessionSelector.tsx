
import React, { useMemo, useEffect, useRef } from 'react';
import { WorkoutRow, FilterState } from '../types';
import { Calendar, Check } from 'lucide-react';

interface Props {
  data: WorkoutRow[];
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
}

export const SessionSelector: React.FC<Props> = ({ data, filters, onChange }) => {
  const hasAutoSelected = useRef(false);

  // --- Derived Data Lists ---
  const years = useMemo(() => Array.from(new Set(data.map(d => d.annee))).sort(), [data]);
  
  const months = useMemo(() => {
    if (!filters.selectedAnnee) return [];
    const filtered = data.filter(d => d.annee === filters.selectedAnnee);
    const uniqueMonths = new Map<string, string>();
    filtered.forEach(d => {
        if (!uniqueMonths.has(d.moisNum)) {
            uniqueMonths.set(d.moisNum, d.moisNom);
        }
    });
    return Array.from(uniqueMonths.entries()).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  }, [data, filters.selectedAnnee]);

  const weeks = useMemo(() => {
    if (!filters.selectedAnnee || !filters.selectedMois) return [];
    const filtered = data.filter(d => 
      d.annee === filters.selectedAnnee && 
      d.moisNum === filters.selectedMois
    );
    return Array.from(new Set(filtered.map(d => d.semaine))).sort((a: string, b: string) => parseInt(a) - parseInt(b));
  }, [data, filters.selectedAnnee, filters.selectedMois]);

  const sessions = useMemo(() => {
    if (!filters.selectedAnnee || !filters.selectedMois || !filters.selectedSemaine) return [];
    const filtered = data.filter(d => 
        d.annee === filters.selectedAnnee && 
        d.moisNum === filters.selectedMois &&
        d.semaine === filters.selectedSemaine
      );
    return Array.from(new Set(filtered.map(d => d.seance))).sort((a: string, b: string) => parseInt(a) - parseInt(b));
  }, [data, filters.selectedAnnee, filters.selectedMois, filters.selectedSemaine]);

  // --- Auto Selection Logic ---
  useEffect(() => {
    if (data.length > 0 && !hasAutoSelected.current) {
        const now = new Date();
        const currentYear = now.getFullYear().toString();
        const currentMonth = (now.getMonth() + 1).toString();
        
        // Basic logic to guess "Week of month" (1-4)
        // This is an approximation. 
        const dayOfMonth = now.getDate();
        const currentWeek = Math.ceil(dayOfMonth / 7).toString();

        // Check if these exist in data
        const hasYear = years.includes(currentYear);
        // Loose check for month (handle "1" vs "01")
        const matchingMonth = Array.from(new Set(data.filter(d => d.annee === currentYear).map(d => d.moisNum)))
            .find((m: any) => parseInt(m) === parseInt(currentMonth));
        
        if (hasYear && matchingMonth) {
            // Check if week exists
            const matchingWeek = Array.from(new Set(data.filter(d => d.annee === currentYear && d.moisNum === matchingMonth).map(d => d.semaine)))
                .find((w: any) => parseInt(w) === parseInt(currentWeek));

            onChange({
                selectedAnnee: currentYear,
                selectedMois: matchingMonth,
                selectedSemaine: matchingWeek || null, // If week not found, user selects
                selectedSeances: []
            });
        }
        hasAutoSelected.current = true;
    }
  }, [data, years, onChange]); // Depend on Data load

  // --- Handlers ---
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ selectedAnnee: e.target.value, selectedMois: null, selectedSemaine: null, selectedSeances: [] });
  };
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, selectedMois: e.target.value, selectedSemaine: null, selectedSeances: [] });
  };
  const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, selectedSemaine: e.target.value, selectedSeances: [] });
  };
  
  const toggleSession = (session: string) => {
    const current = filters.selectedSeances;
    if (current.includes(session)) {
        onChange({ ...filters, selectedSeances: current.filter(s => s !== session) });
    } else {
        onChange({ ...filters, selectedSeances: [...current, session] });
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl mb-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4 text-emerald-400 font-medium">
            <Calendar className="w-5 h-5" />
            <h2>Build your Session</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Year</label>
                <select 
                    className="bg-slate-800 border-slate-700 text-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    value={filters.selectedAnnee || ''}
                    onChange={handleYearChange}
                >
                    <option value="">Select Year</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Month</label>
                <select 
                    className="bg-slate-800 border-slate-700 text-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
                    value={filters.selectedMois || ''}
                    onChange={handleMonthChange}
                    disabled={!filters.selectedAnnee}
                >
                    <option value="">Select Month</option>
                    {months.map(([num, name]) => <option key={num} value={num}>{name}</option>)}
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Week</label>
                <select 
                    className="bg-slate-800 border-slate-700 text-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
                    value={filters.selectedSemaine || ''}
                    onChange={handleWeekChange}
                    disabled={!filters.selectedMois}
                >
                    <option value="">Select Week</option>
                    {weeks.map(w => <option key={w} value={w}>Week {w}</option>)}
                </select>
            </div>
        </div>

        {/* Multi-Select Session Area */}
        <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Sessions (Select multiple to combine)
            </label>
            {!filters.selectedSemaine ? (
                <div className="text-sm text-slate-600 italic p-2">Select a week first</div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {sessions.map(s => {
                        const isSelected = filters.selectedSeances.includes(s);
                        const index = filters.selectedSeances.indexOf(s);
                        
                        return (
                            <button
                                key={s}
                                onClick={() => toggleSession(s)}
                                className={`
                                    relative px-4 py-2 rounded-lg font-medium text-sm border transition-all
                                    ${isSelected 
                                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/20' 
                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-2">
                                    {/* Removed the word "Session" from the label */}
                                    <span>{s.replace(/^Session\s+/i, '')}</span>
                                    {isSelected && (
                                        <span className="bg-emerald-800 text-emerald-100 text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                                            {index + 1}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
  );
};
