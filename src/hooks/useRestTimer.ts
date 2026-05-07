// Rest timer feature removed.
export interface UseRestTimerReturn {
  remainingSec: number;
  isActive: boolean;
  isOvertime: boolean;
  progress: number;
  timeString: string;
  start: () => void;
  skip: () => number;
}

export function useRestTimer(_prescribedRestSec: number): UseRestTimerReturn {
  return {
    remainingSec: 0,
    isActive: false,
    isOvertime: false,
    progress: 0,
    timeString: '00:00',
    start: () => {},
    skip: () => 0,
  };
}
