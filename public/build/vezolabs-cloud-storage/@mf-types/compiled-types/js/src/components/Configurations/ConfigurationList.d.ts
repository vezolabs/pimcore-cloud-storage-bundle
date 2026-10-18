import React from 'react';
import { StorageConfiguration } from '../../types';
interface Props {
    configurations: StorageConfiguration[];
    onRefresh: () => void;
    onEdit: (config: StorageConfiguration) => void;
    onMigrateTo: (targetId: number) => void;
}
export declare const ConfigurationList: React.FC<Props>;
export {};
