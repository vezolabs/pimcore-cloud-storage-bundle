import React, { useState, useEffect } from 'react';
import { Tabs, Button, message, Space, Typography, Spin, ConfigProvider } from 'antd';
import {
  CloudServerOutlined,
  DashboardOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  SyncOutlined,
  SlidersOutlined,
  SwapOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import { StorageOverview, StorageConfiguration } from '../types';
import { CloudStorageApi } from '../services/api';
import { StorageDashboard } from '../components/Dashboard/StorageDashboard';
import { ConfigurationList } from '../components/Configurations/ConfigurationList';
import { SetupWizard } from '../components/SetupWizard/SetupWizard';
import { ConfigurationEditorModal } from '../components/Configurations/ConfigurationEditorModal';
import { MigrationWizardModal } from '../components/Migration/MigrationWizardModal';
import { DiagnosticsDrawer } from '../components/Diagnostics/DiagnosticsDrawer';

const { Title, Text } = Typography;

const PIMCORE_THEME = {
  token: {
    colorPrimary: '#722ed1',
    borderRadius: 6,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};

export const CloudStoragePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<StorageOverview | null>(null);
  const [configurations, setConfigurations] = useState<StorageConfiguration[]>([]);

  // Modals & Drawers state
  const [editingConfig, setEditingConfig] = useState<StorageConfiguration | null>(null);
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [migrationTargetId, setMigrationTargetId] = useState<number | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [testingActive, setTestingActive] = useState(false);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [ov, configs] = await Promise.all([
        CloudStorageApi.getOverview(),
        CloudStorageApi.listConfigurations(),
      ]);
      setOverview(ov);
      setConfigurations(configs);
    } catch (e: any) {
      message.error(e.message || 'Failed to load cloud storage configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleTestActive = async (id: number) => {
    setTestingActive(true);
    try {
      const res = await CloudStorageApi.testSavedConfiguration(id);
      if (res.success) {
        message.success(`Active connection verified (${res.latency_ms} ms): ${res.message}`);
      } else {
        message.error(`Test failed: ${res.message}`);
      }
      loadAllData();
    } catch (e: any) {
      message.error(e.message || 'Test execution failed.');
    } finally {
      setTestingActive(false);
    }
  };

  const handleLaunchMigration = (targetId?: number) => {
    if (targetId) {
      setMigrationTargetId(targetId);
    }
    setMigrationModalOpen(true);
  };

  if (loading && !overview) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}>
        <Spin size="large" tip="Loading Cloud Storage Configuration..." />
      </div>
    );
  }

  return (
    <ConfigProvider theme={PIMCORE_THEME}>
      <div
        style={{
          height: '100%',
          width: '100%',
          overflowY: 'auto',
          background: '#f8fafc',
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Space align="center" size={14}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#f3e8ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#722ed1',
                fontSize: 24,
                boxShadow: '0 2px 6px rgba(114, 46, 209, 0.15)',
              }}
            >
              <CloudOutlined />
            </div>
            <div>
              <Title level={3} style={{ margin: 0, color: '#1e293b' }}>
                Cloud Storage Manager
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Configure and manage Amazon S3, Azure Blob, and Google Cloud Storage natively for Pimcore 12 Studio
              </Text>
            </div>
          </Space>

          <Space>
            <Button icon={<SyncOutlined />} onClick={loadAllData} loading={loading}>
              Refresh
            </Button>
            <Button icon={<SlidersOutlined />} onClick={() => setDiagnosticsOpen(true)}>
              Diagnostics
            </Button>
            <Button icon={<SwapOutlined />} onClick={() => handleLaunchMigration()}>
              Migration Assistant
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setActiveTab('wizard')}>
              New Storage Setup
            </Button>
          </Space>
        </div>

        {/* TABS */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="middle"
          style={{ background: 'transparent' }}
          items={[
            {
              key: 'dashboard',
              label: (
                <Space size={6}>
                  <DashboardOutlined />
                  <span>Dashboard</span>
                </Space>
              ),
              children: overview ? (
                <StorageDashboard
                  overview={overview}
                  onNavigateToWizard={() => setActiveTab('wizard')}
                  onNavigateToConfigs={() => setActiveTab('configurations')}
                  onNavigateToMigration={() => handleLaunchMigration()}
                  onOpenDiagnostics={() => setDiagnosticsOpen(true)}
                  onTestActive={handleTestActive}
                  testingActive={testingActive}
                />
              ) : null,
            },
            {
              key: 'configurations',
              label: (
                <Space size={6}>
                  <UnorderedListOutlined />
                  <span>Storage Profiles ({configurations.length})</span>
                </Space>
              ),
              children: (
                <ConfigurationList
                  configurations={configurations}
                  onRefresh={loadAllData}
                  onEdit={(c) => setEditingConfig(c)}
                  onMigrateTo={(tId) => handleLaunchMigration(tId)}
                />
              ),
            },
            {
              key: 'wizard',
              label: (
                <Space size={6}>
                  <PlusOutlined />
                  <span>Guided Setup Wizard</span>
                </Space>
              ),
              children: (
                <SetupWizard
                  onFinish={() => {
                    loadAllData();
                    setActiveTab('dashboard');
                  }}
                  onCancel={() => setActiveTab('dashboard')}
                />
              ),
            },
          ]}
        />

        {/* MODALS */}
        <ConfigurationEditorModal
          open={editingConfig !== null}
          config={editingConfig}
          onClose={() => setEditingConfig(null)}
          onSaved={loadAllData}
        />

        <MigrationWizardModal
          open={migrationModalOpen}
          configurations={configurations}
          defaultTargetId={migrationTargetId}
          onClose={() => {
            setMigrationModalOpen(false);
            setMigrationTargetId(null);
          }}
          onMigrationComplete={loadAllData}
        />

        <DiagnosticsDrawer
          open={diagnosticsOpen}
          onClose={() => setDiagnosticsOpen(false)}
        />
      </div>
    </ConfigProvider>
  );
};
