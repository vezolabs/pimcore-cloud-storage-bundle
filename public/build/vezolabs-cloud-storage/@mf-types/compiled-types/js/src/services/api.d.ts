import { StorageConfiguration, StorageOverview, ConnectionTestResult, MigrationJob, MigrationPreflightReport, SystemDiagnostics, ConfigAuditLog } from '../types';
export declare const CloudStorageApi: {
    getOverview: () => Promise<StorageOverview>;
    listConfigurations: () => Promise<StorageConfiguration[]>;
    getConfiguration: (id: number) => Promise<StorageConfiguration>;
    createConfiguration: (config: Partial<StorageConfiguration> & {
        credentials?: any;
    }) => Promise<StorageConfiguration>;
    updateConfiguration: (id: number, config: Partial<StorageConfiguration> & {
        credentials?: any;
    }) => Promise<StorageConfiguration>;
    deleteConfiguration: (id: number) => Promise<{
        success: boolean;
    }>;
    testDraftConfiguration: (config: Partial<StorageConfiguration> & {
        credentials?: any;
    }) => Promise<ConnectionTestResult>;
    testSavedConfiguration: (id: number) => Promise<ConnectionTestResult>;
    activateConfiguration: (id: number) => Promise<{
        success: boolean;
        message: string;
        configuration: StorageConfiguration;
    }>;
    getMigrationPreflight: (targetId: number, sourceId?: number | null) => Promise<MigrationPreflightReport>;
    startMigration: (targetId: number, sourceId?: number | null, dryRun?: boolean) => Promise<MigrationJob>;
    getMigrationStatus: (id: number) => Promise<MigrationJob>;
    getDiagnostics: () => Promise<SystemDiagnostics>;
    getHistory: () => Promise<ConfigAuditLog[]>;
};
