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
    let defaultDisplay =
      provider === 's3'
        ? 'Amazon S3 Storage'
        : provider === 'azure'
        ? 'Microsoft Azure Storage'
        : 'Google Cloud Storage';

    let regionOrProject = 'us-east-1';
    if (provider === 'azure') {
      authType = 'connection_string';
      regionOrProject = '';
    } else if (provider === 'gcs') {
      authType = 'service_account_json';
      regionOrProject = '';
    }

    setFormData((prev: any) => ({
      ...prev,
      provider,
      auth_type: authType,
      name: defaultName,
      display_name: defaultDisplay,
      region_or_project: regionOrProject,
    }));
    setTestResult(null);
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

  const validateStep2 = (): boolean => {
    if (!formData.name || !formData.name.trim()) {
      message.error('Please enter an internal configuration identifier.');
      return false;
    }
    if (!formData.bucket_or_container || !formData.bucket_or_container.trim()) {
      message.error('Please enter a target bucket or container name.');
      return false;
    }

    if (formData.provider === 's3') {
      if (!formData.endpoint && (!formData.region_or_project || !formData.region_or_project.trim())) {
        message.error('AWS Region is required when using standard AWS S3.');
        return false;
      }
      if (formData.auth_type === 'access_keys') {
        if (!formData.credentials?.access_key_id?.trim()) {
          message.error('AWS Access Key ID is required.');
          return false;
        }
        if (!formData.credentials?.secret_access_key?.trim()) {
          message.error('AWS Secret Access Key is required.');
          return false;
        }
      }
    } else if (formData.provider === 'azure') {
      if (formData.auth_type === 'connection_string') {
        if (!formData.credentials?.connection_string?.trim()) {
          message.error('Azure Connection String is required.');
          return false;
        }
      } else if (formData.auth_type === 'account_key') {
        if (!formData.region_or_project?.trim()) {
          message.error('Azure Storage Account Name is required.');
          return false;
        }
        if (!formData.credentials?.account_key?.trim()) {
          message.error('Azure Storage Account Key is required.');
          return false;
        }
      }
    } else if (formData.provider === 'gcs') {
      if (formData.auth_type === 'service_account_json') {
        if (!formData.credentials?.service_account_json?.trim()) {
          message.error('Google Service Account JSON key is required.');
          return false;
        }
      } else if (formData.auth_type === 'application_default_credentials') {
        if (!formData.region_or_project?.trim()) {
          message.error('Google Cloud Project ID is required.');
          return false;
        }
      }
    }

    return true;
  };

  const next = () => {
    if (currentStep === 1) {
      if (!validateStep2()) {
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
    <Card style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }}>
      <Steps
        current={currentStep}
        items={stepItems}
        responsive
        style={{ marginBottom: 32, padding: '8px 16px' }}
      />

      <div style={{ minHeight: 420, marginBottom: 24 }}>
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
            onBackToConfig={() => setCurrentStep(1)}
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

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #f1f5f9',
          paddingTop: 16,
        }}
      >
        <div>{onCancel && <Button onClick={onCancel}>Cancel</Button>}</div>
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
