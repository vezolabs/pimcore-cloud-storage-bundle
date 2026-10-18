import React from 'react';
import { Card, Form, Switch, Typography, Alert, Space, Divider, Row, Col } from 'antd';
import {
  DatabaseOutlined,
  CloudUploadOutlined,
  PictureOutlined,
  FolderOpenOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface Props {
  formData: any;
  onChange: (changedValues: any, allValues: any) => void;
}

export const Step4StorageBehavior: React.FC<Props> = ({ formData, onChange }) => {
  return (
    <div style={{ maxWidth: 750, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={4}>Choose Storage Behavior</Title>
        <Paragraph type="secondary">
          Configure how Pimcore handles original asset files, metadata, and generated thumbnails.
        </Paragraph>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card
            title={
              <Space>
                <CloudUploadOutlined style={{ color: '#1677ff' }} />
                <span>Asset Binaries</span>
              </Space>
            }
            bordered
            size="small"
          >
            <Paragraph style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
              Original asset files (images, documents, videos, archives) will be streamed and stored in your cloud bucket.
            </Paragraph>
            <Text type="success" strong>
              <CheckCircleOutlined /> Active in Cloud Storage
            </Text>
          </Card>
        </Col>

        <Col span={12}>
          <Card
            title={
              <Space>
                <DatabaseOutlined style={{ color: '#52c41a' }} />
                <span>Metadata & Relations</span>
              </Space>
            }
            bordered
            size="small"
          >
            <Paragraph style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
              Asset properties, custom metadata, tags, tree hierarchy, permissions, and dependencies remain securely in MariaDB.
            </Paragraph>
            <Text type="success" strong>
              <CheckCircleOutlined /> Preserved in Database
            </Text>
          </Card>
        </Col>
      </Row>

      <Card title="Storage Options" style={{ marginBottom: 20 }}>
        <Form
          layout="vertical"
          initialValues={formData}
          onValuesChange={onChange}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ maxWidth: 500 }}>
              <Text strong style={{ fontSize: 14 }}>
                <PictureOutlined style={{ marginRight: 8, color: '#722ed1' }} />
                Store Generated Thumbnails in Cloud
              </Text>
              <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                By default, Pimcore caches generated image thumbnails on local disk for maximum transformation speed. Enable this if you run a multi-server or stateless cluster and want thumbnails shared in the cloud.
              </Paragraph>
            </div>
            <Form.Item
              name={['settings', 'store_thumbnails_in_cloud']}
              valuePropName="checked"
              noStyle
            >
              <Switch />
            </Form.Item>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <Form.Item
            name={['settings', 'public_url_prefix']}
            label="Custom CDN / Public URL Prefix (Optional)"
            extra="e.g. https://cdn.mycompany.com/assets. If provided, Pimcore will generate public URLs pointing to your CDN."
          >
            <input
              className="ant-input"
              placeholder="https://cdn.example.com"
              value={formData.settings?.public_url_prefix || ''}
              onChange={(e) => {
                const val = e.target.value;
                onChange({ settings: { ...formData.settings, public_url_prefix: val } }, { ...formData, settings: { ...formData.settings, public_url_prefix: val } });
              }}
            />
          </Form.Item>
        </Form>
      </Card>

      <Alert
        type="info"
        showIcon
        icon={<FolderOpenOutlined />}
        message="Asset Path & Tree Consistency"
        description="Pimcore asset storage uses a single deterministic object key matching your Pimcore folder structure (e.g. /products/shoes/hero.jpg). Moving or renaming folders inside Pimcore Studio will update the asset paths safely through Pimcore's storage operation queue."
      />
    </div>
  );
};
