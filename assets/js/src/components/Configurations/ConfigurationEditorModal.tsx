import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Switch, message, Alert, Divider, Typography } from 'antd';
import { StorageConfiguration } from '../../types';
import { CloudStorageApi } from '../../services/api';

const { Text } = Typography;
const { TextArea } = Input;

interface Props {
  open: boolean;
  config: StorageConfiguration | null;
  onClose: () => void;
  onSaved: () => void;
}

export const ConfigurationEditorModal: React.FC<Props> = ({
  open,
  config,
  onClose,
  onSaved,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config && open) {
      form.setFieldsValue({
        display_name: config.display_name,
        bucket_or_container: config.bucket_or_container,
        region_or_project: config.region_or_project,
        endpoint: config.endpoint,
        path_prefix: config.path_prefix,
        auth_type: config.auth_type,
        settings: config.settings || {},
        credentials: {},
      });
    }
  }, [config, open, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!config?.id) return;

      // Filter out empty credentials so existing encrypted secrets aren't overwritten
      if (values.credentials) {
        const cleanedCreds: Record<string, string> = {};
        for (const [k, v] of Object.entries(values.credentials)) {
          if (typeof v === 'string' && v.trim() !== '') {
            cleanedCreds[k] = v.trim();
          }
        }
        if (Object.keys(cleanedCreds).length > 0) {
          values.credentials = cleanedCreds;
        } else {
          delete values.credentials;
        }
      }

      setSaving(true);
      await CloudStorageApi.updateConfiguration(config.id, values);
      message.success('Configuration updated successfully.');
      onSaved();
      onClose();
    } catch (e: any) {
      message.error(e.message || 'Failed to update configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (!config) return null;

  return (
    <Modal
      title={`Edit Storage Configuration: ${config.display_name}`}
      open={open}
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={saving}
      width={680}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="display_name"
          label="Display Name"
          rules={[{ required: true, message: 'Display name is required' }]}
        >
          <Input placeholder="Human-readable title" />
        </Form.Item>

        <Form.Item
          name="bucket_or_container"
          label="Bucket / Container Name"
          rules={[{ required: true, message: 'Bucket or container name is required' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="region_or_project"
          label={
            config.provider === 's3'
              ? 'AWS Region'
              : config.provider === 'azure'
              ? 'Storage Account Name'
              : 'GCP Project ID'
          }
        >
          <Input />
        </Form.Item>

        <Form.Item name="endpoint" label="Custom Endpoint URL (Optional)">
          <Input placeholder="Leave empty for official cloud service endpoint" />
        </Form.Item>

        <Form.Item name="path_prefix" label="Path Prefix (Optional)">
          <Input placeholder="Optional virtual folder prefix (e.g. assets)" />
        </Form.Item>

        <Divider orientation="left" plain>
          Replace Credentials (Optional)
        </Divider>

        <Alert
          type="info"
          message="Credential Security"
          description="Credentials are encrypted using AES-256-GCM. Leave the fields below blank to retain your existing credentials."
          style={{ marginBottom: 16 }}
        />

        {config.provider === 's3' && config.auth_type === 'access_keys' && (
          <>
            <Form.Item name={['credentials', 'access_key_id']} label="New AWS Access Key ID">
              <Input placeholder="Leave blank to preserve current key" />
            </Form.Item>
            <Form.Item name={['credentials', 'secret_access_key']} label="New AWS Secret Access Key">
              <Input.Password placeholder="Leave blank to preserve current secret" />
            </Form.Item>
          </>
        )}

        {config.provider === 'azure' && config.auth_type === 'connection_string' && (
          <Form.Item name={['credentials', 'connection_string']} label="New Azure Connection String">
            <Input.Password placeholder="Leave blank to preserve current connection string" />
          </Form.Item>
        )}

        {config.provider === 'azure' && config.auth_type === 'account_key' && (
          <Form.Item name={['credentials', 'account_key']} label="New Azure Storage Account Key">
            <Input.Password placeholder="Leave blank to preserve current account key" />
          </Form.Item>
        )}

        {config.provider === 'gcs' && config.auth_type === 'service_account_json' && (
          <Form.Item name={['credentials', 'service_account_json']} label="New Service Account JSON Key">
            <TextArea
              rows={4}
              placeholder="Paste new service account JSON to replace current key, or leave blank to keep current key"
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </Form.Item>
        )}

        <Divider orientation="left" plain>
          Storage Options
        </Divider>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <Text strong>Store Thumbnails in Cloud</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Enable to share generated image thumbnails in cloud storage across a stateless cluster.
            </Text>
          </div>
          <Form.Item
            name={['settings', 'store_thumbnails_in_cloud']}
            valuePropName="checked"
            noStyle
          >
            <Switch />
          </Form.Item>
        </div>

        <Form.Item
          name={['settings', 'public_url_prefix']}
          label="Public / CDN URL Prefix (Optional)"
          extra="e.g. https://cdn.mycompany.com/assets"
        >
          <Input placeholder="https://cdn.example.com" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
