import { WorkoutRow } from '../types';

export const parseCSV = (csvText: string): WorkoutRow[] => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]);
  const data: WorkoutRow[] = [];

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

// New function to handle array-of-arrays from Google Sheets API / Apps Script
export const parseSheetValues = (values: any[][]): WorkoutRow[] => {
    if (!values || values.length < 2) return [];
    
    // Ensure headers are strings
    const headers = values[0].map(h => String(h));
    const data: WorkoutRow[] = [];

    for (let i = 1; i < values.length; i++) {
        // Convert all cell values to strings to match WorkoutRow interface
        const rowValues = values[i].map(v => (v === null || v === undefined) ? '' : String(v));
        
        // Ensure rowValues has same length as headers (fill with empty strings if short)
        while(rowValues.length < headers.length) rowValues.push("");

        const row = mapValuesToRow(headers, rowValues);
        
        // Basic validation
        if (row.annee) {
            data.push(row);
        }
    }
    return data;
};

const mapValuesToRow = (headers: string[], values: string[]): WorkoutRow => {
    const row: any = {};
    
    headers.forEach((header, index) => {
      const cleanHeader = header.trim();
      const value = values[index] || '';
      
      let key: string | undefined;
      
      if (cleanHeader.includes('Année')) key = 'annee';
      else if (cleanHeader.includes('Mois (nom)')) key = 'moisNom';
      else if (cleanHeader.includes('Mois (n°)')) key = 'moisNum';
      else if (cleanHeader.includes('Semaine')) key = 'semaine';
      else if (cleanHeader.includes('Séance')) key = 'seance';
      else if (cleanHeader.includes('Ordre')) key = 'ordre';
      else if (cleanHeader.includes('Exercice')) key = 'exercice';
      else if (cleanHeader.includes('Séries')) key = 'series';
      else if (cleanHeader.includes('Rep') && cleanHeader.includes('Durée')) key = 'repsDuree';
      else if (cleanHeader.includes('Repos')) key = 'repos';
      else if (cleanHeader.includes('Tempo') || cleanHeader.includes('RPE')) key = 'tempoRpe';
      else if (cleanHeader.includes('Notes') || cleanHeader.includes('Consignes')) key = 'notes';
      else if (cleanHeader.includes('Vidéo')) key = 'video';
      else if (cleanHeader.includes('Retour')) key = 'retour';

      if (key) {
        if (key === 'ordre') {
           row[key] = parseInt(value) || 0;
        } else {
           row[key] = value;
        }
      }
    });
    return row as WorkoutRow;
}

// Helper to handle CSV lines with potential quotes
const parseLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' || char === ';') { // Handle comma or semicolon
      if (!inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

export const DUMMY_DATA = `Année,Mois (nom),Mois (n°),Semaine,Séance,Ordre,Exercice,Séries,Rep/Durée,Repos (sec),Tempo/RPE,Notes/Consignes,Vidéo,Retour athlète
2024,January,1,1,1,1,Warmup: Dynamic Stretching,1,5 min,-,Low,Focus on hip mobility,-,-
2024,January,1,1,1,2,Back Squat,4,6-8,120,30X1,Keep chest up,https://example.com,-
2024,January,1,1,1,3,Romanian Deadlift,3,8-10,90,3010,Feel the hamstring stretch,-,-
2024,January,1,1,1,4,Bulgarian Split Squat,3,10/leg,60,2010,Balance is key,-,-
2024,January,1,1,2,1,Bench Press,4,6-8,120,2010,Bar touches chest,-,-
2024,January,1,1,2,2,Pull Ups,4,AMRAP,90,2011,Full extension,-,-
2024,February,2,5,1,1,Deadlift,5,3-5,180,X,Heavy day,-,-`;