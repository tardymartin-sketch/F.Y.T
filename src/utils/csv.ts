import { WorkoutRow } from '../../types';

// ===========================================
// DONNÉES DE DÉMONSTRATION (Version Simple)
// ===========================================
export const DUMMY_DATA: any[] = [
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
export const DUMMY_DATA_FULL: WorkoutRow[] = [
  {
    id: 1,
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
    id: 2,
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
    id: 3,
    annee: '2024',
    moisNom: 'Janvier',
    moisNum: '1',
    semaine: '1',
    seance: '1',
    ordre: 3,
    exercice: 'Fentes',
    series: '3',
    repsDuree: '10/jambe',
    repos: '60',
    tempoRpe: '2010',
    notes: 'Rester stable',
    video: '',
    retour: ''
  }
];

/**
 * Convertit un tableau simple (DUMMY_DATA) en format WorkoutRow utilisable
 */
export const transformSimpleToWorkoutRows = (simple: any[]): WorkoutRow[] => {
  return simple.map((row, index) => ({
    id: index + 100,
    annee: new Date().getFullYear().toString(),
    moisNom: new Date().toLocaleDateString('fr-FR', { month: 'long' }),
    moisNum: (new Date().getMonth() + 1).toString(),
    semaine: '1',
    seance: row.Code ? row.Code.replace('S', '') : '1',
    ordre: parseInt(row.Order) || index + 1,
    exercice: row.Exercise || row.exercice,
    series: row.TargetSets || row.series || '3',
    repsDuree: row.TargetReps || row.repsDuree || '10',
    repos: row.Rest || row.repos || '60',
    tempoRpe: row.tempoRpe || '2010',
    notes: row.Notes || row.notes || '',
    video: row.Video || row.video || '',
    retour: ''
  }));
};
