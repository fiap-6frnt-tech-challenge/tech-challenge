import { useDashboardSummary } from '@bytebank/api-client';
import { toDashboardViewModel } from './toDashboardViewModel';

export function useDashboardViewModel() {
  return useDashboardSummary({ select: toDashboardViewModel });
}
