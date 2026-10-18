import React from 'react';
import { Card, Form, Switch, Typography, Alert, Space, Divider, Row, Col, Input } from 'antd';
import {
  DatabaseOutlined,
  CloudUploadOutlined,
  PictureOutlined,
  FolderOpenOutlined,
  CheckCircleFilled,
  GlobalOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface Props {
  formData: any;
  onChange: (changedValues: any, allValues: any) => void;
}

export const Step4StorageBehavior: React.FC<Props> = ({ formData, onChange }) => {
  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: '0 0 8px 0', color: '#1e293b' }}>
          Choose Storage Behavior
        </Title>
        <Paragraph type="secondary" style={{ fontSize: 14 }}>
          Configure how Pimcore handles original asset binaries, database relations, and thumbnail caching.
        </Paragraph>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              height: '100%',
              boxSizing: 'border-box',
            }}
          >
            <Space align="center" style={{ marginBottom: 8 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                <CloudUploadOutlined />
              </div>
              <Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                Asset Binaries
              </Text>
            </Space>
            <Paragraph style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
              Original asset files (images, documents, videos, archives) stream directly to and from your cloud storage bucket.
            </Paragraph>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a', fontWeight: 600, fontSize: 13 }}>
              <CheckCircleFilled /> Stored in Cloud Object Storage
            </div>
          </div>
        </Col>

        <Col xs={24} md={12}>
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              height: '100%',
              boxSizing: 'border-box',
            }}
          >
            <Space align="center" style={{ marginBottom: 8 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  background: '#f0fdf4',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                <DatabaseOutlined />
              </div>
              <Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                Metadata & Tree Structure
              </Text>
            </Space>
            <Paragraph style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
              Asset properties, custom metadata, tags, tree hierarchy, permissions, and dependencies remain safely in MariaDB.
            </Paragraph>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a', fontWeight: 600, fontSize: 13 }}>
              <CheckCircleFilled /> Preserved in Pimcore Database
            </div>
          </div>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <PictureOutlined style={{ color: '#722ed1' }} />
            <span>Thumbnail & CDN Options</span>
          </Space>
        }
        style={{ marginBottom: 20, borderRadius: 8 }}
      >
        <Form
          layout="vertical"
          initialValues={formData}
          onValuesChange={onChange}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ maxWidth: 540 }}>
              <Text strong style={{ fontSize: 14 }}>
                Store Generated Thumbnails in Cloud
              </Text>
              <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                By default, Pimcore caches generated image thumbnails on local disk for optimal transformation speed. Enable this if you run a stateless multi-server Pimcore cluster and want transformed thumbnails shared directly in cloud storage.
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

          <Divider style={{ margin: '16px 0' }} />

          <Form.Item
            name={['settings', 'public_url_prefix']}
            label={
              <Space>
                <GlobalOutlined style={{ color: '#1677ff' }} />
                <span>Custom CDN / Public URL Prefix (Optional)</span>
              </Space>
            }
            extra="e.g. https://cdn.mycompany.com/assets. If specified, public asset URLs generated by Pimcore will use this custom domain prefix."
          >
            <Input
              placeholder="https://cdn.mycompany.com"
              value={formData.settings?.public_url_prefix || ''}
              onChange={(e) => {
                const val = e.target.value;
                onChange(
                  { settings: { ...formData.settings, public_url_prefix: val } },
                  { ...formData, settings: { ...formData.settings, public_url_prefix: val } }
                );
              }}
            />
          </Form.Item>
        </Form>
      </Card>

      <Alert
        type="info"
        showIcon
        icon={<FolderOpenOutlined />}
        message="Asset Path & Tree Hierarchy Consistency"
        description="Pimcore asset storage maps directly to your Pimcore folder structure (e.g. /products/shoes/hero.jpg). Moving or renaming folders inside Pimcore Studio will update asset keys safely through Pimcore's storage event lifecycle."
        style={{ borderRadius: 8 }}
      />
    </div>
  );
};
