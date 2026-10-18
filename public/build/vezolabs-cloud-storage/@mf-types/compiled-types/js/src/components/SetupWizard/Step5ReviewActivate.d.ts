import React from 'react';
import { ConnectionTestResult } from '../../types';
interface Props {
    formData: any;
    testResult: ConnectionTestResult | null;
    onSaveOnly: () => Promise<void>;
    onSaveAndActivate: () => Promise<void>;
    saving: boolean;
}
export declare const Step5ReviewActivate: React.FC<Props>;
export {};
