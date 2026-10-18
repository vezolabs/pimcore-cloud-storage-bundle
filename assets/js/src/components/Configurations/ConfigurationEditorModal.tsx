import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, message, Typography, Alert, Divider } from 'antd';
import { StorageConfiguration } from '../../types';
import { CloudStorageApi } from '../../services/api';

const { Text } = Typography;

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
    if (config) {
      form.setFieldsValue({
        display_name: config.display_name,
        bucket_or_container: config.bucket_or_container,
        region_or_project: config.region_or_project,
        endpoint: config.endpoint,
        path_prefix: config.path_prefix,
        auth_type: config.auth_type,
        settings: config.settings || {},
      });
    }
  }, [config, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!config?.id) return;

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
      title={`Edit Configuration: ${config.display_name}`}
      open={open}
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={saving}
      width={650}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="display_name"
          label="Display Name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="bucket_or_container"
          label="Bucket / Container Name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item name="region_or_project" label="Region / Project ID">
          <Input />
        </Form.Item>

        <Form.Item name="endpoint" label="Custom Endpoint URL">
          <Input placeholder="Leave empty for official cloud endpoint" />
        </Form.Item>

        <Form.Item name="path_prefix" label="Path Prefix">
          <Input placeholder="Optional virtual folder" />
        </Form.Item>

        <Divider orientation="left" plain>
          Replace Credentials (Optional)
        </Divider>

        <Alert
          type="info"
          message="Credential Security"
          description="Credentials are stored encrypted (AES-256-GCM). Leave the secret fields below blank to retain the current active credentials."
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

        <Divider orientation="left" plain>
          Options
        </Divider>

        <Form.Item
          name={['settings', 'store_thumbnails_in_cloud']}
          valuePropName="checked"
          label="Store Thumbnails in Cloud"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name={['settings', 'public_url_prefix']}
          label="Public / CDN URL Prefix"
        >
          <Input placeholder="https://cdn.example.com" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
