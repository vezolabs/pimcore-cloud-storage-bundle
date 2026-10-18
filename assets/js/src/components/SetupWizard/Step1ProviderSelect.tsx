import React from 'react';
import { Card, Row, Col, Typography, Tag, Space, Alert } from 'antd';
import { CloudServerOutlined, WindowsOutlined, GoogleOutlined, InfoCircleOutlined, CheckCircleFilled } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface Props {
  selectedProvider: 's3' | 'azure' | 'gcs';
  onSelect: (provider: 's3' | 'azure' | 'gcs') => void;
}

export const Step1ProviderSelect: React.FC<Props> = ({ selectedProvider, onSelect }) => {
  const providers = [
    {
      key: 's3' as const,
      title: 'Amazon S3 & S3-Compatible',
      subtitle: 'AWS S3, MinIO, Ceph, Cloudflare R2, Wasabi, DigitalOcean',
      description: 'The industry-standard object storage service. Highly scalable, secure, and compatible with dozens of cloud and on-premise storage solutions.',
      icon: <CloudServerOutlined style={{ fontSize: 36, color: '#ff9900' }} />,
      badge: 'Popular',
      color: '#fff7e6',
      border: selectedProvider === 's3' ? '#ff9900' : '#d9d9d9',
    },
    {
      key: 'azure' as const,
      title: 'Microsoft Azure Blob Storage',
      subtitle: 'Azure Storage Accounts & Containers',
      description: 'Massively scalable object storage for cloud-native workloads, analytics, and enterprise Microsoft cloud infrastructure.',
      icon: <WindowsOutlined style={{ fontSize: 36, color: '#0078d4' }} />,
      badge: 'Enterprise',
      color: '#e6f7ff',
      border: selectedProvider === 'azure' ? '#0078d4' : '#d9d9d9',
    },
    {
      key: 'gcs' as const,
      title: 'Google Cloud Storage (GCS)',
      subtitle: 'Google Cloud Platform Buckets',
      description: 'Unified object storage from Google Cloud, offering global edge caching, high availability, and direct integration with GCP services.',
      icon: <GoogleOutlined style={{ fontSize: 36, color: '#4285f4' }} />,
      badge: 'High Performance',
      color: '#f0f5ff',
      border: selectedProvider === 'gcs' ? '#4285f4' : '#d9d9d9',
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <Title level={4}>Choose Your Cloud Storage Provider</Title>
        <Paragraph type="secondary" style={{ fontSize: 15 }}>
          Cloud storage keeps your Pimcore asset binaries safely in an external object storage service rather than relying exclusively on the local web server filesystem.
        </Paragraph>
      </div>

      <Alert
        message="Non-Destructive Setup"
        description="Connecting a cloud storage provider does not alter your existing database assets, metadata, or relations. You will be able to test the connection and migrate files safely before activating."
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[20, 20]}>
        {providers.map((p) => {
          const isSelected = selectedProvider === p.key;
          return (
            <Col xs={24} md={8} key={p.key}>
              <Card
                hoverable
                onClick={() => onSelect(p.key)}
                style={{
                  height: '100%',
                  borderColor: isSelected ? p.border : '#e8e8e8',
                  borderWidth: isSelected ? 2 : 1,
                  boxShadow: isSelected ? '0 4px 14px rgba(0, 0, 0, 0.1)' : 'none',
                  backgroundColor: isSelected ? '#fafafa' : '#fff',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                {isSelected && (
                  <CheckCircleFilled
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      fontSize: 20,
                      color: p.border,
                    }}
                  />
                )}
                <div style={{ marginBottom: 16 }}>{p.icon}</div>
                <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text strong style={{ fontSize: 16 }}>{p.title}</Text>
                    <Tag color="blue">{p.badge}</Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{p.subtitle}</Text>
                  <Paragraph style={{ marginTop: 12, fontSize: 13, color: '#555' }}>
                    {p.description}
                  </Paragraph>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};
