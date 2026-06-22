import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsApi } from '../services/api/sessions.api';
import { trainingApi } from '../services/api/training.api';
import { SessionLog } from '../../types';

export const useTrainingPlans = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['trainingPlans', userId],
    queryFn: () => trainingApi.getTrainingPlans(),
    enabled: !!userId,
  });
};

export const useSessionHistory = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['sessionHistory', userId],
    queryFn: () => sessionsApi.getSessionHistory(userId!),
    enabled: !!userId,
  });
};

export const useSaveSessionMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ log, userId }: { log: SessionLog; userId: string }) => 
      sessionsApi.saveSession(log, userId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['sessionHistory', userId] });
    },
  });
};

export const useExerciseFamilyMap = () => {
  return useQuery({
    queryKey: ['exerciseFamilyMap'],
    queryFn: () => sessionsApi.getExerciseFamilyMap(),
    staleTime: Infinity,
  });
};

export const useDeleteSessionMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ logId, userId }: { logId: string; userId: string }) => 
      sessionsApi.deleteSession(logId, userId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['sessionHistory', userId] });
    },
  });
};
