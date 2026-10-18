import React, { useState } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Typography,
  Alert,
  Space,
  Modal,
  Tag,
} from 'antd';
import {
  CheckCircleFilled,
  WarningOutlined,
  SaveOutlined,
  ThunderboltFilled,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { ConnectionTestResult } from '../../types';

const { Title, Paragraph, Text } = Typography;

interface Props {
  formData: any;
  testResult: ConnectionTestResult | null;
  onSaveOnly: () => Promise<void>;
  onSaveAndActivate: () => Promise<void>;
  saving: boolean;
}

export const Step5ReviewActivate: React.FC<Props> = ({
  formData,
  testResult,
  onSaveOnly,
  onSaveAndActivate,
  saving,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const confirmAndActivate = () => {
    setModalOpen(false);
    onSaveAndActivate();
  };

  const isTested = testResult?.success === true;

  const getAuthLabel = (authType?: string) => {
    switch (authType) {
      case 'access_keys':
        return 'AWS Access Key ID & Secret Key';
      case 'iam_role':
        return 'IAM Role / Instance Profile (Workload Identity)';
      case 'connection_string':
        return 'Azure Connection String';
      case 'account_key':
        return 'Azure Storage Account Key';
      case 'managed_identity':
        return 'Azure Managed Identity';
      case 'service_account_json':
        return 'Google Service Account JSON Key';
      case 'application_default_credentials':
        return 'Google Application Default Credentials (ADC)';
      default:
        return authType || 'Default';
    }
  };

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: '0 0 8px 0', color: '#1e293b' }}>
          Review & Activate Configuration
        </Title>
        <Paragraph type="secondary" style={{ fontSize: 14 }}>
          Review your configuration profile summary before saving. You can save it as an inactive profile or activate it immediately.
        </Paragraph>
      </div>

      <Card title="Configuration Summary" style={{ marginBottom: 20, borderRadius: 8 }}>
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Display Name">
            <Text strong style={{ fontSize: 15 }}>{formData.display_name || formData.name}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Identifier">
            <Text code>{formData.name}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Provider">
            <Tag color={formData.provider === 's3' ? 'orange' : formData.provider === 'azure' ? 'blue' : 'purple'}>
              {formData.provider?.toUpperCase()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Target Bucket / Container">
            <Text code strong>{formData.bucket_or_container}</Text>
          </Descriptions.Item>
          {formData.region_or_project && (
            <Descriptions.Item label="Region / Project ID">
              {formData.region_or_project}
            </Descriptions.Item>
          )}
          {formData.endpoint && (
            <Descriptions.Item label="Custom Endpoint">
              <Text code>{formData.endpoint}</Text>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Path Prefix">
            {formData.path_prefix ? <Text code>{formData.path_prefix}</Text> : 'Root (no prefix)'}
          </Descriptions.Item>
          <Descriptions.Item label="Authentication">
            <Tag color="cyan">{getAuthLabel(formData.auth_type)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Thumbnail Storage">
            {formData.settings?.store_thumbnails_in_cloud ? (
              <Tag color="purple">Cloud Storage Enabled</Tag>
            ) : (
              <Tag color="default">Local Cache (Default)</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Connection Verification">
            {isTested ? (
              <Tag icon={<CheckCircleFilled />} color="success">
                Verified ({testResult?.latency_ms} ms)
              </Tag>
            ) : (
              <Tag icon={<WarningOutlined />} color="warning">
                Not Tested in Wizard
              </Tag>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Alert
        type="warning"
        showIcon
        icon={<ExclamationCircleOutlined />}
        message="Operational Notice: Activation vs. Data Migration"
        description={
          <div style={{ fontSize: 13, marginTop: 4 }}>
            <p style={{ margin: '4px 0' }}>
              <strong>1. Saving Only:</strong> Adds this storage provider profile to Pimcore without altering current storage behavior.
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>2. Activating:</strong> Immediately routes all subsequent Pimcore asset uploads, reads, and deletions to this cloud storage provider.
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>3. Existing Assets:</strong> If you have existing assets stored locally, use the <strong>Migration Assistant</strong> to copy them to this cloud bucket. Existing local assets are never deleted automatically.
            </p>
          </div>
        }
        style={{ marginBottom: 24, borderRadius: 8 }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <Button
          icon={<SaveOutlined />}
          size="large"
          loading={saving}
          onClick={onSaveOnly}
          style={{ height: 42, borderRadius: 6 }}
        >
          Save Configuration Only
        </Button>

        <Button
          type="primary"
          icon={<ThunderboltFilled />}
          size="large"
          loading={saving}
          onClick={() => setModalOpen(true)}
          style={{ height: 42, borderRadius: 6, fontWeight: 600, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
        >
          Save & Activate Now
        </Button>
      </div>

      <Modal
        title="Confirm Storage Activation"
        open={modalOpen}
        onOk={confirmAndActivate}
        onCancel={() => setModalOpen(false)}
        okText="Yes, Activate Now"
        okButtonProps={{ type: 'primary', style: { backgroundColor: '#52c41a', borderColor: '#52c41a' } }}
      >
        <p>
          You are about to activate <strong>{formData.display_name || formData.name}</strong> as Pimcore's active asset storage backend.
        </p>
        <p>
          All subsequent Pimcore asset operations will target bucket <code>{formData.bucket_or_container}</code>.
        </p>
        <p>Do you wish to proceed?</p>
      </Modal>
    </div>
  );
};
