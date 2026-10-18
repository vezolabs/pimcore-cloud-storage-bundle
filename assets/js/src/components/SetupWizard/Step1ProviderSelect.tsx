import React from 'react';
import { Card, Row, Col, Typography, Tag, Button, Alert } from 'antd';
import {
  CloudServerOutlined,
  WindowsOutlined,
  GoogleOutlined,
  InfoCircleOutlined,
  CheckCircleFilled,
  CheckOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';

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
      subtitle: 'AWS, MinIO, Ceph, Cloudflare R2, Wasabi',
      badge: 'Most Popular',
      badgeColor: 'gold',
      description: 'The industry-standard object storage service. Highly scalable and compatible with AWS and private cloud storage.',
      highlights: [
        'Direct asset streaming & chunked uploads',
        'IAM Roles, Workload Identity, or Access Keys',
        'Custom endpoint URLs supported (MinIO, R2)',
      ],
      icon: <CloudServerOutlined style={{ fontSize: 28, color: '#d46b08' }} />,
      iconBg: '#fff7e6',
      accentColor: '#fa8c16',
    },
    {
      key: 'azure' as const,
      title: 'Microsoft Azure Blob Storage',
      subtitle: 'Azure Storage Accounts & Containers',
      badge: 'Enterprise',
      badgeColor: 'blue',
      description: 'Massively scalable object storage engineered for enterprise workloads and Microsoft cloud infrastructure.',
      highlights: [
        'Secure block blob storage architecture',
        'Connection String or Account Key authentication',
        'Azure Managed Identity support',
      ],
      icon: <WindowsOutlined style={{ fontSize: 28, color: '#0958d9' }} />,
      iconBg: '#e6f4ff',
      accentColor: '#1677ff',
    },
    {
      key: 'gcs' as const,
      title: 'Google Cloud Storage',
      subtitle: 'Google Cloud Platform Buckets',
      badge: 'High Performance',
      badgeColor: 'purple',
      description: 'Unified object storage from Google Cloud, offering global edge caching, high availability, and low latency.',
      highlights: [
        'High-speed streaming with resumable uploads',
        'Service Account JSON Key authentication',
        'Application Default Credentials (ADC) support',
      ],
      icon: <GoogleOutlined style={{ fontSize: 28, color: '#531dab' }} />,
      iconBg: '#f9f0ff',
      accentColor: '#722ed1',
    },
  ];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: '0 0 8px 0', color: '#1e293b' }}>
          Choose Your Cloud Storage Provider
        </Title>
        <Paragraph type="secondary" style={{ fontSize: 14, maxWidth: 650, margin: '0 auto' }}>
          Store your Pimcore asset binaries safely in external cloud object storage rather than relying exclusively on the local web server filesystem.
        </Paragraph>
      </div>

      <Alert
        message="Safe & Non-Destructive Setup"
        description="Connecting a cloud storage provider does not alter your existing database assets, metadata, relations, or local files. You can test live connections and verify operations safely before activating."
        type="info"
        showIcon
        icon={<SafetyCertificateOutlined style={{ color: '#1677ff' }} />}
        style={{ marginBottom: 24, borderRadius: 8 }}
      />

      <Row gutter={[20, 20]}>
        {providers.map((p) => {
          const isSelected = selectedProvider === p.key;
          return (
            <Col xs={24} md={8} key={p.key}>
              <div
                onClick={() => onSelect(p.key)}
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: 10,
                  border: isSelected ? '2px solid #722ed1' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#faf5ff' : '#ffffff',
                  boxShadow: isSelected
                    ? '0 6px 18px rgba(114, 46, 209, 0.12)'
                    : '0 2px 6px rgba(0, 0, 0, 0.03)',
                  padding: '22px 20px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                }}
              >
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: '#722ed1',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 12,
                    }}
                  >
                    <CheckCircleFilled /> Selected
                  </div>
                )}

                <div>
                  {/* Icon & Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 10,
                        backgroundColor: p.iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {p.icon}
                    </div>
                    {!isSelected && <Tag color={p.badgeColor}>{p.badge}</Tag>}
                  </div>

                  {/* Title & Subtitle */}
                  <div style={{ marginBottom: 10 }}>
                    <Title level={5} style={{ margin: '0 0 4px 0', color: '#0f172a' }}>
                      {p.title}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {p.subtitle}
                    </Text>
                  </div>

                  {/* Description */}
                  <Paragraph style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 16 }}>
                    {p.description}
                  </Paragraph>

                  {/* Highlights */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginBottom: 16 }}>
                    {p.highlights.map((h, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 6,
                          fontSize: 12,
                          color: '#334155',
                          marginBottom: 6,
                        }}
                      >
                        <CheckOutlined style={{ color: '#16a34a', fontSize: 12, marginTop: 3 }} />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Button */}
                <Button
                  type={isSelected ? 'primary' : 'default'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(p.key);
                  }}
                  style={{
                    width: '100%',
                    borderRadius: 6,
                    height: 38,
                    fontWeight: 600,
                    backgroundColor: isSelected ? '#722ed1' : undefined,
                    borderColor: isSelected ? '#722ed1' : undefined,
                  }}
                >
                  {isSelected ? 'Selected Provider' : `Choose ${p.title.split(' ')[0]}`}
                </Button>
              </div>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};
