import React from 'react';
import { Form, Input, Select, Switch, Typography, Alert, Card, Divider, Space } from 'antd';
import { KeyOutlined, SafetyCertificateOutlined, SettingOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

interface Props {
  provider: 's3' | 'azure' | 'gcs';
  formData: any;
  onChange: (changedValues: any, allValues: any) => void;
}

export const Step2ConnectionDetails: React.FC<Props> = ({ provider, formData, onChange }) => {
  const [form] = Form.useForm();

  const awsRegions = [
    { value: 'us-east-1', label: 'US East (N. Virginia) [us-east-1]' },
    { value: 'us-east-2', label: 'US East (Ohio) [us-east-2]' },
    { value: 'us-west-1', label: 'US West (N. California) [us-west-1]' },
    { value: 'us-west-2', label: 'US West (Oregon) [us-west-2]' },
    { value: 'eu-west-1', label: 'EU (Ireland) [eu-west-1]' },
    { value: 'eu-central-1', label: 'EU (Frankfurt) [eu-central-1]' },
    { value: 'eu-west-2', label: 'EU (London) [eu-west-2]' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore) [ap-southeast-1]' },
    { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney) [ap-southeast-2]' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo) [ap-northeast-1]' },
    { value: 'sa-east-1', label: 'South America (São Paulo) [sa-east-1]' },
  ];

  return (
    <div style={{ maxWidth: 750, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={4}>
          Configure {provider === 's3' ? 'Amazon S3' : provider === 'azure' ? 'Azure Blob Storage' : 'Google Cloud Storage'} Connection
        </Title>
        <Paragraph type="secondary">
          Enter the required credentials and container settings. Credentials are encrypted using AES-256-GCM.
        </Paragraph>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={formData}
        onValuesChange={onChange}
        requiredMark="optional"
      >
        <Card title="General Identification" style={{ marginBottom: 20 }}>
          <Form.Item
            name="name"
            label="Internal Identifier"
            rules={[
              { required: true, message: 'Configuration name is required' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: 'Only letters, numbers, hyphens, and underscores' },
            ]}
            extra="A unique machine-friendly name (e.g. s3-production-assets)."
          >
            <Input placeholder="e.g. s3-production-assets" />
          </Form.Item>

          <Form.Item
            name="display_name"
            label="Friendly Display Name"
            rules={[{ required: true, message: 'Display name is required' }]}
            extra="Human-readable title shown across Pimcore Studio."
          >
            <Input placeholder="e.g. Production Assets (Amazon S3)" />
          </Form.Item>
        </Card>

        {/* PROVIDER: S3 */}
        {provider === 's3' && (
          <>
            <Card title="S3 Bucket & Region" style={{ marginBottom: 20 }}>
              <Form.Item
                name="bucket_or_container"
                label="S3 Bucket Name"
                rules={[
                  { required: true, message: 'Bucket name is required' },
                  { pattern: /^[a-z0-9.-]{3,63}$/, message: 'Valid S3 bucket name (3-63 lowercase alphanumeric, dots, hyphens)' },
                ]}
                extra="Exact bucket name as configured in AWS or S3-compatible service."
              >
                <Input placeholder="my-company-pimcore-assets" />
              </Form.Item>

              <Form.Item
                name="region_or_project"
                label="AWS Region"
                rules={[{ required: !formData.endpoint, message: 'Region is required for AWS S3' }]}
                extra="Select your AWS region or type custom region code."
              >
                <Select
                  showSearch
                  allowClear
                  placeholder="Select or enter AWS region (e.g. us-east-1)"
                  options={awsRegions}
                />
              </Form.Item>

              <Form.Item
                name="path_prefix"
                label="Path Prefix (Optional)"
                extra="Optional subfolder inside the bucket to namespace Pimcore assets (e.g. 'assets' or 'media')."
              >
                <Input placeholder="e.g. assets" />
              </Form.Item>
            </Card>

            <Card
              title={
                <Space>
                  <KeyOutlined />
                  <span>Authentication</span>
                </Space>
              }
              style={{ marginBottom: 20 }}
            >
              <Form.Item
                name="auth_type"
                label="Authentication Method"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: 'access_keys', label: 'AWS Access Key ID & Secret Access Key' },
                    { value: 'iam_role', label: 'IAM Role / Instance Profile / Workload Identity (Safer - No Keys)' },
                  ]}
                />
              </Form.Item>

              {formData.auth_type === 'iam_role' && (
                <Alert
                  type="success"
                  showIcon
                  icon={<SafetyCertificateOutlined />}
                  message="IAM Role / Workload Identity Selected"
                  description="No static secrets required! Pimcore will automatically assume the IAM role associated with your EC2 instance, ECS task, or EKS Pod Service Account."
                  style={{ marginBottom: 16 }}
                />
              )}

              {formData.auth_type !== 'iam_role' && (
                <>
                  <Form.Item
                    name={['credentials', 'access_key_id']}
                    label="AWS Access Key ID"
                    rules={[{ required: !formData.has_credentials, message: 'Access Key ID is required' }]}
                  >
                    <Input placeholder="AKIAIOSFODNN7EXAMPLE" />
                  </Form.Item>

                  <Form.Item
                    name={['credentials', 'secret_access_key']}
                    label="AWS Secret Access Key"
                    rules={[{ required: !formData.has_credentials, message: 'Secret Access Key is required' }]}
                    extra={formData.has_credentials ? 'Leave blank to retain existing encrypted secret.' : 'Encrypted with AES-256-GCM before storage.'}
                  >
                    <Input.Password placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" />
                  </Form.Item>
                </>
              )}
            </Card>

            <Card
              title={
                <Space>
                  <SettingOutlined />
                  <span>S3-Compatible / Advanced Settings (Optional)</span>
                </Space>
              }
              style={{ marginBottom: 20 }}
            >
              <Form.Item
                name="endpoint"
                label="Custom S3 Endpoint URL"
                extra="Required only for MinIO, Cloudflare R2, Wasabi, Ceph, etc. Leave empty for AWS."
              >
                <Input placeholder="https://minio.internal.net:9000" />
              </Form.Item>

              <Form.Item
                name={['settings', 'use_path_style_endpoint']}
                valuePropName="checked"
                label="Use Path-Style Addressing"
                extra="Recommended for MinIO, LocalStack, and Ceph (http://endpoint/bucket instead of http://bucket.endpoint)."
              >
                <Switch />
              </Form.Item>
            </Card>
          </>
        )}

        {/* PROVIDER: AZURE */}
        {provider === 'azure' && (
          <>
            <Card title="Azure Container Settings" style={{ marginBottom: 20 }}>
              <Form.Item
                name="bucket_or_container"
                label="Blob Container Name"
                rules={[
                  { required: true, message: 'Container name is required' },
                  { pattern: /^[a-z0-9-]{3,63}$/, message: 'Valid container name (3-63 lowercase alphanumeric, hyphens)' },
                ]}
                extra="The target blob container in your Azure Storage Account."
              >
                <Input placeholder="pimcore-assets" />
              </Form.Item>

              <Form.Item
                name="path_prefix"
                label="Path Prefix (Optional)"
                extra="Optional virtual folder prefix inside the container."
              >
                <Input placeholder="e.g. assets" />
              </Form.Item>
            </Card>

            <Card
              title={
                <Space>
                  <KeyOutlined />
                  <span>Azure Authentication</span>
                </Space>
              }
              style={{ marginBottom: 20 }}
            >
              <Form.Item
                name="auth_type"
                label="Authentication Method"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: 'connection_string', label: 'Azure Connection String' },
                    { value: 'account_key', label: 'Storage Account Name & Access Key' },
                    { value: 'managed_identity', label: 'Azure Managed Identity (Workload Identity)' },
                  ]}
                />
              </Form.Item>

              {formData.auth_type === 'managed_identity' && (
                <Alert
                  type="success"
                  showIcon
                  icon={<SafetyCertificateOutlined />}
                  message="Azure Managed Identity Selected"
                  description="Pimcore will authenticate using the Azure VM, AKS, or App Service Managed Identity without storing static secrets."
                  style={{ marginBottom: 16 }}
                />
              )}

              {formData.auth_type === 'connection_string' && (
                <Form.Item
                  name={['credentials', 'connection_string']}
                  label="Connection String"
                  rules={[{ required: !formData.has_credentials, message: 'Connection string is required' }]}
                  extra={formData.has_credentials ? 'Leave blank to preserve existing credential.' : 'Full DefaultEndpointsProtocol connection string.'}
                >
                  <Input.Password placeholder="DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net" />
                </Form.Item>
              )}

              {formData.auth_type === 'account_key' && (
                <>
                  <Form.Item
                    name="region_or_project"
                    label="Storage Account Name"
                    rules={[{ required: true, message: 'Account name is required' }]}
                  >
                    <Input placeholder="e.g. mystorageaccount" />
                  </Form.Item>

                  <Form.Item
                    name={['credentials', 'account_key']}
                    label="Account Access Key"
                    rules={[{ required: !formData.has_credentials, message: 'Access key is required' }]}
                  >
                    <Input.Password placeholder="Account Key" />
                  </Form.Item>
                </>
              )}
            </Card>
          </>
        )}

        {/* PROVIDER: GCS */}
        {provider === 'gcs' && (
          <>
            <Card title="Google Cloud Bucket Settings" style={{ marginBottom: 20 }}>
              <Form.Item
                name="bucket_or_container"
                label="GCS Bucket Name"
                rules={[{ required: true, message: 'Bucket name is required' }]}
                extra="Exact name of your Google Cloud Storage bucket."
              >
                <Input placeholder="my-gcp-pimcore-bucket" />
              </Form.Item>

              <Form.Item
                name="region_or_project"
                label="GCP Project ID"
                rules={[{ required: true, message: 'Project ID is required' }]}
                extra="Your Google Cloud Platform Project ID."
              >
                <Input placeholder="e.g. my-project-123456" />
              </Form.Item>

              <Form.Item
                name="path_prefix"
                label="Path Prefix (Optional)"
                extra="Optional subfolder inside the bucket."
              >
                <Input placeholder="e.g. assets" />
              </Form.Item>
            </Card>

            <Card
              title={
                <Space>
                  <KeyOutlined />
                  <span>Google Cloud Authentication</span>
                </Space>
              }
              style={{ marginBottom: 20 }}
            >
              <Form.Item
                name="auth_type"
                label="Authentication Method"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: 'service_account_json', label: 'Service Account Key (JSON)' },
                    { value: 'application_default_credentials', label: 'Application Default Credentials / Workload Identity' },
                  ]}
                />
              </Form.Item>

              {formData.auth_type === 'application_default_credentials' && (
                <Alert
                  type="success"
                  showIcon
                  icon={<SafetyCertificateOutlined />}
                  message="Workload Identity / ADC Selected"
                  description="Pimcore will authenticate using Google Cloud Workload Identity or environment credentials without local key files."
                  style={{ marginBottom: 16 }}
                />
              )}

              {formData.auth_type === 'service_account_json' && (
                <Form.Item
                  name={['credentials', 'service_account_json']}
                  label="Service Account Key (Paste JSON)"
                  rules={[{ required: !formData.has_credentials, message: 'Service account JSON is required' }]}
                  extra={formData.has_credentials ? 'Leave blank to preserve existing key.' : 'Paste the entire contents of your downloaded Service Account JSON key.'}
                >
                  <TextArea
                    rows={6}
                    placeholder={`{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key_id": "...",\n  "private_key": "-----BEGIN PRIVATE KEY-----...",\n  "client_email": "..."\n}`}
                  />
                </Form.Item>
              )}
            </Card>
          </>
        )}
      </Form>
    </div>
  );
};
