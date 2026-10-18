import React from 'react';
import { Card, Row, Col, Typography, Tag, Button, Statistic, Space, Alert, Progress } from 'antd';
import {
  CloudServerOutlined,
  CheckCircleFilled,
  WarningFilled,
  CloseCircleFilled,
  ThunderboltOutlined,
  SettingOutlined,
  SyncOutlined,
  FolderOpenOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { StorageOverview, StorageConfiguration } from '../../types';

const { Title, Paragraph, Text } = Typography;

interface Props {
  overview: StorageOverview;
  onNavigateToWizard: () => void;
  onNavigateToConfigs: () => void;
  onNavigateToMigration: () => void;
  onOpenDiagnostics: () => void;
  onTestActive: (id: number) => void;
  testingActive: boolean;
}

export const StorageDashboard: React.FC<Props> = ({
  overview,
  onNavigateToWizard,
  onNavigateToConfigs,
  onNavigateToMigration,
  onOpenDiagnostics,
  onTestActive,
  testingActive,
}) => {
  const active = overview.active_configuration;
  const isCloud = overview.is_cloud_active;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'success':
        return <Tag icon={<CheckCircleFilled />} color="success">Connected & Verified</Tag>;
      case 'failed':
        return <Tag icon={<CloseCircleFilled />} color="error">Connection Failed</Tag>;
      case 'warning':
        return <Tag icon={<WarningFilled />} color="warning">Attention Needed</Tag>;
      default:
        return <Tag color="default">Ready</Tag>;
    }
  };

  return (
    <div>
      {/* ACTIVE PROVIDER BANNER */}
      <Card
        style={{
          marginBottom: 24,
          background: isCloud
            ? 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)'
            : '#fafafa',
          borderColor: isCloud ? '#91caff' : '#d9d9d9',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space align="start" size={16}>
              <div
                style={{
                  fontSize: 38,
                  color: isCloud ? '#1677ff' : '#8c8c8c',
                  padding: 8,
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                }}
              >
                <CloudServerOutlined />
              </div>
              <div>
                <Space align="center">
                  <Title level={4} style={{ margin: 0 }}>
                    {active?.display_name || 'Local Application Storage'}
                  </Title>
                  <Tag color={isCloud ? 'blue' : 'default'} style={{ fontSize: 13, padding: '2px 8px' }}>
                    {active ? active.provider.toUpperCase() : 'LOCAL'}
                  </Tag>
                  {getStatusBadge(active?.last_test_status)}
                </Space>

                <Paragraph style={{ margin: '6px 0 0 0', color: '#555' }}>
                  {isCloud ? (
                    <>
                      Target Bucket: <Text code strong>{active?.bucket_or_container}</Text> | Region/Project: <Text strong>{active?.region_or_project || 'Default'}</Text> | Path Prefix: <Text code>{active?.path_prefix || 'Root'}</Text>
                    </>
                  ) : (
                    'Assets are currently stored on the local web server filesystem (/public/var/assets).'
                  )}
                </Paragraph>

                {active?.last_tested_at && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Last test verified: {new Date(active.last_tested_at).toLocaleString()}
                  </Text>
                )}

                {active?.last_test_message && active.last_test_status === 'failed' && (
                  <Alert
                    type="error"
                    showIcon
                    message="Last Connection Error"
                    description={active.last_test_message}
                    style={{ marginTop: 8 }}
                  />
                )}
              </div>
            </Space>
          </Col>

          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Space wrap>
              {active?.id && (
                <Button
                  icon={<ThunderboltOutlined />}
                  loading={testingActive}
                  onClick={() => onTestActive(active.id!)}
                >
                  Test Connection
                </Button>
              )}
              <Button type="primary" onClick={onNavigateToWizard}>
                + Add Cloud Provider
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ACTIVE MIGRATION ALERT IF RUNNING */}
      {overview.active_migration && (
        <Alert
          type="info"
          showIcon
          icon={<SyncOutlined spin />}
          message={`Asset Migration in Progress: ${overview.active_migration.source_name} ➔ ${overview.active_migration.target_name}`}
          description={
            <div style={{ marginTop: 8 }}>
              <Progress
                percent={overview.active_migration.progress_percent}
                status="active"
                style={{ marginBottom: 4 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span>
                  Processed {overview.active_migration.processed_files} / {overview.active_migration.total_files} files
                </span>
                <Button size="small" type="link" onClick={onNavigateToMigration}>
                  View Migration Details ➔
                </Button>
              </div>
            </div>
          }
          style={{ marginBottom: 24 }}
        />
      )}

      {/* KPI METRICS ROW */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Configured Storage Profiles"
              value={overview.total_configurations}
              prefix={<DatabaseOutlined style={{ color: '#1677ff' }} />}
            />
            <div style={{ marginTop: 8 }}>
              <Button type="link" size="small" onClick={onNavigateToConfigs} style={{ padding: 0 }}>
                Manage Profiles ➔
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Verified Connections"
              value={overview.tested_successful}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleFilled style={{ color: '#52c41a' }} />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Ready for asset workloads</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Connection Failures"
              value={overview.tested_failed}
              valueStyle={{ color: overview.tested_failed > 0 ? '#ff4d4f' : '#8c8c8c' }}
              prefix={<CloseCircleFilled style={{ color: overview.tested_failed > 0 ? '#ff4d4f' : '#bfbfbf' }} />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Profiles requiring attention</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="System Health"
              value={overview.status.toUpperCase()}
              valueStyle={{ color: overview.status === 'healthy' ? '#52c41a' : '#faad14' }}
              prefix={<SafetyCertificateOutlined style={{ color: overview.status === 'healthy' ? '#52c41a' : '#faad14' }} />}
            />
            <div style={{ marginTop: 8 }}>
              <Button type="link" size="small" onClick={onOpenDiagnostics} style={{ padding: 0 }}>
                Diagnostics ➔
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* AVAILABLE PROVIDERS OVERVIEW */}
      <Card title="Available Storage Adapters">
        <Row gutter={[16, 16]}>
          {overview.available_providers.map((p) => (
            <Col xs={24} md={8} key={p.key}>
              <Card type="inner" title={p.name} size="small" style={{ height: '100%' }}>
                <Paragraph type="secondary" style={{ fontSize: 13, minHeight: 40 }}>
                  {p.description}
                </Paragraph>
                <Button
                  size="small"
                  type="dashed"
                  onClick={onNavigateToWizard}
                  style={{ width: '100%' }}
                >
                  Configure {p.name.split(' ')[0]}
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};
