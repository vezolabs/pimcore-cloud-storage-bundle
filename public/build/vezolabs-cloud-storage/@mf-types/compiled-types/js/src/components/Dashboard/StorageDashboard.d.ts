import React from 'react';
import { StorageOverview } from '../../types';
interface Props {
    overview: StorageOverview;
    onNavigateToWizard: () => void;
    onNavigateToConfigs: () => void;
    onNavigateToMigration: () => void;
    onOpenDiagnostics: () => void;
    onTestActive: (id: number) => void;
    testingActive: boolean;
}
export declare const StorageDashboard: React.FC<Props>;
export {};
