import React from 'react';
interface Props {
    provider: 's3' | 'azure' | 'gcs';
    formData: any;
    onChange: (changedValues: any, allValues: any) => void;
}
export declare const Step2ConnectionDetails: React.FC<Props>;
export {};
