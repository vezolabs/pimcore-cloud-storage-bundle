import React from 'react';
import { StorageConfiguration } from '../../types';
interface Props {
    open: boolean;
    configurations: StorageConfiguration[];
    defaultTargetId?: number | null;
    onClose: () => void;
    onMigrationComplete: () => void;
}
export declare const MigrationWizardModal: React.FC<Props>;
export {};
