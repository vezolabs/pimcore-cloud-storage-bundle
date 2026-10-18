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
  Divider,
} from 'antd';
import {
  CheckCircleFilled,
  WarningOutlined,
  SaveOutlined,
  ThunderboltFilled,
  SyncOutlined,
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

  return (
    <div style={{ maxWidth: 750, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={4}>Review & Activate Configuration</Title>
        <Paragraph type="secondary">
          Review your configuration summary before saving. You can save it as an inactive draft or activate it immediately.
        </Paragraph>
      </div>

      <Card title="Configuration Summary" style={{ marginBottom: 20 }}>
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Display Name">
            <Text strong>{formData.display_name || formData.name}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Identifier">
            <Text code>{formData.name}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Provider">
            <Tag color="blue">{formData.provider?.toUpperCase()}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Target Bucket / Container">
            <Text code>{formData.bucket_or_container}</Text>
          </Descriptions.Item>
          {formData.region_or_project && (
            <Descriptions.Item label="Region / Project">
              {formData.region_or_project}
            </Descriptions.Item>
          )}
          {formData.endpoint && (
            <Descriptions.Item label="Custom Endpoint">
              <Text code>{formData.endpoint}</Text>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Path Prefix">
            {formData.path_prefix ? <Text code>{formData.path_prefix}</Text> : 'Root'}
          </Descriptions.Item>
          <Descriptions.Item label="Authentication">
            {formData.auth_type?.replace(/_/g, ' ').toUpperCase()}
          </Descriptions.Item>
          <Descriptions.Item label="Thumbnail Storage">
            {formData.settings?.store_thumbnails_in_cloud ? (
              <Tag color="purple">Cloud Storage Enabled</Tag>
            ) : (
              <Tag color="default">Local Cache Storage (Default)</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Connection Verification">
            {isTested ? (
              <Tag icon={<CheckCircleFilled />} color="success">
                Tested & Verified ({testResult?.latency_ms} ms)
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
        message="Important Operational Notice: Activation vs. Migration"
        description={
          <div>
            <p style={{ margin: '4px 0' }}>
              <strong>1. Saving</strong> stores this provider profile securely in Pimcore.
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>2. Activating</strong> immediately directs all NEW asset uploads, reads, and updates to this cloud storage.
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>3. Existing Assets:</strong> If you have existing assets on local disk, they will NOT be automatically deleted. Use the <strong>Migration Assistant</strong> to copy existing assets to this cloud bucket.
            </p>
          </div>
        }
        style={{ marginBottom: 24 }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <Button
          icon={<SaveOutlined />}
          size="large"
          loading={saving}
          onClick={onSaveOnly}
        >
          Save Configuration Only
        </Button>

        <Button
          type="primary"
          icon={<ThunderboltFilled />}
          size="large"
          loading={saving}
          onClick={() => setModalOpen(true)}
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
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
        okButtonProps={{ danger: false, type: 'primary' }}
      >
        <p>
          You are about to activate <strong>{formData.display_name || formData.name}</strong> as the active asset storage provider.
        </p>
        <p>
          All subsequent Pimcore asset uploads and storage operations will target bucket <code>{formData.bucket_or_container}</code>.
        </p>
        <p>Do you wish to proceed?</p>
      </Modal>
    </div>
  );
};
