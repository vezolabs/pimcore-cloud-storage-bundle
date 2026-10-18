import React, { useEffect } from 'react';
import { Form, Input, Select, Switch, Typography, Alert, Card, Space, Tooltip } from 'antd';
import {
  KeyOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  CloudOutlined,
  LockOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

interface Props {
  provider: 's3' | 'azure' | 'gcs';
  formData: any;
  onChange: (changedValues: any, allValues: any) => void;
}

export const Step2ConnectionDetails: React.FC<Props> = ({ provider, formData, onChange }) => {
  const [form] = Form.useForm();

  // Keep form in sync when formData changes from wizard
  useEffect(() => {
    form.setFieldsValue(formData);
  }, [formData, form]);

  const watchedAuthType = Form.useWatch('auth_type', form) || formData.auth_type;
  const watchedEndpoint = Form.useWatch('endpoint', form) || formData.endpoint;

  const awsRegions = [
    { value: 'us-east-1', label: 'US East (N. Virginia) [us-east-1]' },
    { value: 'us-east-2', label: 'US East (Ohio) [us-east-2]' },
    { value: 'us-west-1', label: 'US West (N. California) [us-west-1]' },
    { value: 'us-west-2', label: 'US West (Oregon) [us-west-2]' },
    { value: 'eu-west-1', label: 'EU (Ireland) [eu-west-1]' },
    { value: 'eu-west-2', label: 'EU (London) [eu-west-2]' },
    { value: 'eu-central-1', label: 'EU (Frankfurt) [eu-central-1]' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore) [ap-southeast-1]' },
    { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney) [ap-southeast-2]' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo) [ap-northeast-1]' },
    { value: 'sa-east-1', label: 'South America (São Paulo) [sa-east-1]' },
  ];

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: '0 0 8px 0', color: '#1e293b' }}>
          Configure {provider === 's3' ? 'Amazon S3' : provider === 'azure' ? 'Microsoft Azure' : 'Google Cloud Storage'}
        </Title>
        <Paragraph type="secondary" style={{ fontSize: 14 }}>
          Enter the required storage container settings and credentials. All sensitive secrets are encrypted using AES-256-GCM before storage.
        </Paragraph>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={formData}
        onValuesChange={onChange}
        requiredMark="optional"
      >
        {/* IDENTIFICATION */}
        <Card
          title={
            <Space>
              <CloudOutlined style={{ color: '#722ed1' }} />
              <span>General Identification</span>
            </Space>
          }
          style={{ marginBottom: 20, borderRadius: 8 }}
        >
          <Form.Item
            name="name"
            label="Internal Identifier"
            rules={[
              { required: true, message: 'Configuration identifier is required' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: 'Only letters, numbers, hyphens, and underscores' },
            ]}
            extra="A unique machine-friendly key (e.g. s3-production-assets)."
          >
            <Input placeholder="e.g. s3-production-assets" />
          </Form.Item>

          <Form.Item
            name="display_name"
            label="Friendly Display Name"
            rules={[{ required: true, message: 'Display name is required' }]}
            extra="Human-readable title displayed across the Pimcore Studio interface."
          >
            <Input placeholder="e.g. Production Assets (Amazon S3)" />
          </Form.Item>
        </Card>

        {/* PROVIDER: S3 */}
        {provider === 's3' && (
          <>
            <Card
              title={
                <Space>
                  <SettingOutlined style={{ color: '#fa8c16' }} />
                  <span>S3 Bucket & Region Configuration</span>
                </Space>
              }
              style={{ marginBottom: 20, borderRadius: 8 }}
            >
              <Form.Item
                name="bucket_or_container"
                label="S3 Bucket Name"
                rules={[
                  { required: true, message: 'Bucket name is required' },
                  { pattern: /^[a-z0-9.-]{3,63}$/, message: 'Valid S3 bucket name (3-63 lowercase alphanumeric, dots, hyphens)' },
                ]}
                extra="Exact bucket name configured in AWS or S3-compatible service."
              >
                <Input placeholder="e.g. my-company-pimcore-assets" />
              </Form.Item>

              <Form.Item
                name="region_or_project"
                label="AWS Region"
                rules={[{ required: !watchedEndpoint, message: 'AWS Region is required when not using custom endpoint' }]}
                extra="Select your AWS region or type custom region code (e.g. us-east-1)."
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
                extra="Optional subfolder inside bucket to namespace Pimcore assets (e.g. 'assets' or 'media')."
              >
                <Input placeholder="e.g. assets" />
              </Form.Item>
            </Card>

            <Card
              title={
                <Space>
                  <KeyOutlined style={{ color: '#722ed1' }} />
                  <span>S3 Authentication</span>
                </Space>
              }
              style={{ marginBottom: 20, borderRadius: 8 }}
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

              {watchedAuthType === 'iam_role' && (
                <Alert
                  type="success"
                  showIcon
                  icon={<SafetyCertificateOutlined />}
                  message="IAM Role / Workload Identity Active"
                  description="No static secrets required! Pimcore will automatically assume the IAM role assigned to your EC2 instance, ECS task, or EKS Pod Service Account."
                  style={{ marginBottom: 8, borderRadius: 6 }}
                />
              )}

              {watchedAuthType !== 'iam_role' && (
                <>
                  <Form.Item
                    name={['credentials', 'access_key_id']}
                    label="AWS Access Key ID"
                    rules={[{ required: !formData.has_credentials, message: 'Access Key ID is required' }]}
                  >
                    <Input placeholder="e.g. AKIAIOSFODNN7EXAMPLE" />
                  </Form.Item>

                  <Form.Item
                    name={['credentials', 'secret_access_key']}
                    label="AWS Secret Access Key"
                    rules={[{ required: !formData.has_credentials, message: 'Secret Access Key is required' }]}
                    extra={formData.has_credentials ? 'Leave blank to retain current encrypted secret.' : 'Encrypted with AES-256-GCM before storage.'}
                  >
                    <Input.Password placeholder="e.g. wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" />
                  </Form.Item>
                </>
              )}
            </Card>

            <Card
              title={
                <Space>
                  <SettingOutlined style={{ color: '#1677ff' }} />
                  <span>Custom S3 Compatible Settings (Optional)</span>
                </Space>
              }
              style={{ marginBottom: 20, borderRadius: 8 }}
            >
              <Form.Item
                name="endpoint"
                label="Custom S3 Endpoint URL"
                extra="Leave empty for AWS. Required for MinIO, Cloudflare R2, Wasabi, Ceph (e.g. https://play.min.io:9000)."
              >
                <Input placeholder="https://minio.internal.net:9000" />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong>Use Path-Style Addressing</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Recommended for MinIO, Ceph, and LocalStack (http://endpoint/bucket).
                  </Text>
                </div>
                <Form.Item
                  name={['settings', 'use_path_style_endpoint']}
                  valuePropName="checked"
                  noStyle
                >
                  <Switch />
                </Form.Item>
              </div>
            </Card>
          </>
        )}

        {/* PROVIDER: AZURE */}
        {provider === 'azure' && (
          <>
            <Card
              title={
                <Space>
                  <SettingOutlined style={{ color: '#1677ff' }} />
                  <span>Azure Blob Container</span>
                </Space>
              }
              style={{ marginBottom: 20, borderRadius: 8 }}
            >
              <Form.Item
                name="bucket_or_container"
                label="Blob Container Name"
                rules={[
                  { required: true, message: 'Container name is required' },
                  { pattern: /^[a-z0-9-]{3,63}$/, message: 'Valid container name (3-63 lowercase alphanumeric, hyphens)' },
                ]}
                extra="The target blob container in your Azure Storage Account."
              >
                <Input placeholder="e.g. pimcore-assets" />
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
                  <KeyOutlined style={{ color: '#722ed1' }} />
                  <span>Azure Authentication</span>
                </Space>
              }
              style={{ marginBottom: 20, borderRadius: 8 }}
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

              {watchedAuthType === 'managed_identity' && (
                <Alert
                  type="success"
                  showIcon
                  icon={<SafetyCertificateOutlined />}
                  message="Azure Managed Identity Active"
                  description="Pimcore will authenticate using the Azure VM, AKS, or App Service Managed Identity without storing static secrets."
                  style={{ marginBottom: 8, borderRadius: 6 }}
                />
              )}

              {watchedAuthType === 'connection_string' && (
                <Form.Item
                  name={['credentials', 'connection_string']}
                  label="Connection String"
                  rules={[{ required: !formData.has_credentials, message: 'Connection string is required' }]}
                  extra={formData.has_credentials ? 'Leave blank to preserve current credential.' : 'Full DefaultEndpointsProtocol connection string.'}
                >
                  <Input.Password placeholder="DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net" />
                </Form.Item>
              )}

              {watchedAuthType === 'account_key' && (
                <>
                  <Form.Item
                    name="region_or_project"
                    label="Storage Account Name"
                    rules={[{ required: true, message: 'Storage Account Name is required' }]}
                  >
                    <Input placeholder="e.g. mystorageaccount" />
                  </Form.Item>

                  <Form.Item
                    name={['credentials', 'account_key']}
                    label="Account Access Key"
                    rules={[{ required: !formData.has_credentials, message: 'Access key is required' }]}
                    extra={formData.has_credentials ? 'Leave blank to preserve current key.' : 'Encrypted with AES-256-GCM.'}
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
            <Card
              title={
                <Space>
                  <SettingOutlined style={{ color: '#722ed1' }} />
                  <span>Google Cloud Bucket Settings</span>
                </Space>
              }
              style={{ marginBottom: 20, borderRadius: 8 }}
            >
              <Form.Item
                name="bucket_or_container"
                label="GCS Bucket Name"
                rules={[{ required: true, message: 'Bucket name is required' }]}
                extra="Exact name of your Google Cloud Storage bucket."
              >
                <Input placeholder="e.g. my-gcp-pimcore-bucket" />
              </Form.Item>

              <Form.Item
                name="region_or_project"
                label="GCP Project ID"
                rules={[{ required: true, message: 'GCP Project ID is required' }]}
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
                  <KeyOutlined style={{ color: '#722ed1' }} />
                  <span>Google Cloud Authentication</span>
                </Space>
              }
              style={{ marginBottom: 20, borderRadius: 8 }}
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

              {watchedAuthType === 'application_default_credentials' && (
                <Alert
                  type="success"
                  showIcon
                  icon={<SafetyCertificateOutlined />}
                  message="Workload Identity / ADC Active"
                  description="Pimcore will authenticate using Google Cloud Workload Identity or environment credentials without local key files."
                  style={{ marginBottom: 8, borderRadius: 6 }}
                />
              )}

              {watchedAuthType === 'service_account_json' && (
                <Form.Item
                  name={['credentials', 'service_account_json']}
                  label="Service Account Key (JSON)"
                  rules={[{ required: !formData.has_credentials, message: 'Service account JSON is required' }]}
                  extra={formData.has_credentials ? 'Leave blank to preserve existing key.' : 'Paste the entire contents of your downloaded Service Account JSON key.'}
                >
                  <TextArea
                    rows={6}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
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
