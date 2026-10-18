import {
  StorageConfiguration,
  StorageOverview,
  ConnectionTestResult,
  MigrationJob,
  MigrationPreflightReport,
  SystemDiagnostics,
  ConfigAuditLog,
} from '../types';

const BASE_URL = '/pimcore-studio/api/cloud-storage';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    credentials: 'same-origin',
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    let errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    if (data.details && typeof data.details === 'object') {
      const detailsArr = Object.entries(data.details).map(([k, v]) => `${k}: ${v}`);
      if (detailsArr.length > 0) {
        errorMsg += ` (${detailsArr.join(', ')})`;
      }
    }
    const error = new Error(errorMsg) as Error & { details?: any };
    error.details = data.details;
    throw error;
  }

  return data as T;
}

export const CloudStorageApi = {
  getOverview: () => request<StorageOverview>('/overview'),

  listConfigurations: async () => {
    const res = await request<{ items: StorageConfiguration[] }>('/configurations');
    return res.items;
  },

  getConfiguration: (id: number) => request<StorageConfiguration>(`/configurations/${id}`),

  createConfiguration: (config: Partial<StorageConfiguration> & { credentials?: any }) =>
    request<StorageConfiguration>('/configurations', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  updateConfiguration: (id: number, config: Partial<StorageConfiguration> & { credentials?: any }) =>
    request<StorageConfiguration>(`/configurations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  deleteConfiguration: (id: number) =>
    request<{ success: boolean }>(`/configurations/${id}`, {
      method: 'DELETE',
    }),

  testDraftConfiguration: (config: Partial<StorageConfiguration> & { credentials?: any }) =>
    request<ConnectionTestResult>('/configurations/test', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  testSavedConfiguration: (id: number) =>
    request<ConnectionTestResult>(`/configurations/${id}/test`, {
      method: 'POST',
    }),

  activateConfiguration: (id: number) =>
    request<{ success: boolean; message: string; configuration: StorageConfiguration }>(
      `/configurations/${id}/activate`,
      { method: 'POST' }
    ),

  getMigrationPreflight: (targetId: number, sourceId?: number | null) =>
    request<MigrationPreflightReport>('/migrations/preflight', {
      method: 'POST',
      body: JSON.stringify({ target_id: targetId, source_id: sourceId }),
    }),

  startMigration: (targetId: number, sourceId?: number | null, dryRun = false) =>
    request<MigrationJob>('/migrations/start', {
      method: 'POST',
      body: JSON.stringify({ target_id: targetId, source_id: sourceId, dry_run: dryRun }),
    }),

  getMigrationStatus: (id: number) => request<MigrationJob>(`/migrations/${id}/status`),

  getDiagnostics: () => request<SystemDiagnostics>('/diagnostics'),

  getHistory: async () => {
    const res = await request<{ items: ConfigAuditLog[] }>('/history');
    return res.items;
  },
};
