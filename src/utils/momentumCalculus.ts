/**
 * F.Y.T Momentum Calculus
 * Algorithme de scoring de l'expérience de Momentum Session.
 */

/**
 * Calcule le score de Momentum global de la séance.
 * @param setsCompleted Nombre de séries validées
 * @param totalPlannedSets Nombre de séries attendues au total
 * @param prCount Nombre de records personnels (PR) battus
 * @param avgRestDiscipline Score moyen de respect des temps de repos (0-100)
 * @param avgConsistency Score moyen de constance des répétitions (0-100)
 * @returns Un score de 0 à 100
 */
export function calculateMomentum(
  setsCompleted: number,
  totalPlannedSets: number,
  prCount: number,
  avgRestDiscipline: number,
  avgConsistency: number
): number {
  if (totalPlannedSets <= 0) return 0;
  
  const completion = Math.min(100, (setsCompleted / totalPlannedSets) * 100);
  const prBonus = Math.min(100, prCount * 25);
  
  const rawScore = 
    (0.5 * completion) + 
    (0.2 * prBonus) + 
    (0.15 * Math.max(0, Math.min(100, avgRestDiscipline))) + 
    (0.15 * Math.max(0, Math.min(100, avgConsistency)));
    
  return Math.round(rawScore);
}

/**
 * Score de discipline du temps de repos pour une seule série.
 * 100 si l'athlète est à ±10s du repos prescrit.
 * Se dégrade linéairement vers 0 à partir de ±60s.
 */
export function calculateRestDiscipline(actualRestSec: number, prescribedRestSec: number): number {
  const diff = Math.abs(actualRestSec - Math.max(0, prescribedRestSec));
  if (diff <= 10) return 100;
  if (diff >= 60) return 0;
  
  // Déclin linéaire entre 10 et 60 (plage de 50 secondes => 100 points)
  // Chaque seconde au-dessus de 10 fait perdre 2 points
  return 100 - ((diff - 10) * 2);
}

/**
 * Score de constance (vis-à-vis des cibles) pour une ligne de série.
 * F.Y.T. tolère de légers écarts : -15 points par répétition de décalage.
 */
export function calculateConsistency(actualReps: number, targetReps: number): number {
  const diff = Math.abs(actualReps - targetReps);
  return Math.max(0, 100 - (diff * 15));
}
