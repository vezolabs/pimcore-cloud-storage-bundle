import React from 'react';
interface Props {
    selectedProvider: 's3' | 'azure' | 'gcs';
    onSelect: (provider: 's3' | 'azure' | 'gcs') => void;
}
export declare const Step1ProviderSelect: React.FC<Props>;
export {};
