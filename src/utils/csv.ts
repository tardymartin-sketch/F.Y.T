import { WorkoutRow, WorkoutRowFull } from '../../types';

// ===========================================
// DONNÉES DE DÉMONSTRATION (Version Simple)
// ===========================================
export const DUMMY_DATA: WorkoutRow[] = [
  {
    Day: 'Lundi',
    Code: 'S1',
    Exercise: 'Développé Couché',
    Order: '1',
    TargetSets: '4',
    TargetReps: '8-10',
    Rest: '90',
    Video: 'https://www.youtube.com/watch?v=example1',
    Notes: 'Contrôler la descente, bien serrer les omoplates'
  },
  {
    Day: 'Lundi',
    Code: 'S1',
    Exercise: 'Rowing Barre',
    Order: '2',
    TargetSets: '4',
    TargetReps: '8-10',
    Rest: '90',
    Video: '',
    Notes: 'Tirer avec les coudes, pas les mains'
  },
  {
    Day: 'Lundi',
    Code: 'S1',
    Exercise: 'Squat',
    Order: '3',
    TargetSets: '4',
    TargetReps: '6-8',
    Rest: '120',
    Video: 'https://www.youtube.com/watch?v=example2',
    Notes: 'Descendre au moins à la parallèle'
  },
  {
    Day: 'Lundi',
    Code: 'S1',
    Exercise: 'Curl Biceps',
    Order: '4',
    TargetSets: '3',
    TargetReps: '12',
    Rest: '60',
    Video: '',
    Notes: ''
  },
  {
    Day: 'Mercredi',
    Code: 'S2',
    Exercise: 'Soulevé de Terre',
    Order: '1',
    TargetSets: '4',
    TargetReps: '5',
    Rest: '180',
    Video: '',
    Notes: 'Garder le dos droit, pousser avec les jambes'
  }
];

// ===========================================
// DONNÉES DE DÉMONSTRATION (Version Complète)
// ===========================================
export const DUMMY_DATA_FULL: WorkoutRowFull[] = [
  {
    annee: '2024',
    moisNom: 'Janvier',
    moisNum: '1',
    semaine: '1',
    seance: '1',
    ordre: 1,
    exercice: 'Échauffement dynamique',
    series: '1',
    repsDuree: '5 min',
    repos: '-',
    tempoRpe: 'Low',
    notes: 'Mobilité hanches et épaules',
    video: '',
    retour: ''
  },
  {
    annee: '2024',
    moisNom: 'Janvier',
    moisNum: '1',
    semaine: '1',
    seance: '1',
    ordre: 2,
    exercice: 'Squat Barre',
    series: '4',
    repsDuree: '6-8',
    repos: '120',
    tempoRpe: '30X1',
    notes: 'Garder le torse bien droit',
    video: 'https://www.youtube.com/watch?v=example',
    retour: ''
  },
  {
    annee: '2024',
    moisNom: 'Janvier',
    moisNum: '1',
    semaine: '1',
    seance: '1',
    ordre: 3,
    exercice: 'Romanian Deadlift',
    series: '3',
    repsDuree: '8-10',
    repos: '90',
    tempoRpe: '3010',
    notes: 'Sentir l\'étirement des ischio-jambiers',
    video: '',
    retour: ''
  },
  {
    annee: '2024',
    moisNom: 'Janvier',
    moisNum: '1',
    semaine: '1',
    seance: '1',
    ordre: 4,
    exercice: 'Fentes Bulgares',
    series: '3',
    repsDuree: '10/jambe',
    repos: '60',
    tempoRpe: '2010',
    notes: 'Équilibre et contrôle',
    video: '',
    retour: ''
  },
  {
    annee: '2024',
    moisNom: 'Janvier',
    moisNum: '1',
    semaine: '1',
    seance: '2',
    ordre: 1,
    exercice: 'Développé Couché',
    series: '4',
    repsDuree: '6-8',
    repos: '120',
    tempoRpe: '2010',
    notes: 'La barre touche le torse',
    video: '',
    retour: ''
  },
  {
    annee: '2024',
    moisNom: 'Janvier',
    moisNum: '1',
    semaine: '1',
    seance: '2',
    ordre: 2,
    exercice: 'Tractions',
    series: '4',
    repsDuree: 'AMRAP',
    repos: '90',
    tempoRpe: '2011',
    notes: 'Extension complète en bas',
    video: '',
    retour: ''
  },
  {
    annee: '2024',
    moisNom: 'Février',
    moisNum: '2',
    semaine: '1',
    seance: '1',
    ordre: 1,
    exercice: 'Soulevé de Terre',
    series: '5',
    repsDuree: '3-5',
    repos: '180',
    tempoRpe: 'RPE 8',
    notes: 'Jour lourd',
    video: '',
    retour: ''
  }
];

// ===========================================
// PARSING CSV (Format texte)
// ===========================================
export const parseCSV = (csvText: string): WorkoutRowFull[] => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]);
  const data: WorkoutRowFull[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length !== headers.length) continue;

    const row = mapValuesToRow(headers, values);
    
    if (row.annee && row.seance) {
      data.push(row);
    }
  }

  return data;
};

// ===========================================
// PARSING GOOGLE SHEETS (Format tableau)
// ===========================================
export const parseSheetValues = (values: any[][]): WorkoutRowFull[] => {
  if (!values || values.length < 2) return [];
  
  const headers = values[0].map(h => String(h));
  const data: WorkoutRowFull[] = [];

  for (let i = 1; i < values.length; i++) {
    const rowValues = values[i].map(v => (v === null || v === undefined) ? '' : String(v));
    
    while (rowValues.length < headers.length) rowValues.push("");

    const row = mapValuesToRow(headers, rowValues);
    
    if (row.annee) {
      data.push(row);
    }
  }
  return data;
};

// ===========================================
// MAPPING DES COLONNES
// ===========================================
const mapValuesToRow = (headers: string[], values: string[]): WorkoutRowFull => {
  const row: any = {};
  
  headers.forEach((header, index) => {
    const cleanHeader = header.trim().toLowerCase();
    const value = values[index] || '';
    
    let key: string | undefined;
    
    // Mapping français
    if (cleanHeader.includes('année') || cleanHeader.includes('annee')) key = 'annee';
    else if (cleanHeader.includes('mois') && cleanHeader.includes('nom')) key = 'moisNom';
    else if (cleanHeader.includes('mois') && (cleanHeader.includes('n°') || cleanHeader.includes('num'))) key = 'moisNum';
    else if (cleanHeader.includes('semaine')) key = 'semaine';
    else if (cleanHeader.includes('séance') || cleanHeader.includes('seance')) key = 'seance';
    else if (cleanHeader.includes('ordre')) key = 'ordre';
    else if (cleanHeader.includes('exercice')) key = 'exercice';
    else if (cleanHeader.includes('séries') || cleanHeader.includes('series')) key = 'series';
    else if (cleanHeader.includes('rep') || cleanHeader.includes('durée') || cleanHeader.includes('duree')) key = 'repsDuree';
    else if (cleanHeader.includes('repos')) key = 'repos';
    else if (cleanHeader.includes('tempo') || cleanHeader.includes('rpe')) key = 'tempoRpe';
    else if (cleanHeader.includes('notes') || cleanHeader.includes('consignes')) key = 'notes';
    else if (cleanHeader.includes('vidéo') || cleanHeader.includes('video')) key = 'video';
    else if (cleanHeader.includes('retour') || cleanHeader.includes('feedback')) key = 'retour';
    
    // Mapping anglais (fallback)
    else if (cleanHeader === 'year') key = 'annee';
    else if (cleanHeader === 'month') key = 'moisNom';
    else if (cleanHeader === 'week') key = 'semaine';
    else if (cleanHeader === 'session') key = 'seance';
    else if (cleanHeader === 'order') key = 'ordre';
    else if (cleanHeader === 'exercise') key = 'exercice';
    else if (cleanHeader === 'sets') key = 'series';
    else if (cleanHeader === 'reps') key = 'repsDuree';
    else if (cleanHeader === 'rest') key = 'repos';

    if (key) {
      if (key === 'ordre') {
        row[key] = parseInt(value) || 0;
      } else {
        row[key] = value;
      }
    }
  });
  
  return row as WorkoutRowFull;
};

// ===========================================
// UTILITAIRE : Parser une ligne CSV
// ===========================================
const parseLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

// ===========================================
// CONVERSION : WorkoutRow → WorkoutRowFull
// ===========================================
export const convertSimpleToFull = (simple: WorkoutRow[]): WorkoutRowFull[] => {
  const today = new Date();
  
  return simple.map((row, index) => ({
    annee: today.getFullYear().toString(),
    moisNom: today.toLocaleString('fr-FR', { month: 'long' }),
    moisNum: (today.getMonth() + 1).toString(),
    semaine: '1',
    seance: row.Code.replace('S', ''),
    ordre: parseInt(row.Order) || index + 1,
    exercice: row.Exercise,
    series: row.TargetSets,
    repsDuree: row.TargetReps,
    repos: row.Rest,
    tempoRpe: '',
    notes: row.Notes || '',
    video: row.Video || '',
    retour: ''
  }));
};
