import React, { useState } from 'react';
import { Steps, Button, message, Card } from 'antd';
import { Step1ProviderSelect } from './Step1ProviderSelect';
import { Step2ConnectionDetails } from './Step2ConnectionDetails';
import { Step3TestConnection } from './Step3TestConnection';
import { Step4StorageBehavior } from './Step4StorageBehavior';
import { Step5ReviewActivate } from './Step5ReviewActivate';
import { CloudStorageApi } from '../../services/api';
import { ConnectionTestResult } from '../../types';

interface Props {
  onFinish: () => void;
  onCancel?: () => void;
}

export const SetupWizard: React.FC<Props> = ({ onFinish, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const [formData, setFormData] = useState<any>({
    provider: 's3',
    name: 's3-cloud-storage',
    display_name: 'Amazon S3 Storage',
    bucket_or_container: '',
    region_or_project: 'us-east-1',
    endpoint: '',
    path_prefix: '',
    auth_type: 'access_keys',
    credentials: {
      access_key_id: '',
      secret_access_key: '',
      connection_string: '',
      account_key: '',
      service_account_json: '',
    },
    settings: {
      use_path_style_endpoint: false,
      store_thumbnails_in_cloud: false,
      public_url_prefix: '',
    },
  });

  const handleProviderSelect = (provider: 's3' | 'azure' | 'gcs') => {
    let authType = 'access_keys';
    let defaultName = `${provider}-cloud-storage`;
    let defaultDisplay = provider === 's3' ? 'Amazon S3 Storage' : provider === 'azure' ? 'Azure Blob Storage' : 'Google Cloud Storage';

    if (provider === 'azure') {
      authType = 'connection_string';
    } else if (provider === 'gcs') {
      authType = 'service_account_json';
    }

    setFormData((prev: any) => ({
      ...prev,
      provider,
      auth_type: authType,
      name: defaultName,
      display_name: defaultDisplay,
    }));
    setCurrentStep(1);
  };

  const handleFormChange = (changed: any, all: any) => {
    setFormData((prev: any) => ({
      ...prev,
      ...all,
      credentials: {
        ...prev.credentials,
        ...(all.credentials || {}),
      },
      settings: {
        ...prev.settings,
        ...(all.settings || {}),
      },
    }));
  };

  const next = () => {
    if (currentStep === 1) {
      if (!formData.name || !formData.bucket_or_container) {
        message.error('Please enter an identifier and bucket/container name before proceeding.');
        return;
      }
    }
    setCurrentStep((prev) => prev + 1);
  };

  const prev = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSaveOnly = async () => {
    setSaving(true);
    try {
      await CloudStorageApi.createConfiguration(formData);
      message.success('Storage configuration saved successfully as an inactive profile.');
      onFinish();
    } catch (e: any) {
      message.error(e.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndActivate = async () => {
    setSaving(true);
    try {
      const created = await CloudStorageApi.createConfiguration(formData);
      if (created.id) {
        await CloudStorageApi.activateConfiguration(created.id);
      }
      message.success('Configuration saved and successfully activated for all asset operations!');
      onFinish();
    } catch (e: any) {
      message.error(e.message || 'Failed to save and activate configuration.');
    } finally {
      setSaving(false);
    }
  };

  const stepItems = [
    { title: 'Choose Provider' },
    { title: 'Connection Details' },
    { title: 'Test Connection' },
    { title: 'Storage Behavior' },
    { title: 'Review & Activate' },
  ];

  return (
    <Card style={{ borderRadius: 8 }}>
      <Steps current={currentStep} items={stepItems} style={{ marginBottom: 32 }} />

      <div style={{ minHeight: 400, marginBottom: 24 }}>
        {currentStep === 0 && (
          <Step1ProviderSelect
            selectedProvider={formData.provider}
            onSelect={handleProviderSelect}
          />
        )}

        {currentStep === 1 && (
          <Step2ConnectionDetails
            provider={formData.provider}
            formData={formData}
            onChange={handleFormChange}
          />
        )}

        {currentStep === 2 && (
          <Step3TestConnection
            formData={formData}
            testResult={testResult}
            onTestComplete={setTestResult}
          />
        )}

        {currentStep === 3 && (
          <Step4StorageBehavior
            formData={formData}
            onChange={handleFormChange}
          />
        )}

        {currentStep === 4 && (
          <Step5ReviewActivate
            formData={formData}
            testResult={testResult}
            onSaveOnly={handleSaveOnly}
            onSaveAndActivate={handleSaveAndActivate}
            saving={saving}
          />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
        <div>
          {onCancel && (
            <Button onClick={onCancel}>Cancel</Button>
          )}
        </div>
        <div>
          {currentStep > 0 && (
            <Button style={{ marginRight: 8 }} onClick={prev}>
              Previous
            </Button>
          )}
          {currentStep < 4 && (
            <Button type="primary" onClick={next}>
              Next Step
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
