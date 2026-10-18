export interface StorageConfiguration {
    id?: number;
    name: string;
    display_name: string;
    provider: 's3' | 'azure' | 'gcs' | 'local';
    is_active: boolean;
    bucket_or_container: string;
    region_or_project?: string | null;
    endpoint?: string | null;
    path_prefix?: string | null;
    auth_type: string;
    settings: Record<string, any>;
    has_credentials?: boolean;
    credentials_masked?: {
        configured: boolean;
        auth_type: string;
        method?: string;
        access_key_preview?: string;
    };
    credentials?: Record<string, any>;
    last_tested_at?: string | null;
    last_test_status?: 'success' | 'failed' | 'warning' | 'not_tested';
    last_test_message?: string | null;
    created_at?: string;
    updated_at?: string;
}
export interface StorageOverview {
    status: 'healthy' | 'warning' | 'degraded';
    active_configuration?: StorageConfiguration | null;
    total_configurations: number;
    tested_successful: number;
    tested_failed: number;
    is_cloud_active: boolean;
    active_migration?: MigrationJob | null;
    diagnostics_summary: string;
    available_providers: Array<{
        key: string;
        name: string;
        description: string;
    }>;
}
export interface ConnectionTestResult {
    success: boolean;
    message: string;
    latency_ms: number;
    details?: Record<string, any>;
}
export interface MigrationJob {
    id: number;
    source_config_id?: number | null;
    target_config_id: number;
    source_name: string;
    target_name: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    total_files: number;
    total_bytes: number;
    processed_files: number;
    processed_bytes: number;
    failed_files: number;
    progress_percent: number;
    current_file?: string | null;
    error_log: Array<{
        path: string;
        message: string;
        time: string;
    }>;
    is_dry_run: boolean;
    created_at: string;
    started_at?: string | null;
    finished_at?: string | null;
}
export interface MigrationPreflightReport {
    source: StorageConfiguration;
    target: StorageConfiguration;
    report: {
        total_files: number;
        total_bytes: number;
        formatted_size: string;
        target_accessible: boolean;
        estimated_duration_seconds: number;
        sample_files: Array<{
            path: string;
            size: number;
        }>;
    };
}
export interface SystemDiagnostics {
    status: 'healthy' | 'warning' | 'degraded';
    summary: string;
    timestamp: string;
    checks: Record<string, {
        name: string;
        status: 'ok' | 'warning' | 'error';
        value: string;
        message: string;
    }>;
}
export interface ConfigAuditLog {
    id: number;
    config_id?: number | null;
    config_name: string;
    action: string;
    changed_by: string;
    configuration_snapshot: Record<string, any>;
    note?: string | null;
    created_at: string;
}
