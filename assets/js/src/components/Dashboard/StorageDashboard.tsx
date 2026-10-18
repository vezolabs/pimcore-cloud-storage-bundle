import React from 'react';
import { Card, Row, Col, Typography, Tag, Button, Statistic, Space, Alert, Progress } from 'antd';
import {
  CloudServerOutlined,
  CheckCircleFilled,
  WarningFilled,
  CloseCircleFilled,
  ThunderboltOutlined,
  SyncOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  SwapOutlined,
  SlidersOutlined,
} from '@ant-design/icons';
import { StorageOverview } from '../../types';

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
          borderRadius: 10,
          background: isCloud
            ? 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%)'
            : '#ffffff',
          borderColor: isCloud ? '#d8b4fe' : '#e2e8f0',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
        }}
      >
        <Row justify="space-between" align="middle" gutter={[20, 20]}>
          <Col xs={24} lg={16}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  minWidth: 52,
                  borderRadius: 12,
                  background: isCloud ? '#f3e8ff' : '#f1f5f9',
                  color: isCloud ? '#722ed1' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <CloudServerOutlined />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                  <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
                    {active?.display_name || 'Local Application Storage'}
                  </Title>
                  <Tag color={isCloud ? 'purple' : 'default'} style={{ fontSize: 12, fontWeight: 600 }}>
                    {active ? active.provider.toUpperCase() : 'LOCAL FILESYSTEM'}
                  </Tag>
                  {getStatusBadge(active?.last_test_status)}
                </div>

                <Paragraph style={{ margin: '6px 0 4px 0', color: '#475569', fontSize: 13 }}>
                  {isCloud ? (
                    <>
                      Target Bucket: <Text code strong>{active?.bucket_or_container}</Text>
                      {active?.region_or_project && (
                        <> | Region/Project: <Text strong>{active.region_or_project}</Text></>
                      )}
                      {active?.path_prefix && (
                        <> | Prefix: <Text code>/{active.path_prefix}</Text></>
                      )}
                    </>
                  ) : (
                    'Assets are currently stored on the local web server filesystem (/public/var/assets).'
                  )}
                </Paragraph>

                {active?.last_tested_at && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Last connection verified: {new Date(active.last_tested_at).toLocaleString()}
                  </Text>
                )}

                {active?.last_test_message && active.last_test_status === 'failed' && (
                  <Alert
                    type="error"
                    showIcon
                    message="Last Connection Test Failed"
                    description={active.last_test_message}
                    style={{ marginTop: 10, borderRadius: 6 }}
                  />
                )}
              </div>
            </div>
          </Col>

          <Col xs={24} lg={8} style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
            {active?.id && (
              <Button
                icon={<ThunderboltOutlined />}
                loading={testingActive}
                onClick={() => onTestActive(active.id!)}
                style={{ borderRadius: 6 }}
              >
                Test Connection
              </Button>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onNavigateToWizard}
              style={{ borderRadius: 6, fontWeight: 600 }}
            >
              Add Cloud Provider
            </Button>
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
                <Button size="small" type="link" onClick={onNavigateToMigration} style={{ padding: 0 }}>
                  View Migration Details <ArrowRightOutlined />
                </Button>
              </div>
            </div>
          }
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
      )}

      {/* KPI METRICS ROW */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Storage Profiles"
              value={overview.total_configurations}
              prefix={<DatabaseOutlined style={{ color: '#1677ff' }} />}
            />
            <div style={{ marginTop: 8 }}>
              <Button type="link" size="small" onClick={onNavigateToConfigs} style={{ padding: 0 }}>
                Manage Profiles <ArrowRightOutlined />
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Verified Connections"
              value={overview.tested_successful}
              valueStyle={{ color: '#16a34a' }}
              prefix={<CheckCircleFilled style={{ color: '#16a34a' }} />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Ready for asset workloads</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Connection Failures"
              value={overview.tested_failed}
              valueStyle={{ color: overview.tested_failed > 0 ? '#dc2626' : '#64748b' }}
              prefix={<CloseCircleFilled style={{ color: overview.tested_failed > 0 ? '#dc2626' : '#cbd5e1' }} />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Profiles requiring attention</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="System Health"
              value={overview.status.toUpperCase()}
              valueStyle={{ color: overview.status === 'healthy' ? '#16a34a' : '#d97706' }}
              prefix={<SafetyCertificateOutlined style={{ color: overview.status === 'healthy' ? '#16a34a' : '#d97706' }} />}
            />
            <div style={{ marginTop: 8 }}>
              <Button type="link" size="small" onClick={onOpenDiagnostics} style={{ padding: 0 }}>
                System Diagnostics <ArrowRightOutlined />
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* QUICK ACTIONS & STORAGE ADAPTERS */}
      <Card
        title="Supported Cloud Storage Adapters"
        extra={
          <Space>
            <Button size="small" icon={<SwapOutlined />} onClick={onNavigateToMigration}>
              Migration Assistant
            </Button>
            <Button size="small" icon={<SlidersOutlined />} onClick={onOpenDiagnostics}>
              Diagnostics
            </Button>
          </Space>
        }
        style={{ borderRadius: 8 }}
      >
        <Row gutter={[16, 16]}>
          {overview.available_providers.map((p) => (
            <Col xs={24} md={8} key={p.key}>
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 16,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: '#fafafa',
                  boxSizing: 'border-box',
                }}
              >
                <div>
                  <Title level={5} style={{ margin: '0 0 6px 0', color: '#0f172a' }}>
                    {p.name}
                  </Title>
                  <Paragraph type="secondary" style={{ fontSize: 13, minHeight: 48, marginBottom: 12 }}>
                    {p.description}
                  </Paragraph>
                </div>
                <Button
                  size="small"
                  type="primary"
                  ghost
                  onClick={onNavigateToWizard}
                  style={{ width: '100%', borderRadius: 6 }}
                >
                  Configure {p.name.split(' ')[0]}
                </Button>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};
