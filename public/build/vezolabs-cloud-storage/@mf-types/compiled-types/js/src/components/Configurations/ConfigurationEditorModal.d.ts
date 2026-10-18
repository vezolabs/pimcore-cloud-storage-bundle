import React from 'react';
import { StorageConfiguration } from '../../types';
interface Props {
    open: boolean;
    config: StorageConfiguration | null;
    onClose: () => void;
    onSaved: () => void;
}
export declare const ConfigurationEditorModal: React.FC<Props>;
export {};
