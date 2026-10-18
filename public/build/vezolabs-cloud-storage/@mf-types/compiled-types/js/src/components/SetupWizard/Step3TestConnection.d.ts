import React from 'react';
import { ConnectionTestResult } from '../../types';
interface Props {
    formData: any;
    testResult: ConnectionTestResult | null;
    onTestComplete: (result: ConnectionTestResult) => void;
}
export declare const Step3TestConnection: React.FC<Props>;
export {};
