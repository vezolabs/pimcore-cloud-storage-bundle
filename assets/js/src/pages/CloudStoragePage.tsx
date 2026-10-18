import React, { useState, useEffect } from 'react';
import { Layout, Tabs, Button, message, Space, Typography, Spin, Alert } from 'antd';
import {
  CloudServerOutlined,
  DashboardOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  SyncOutlined,
  SlidersOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { StorageOverview, StorageConfiguration } from '../types';
import { CloudStorageApi } from '../services/api';
import { StorageDashboard } from '../components/Dashboard/StorageDashboard';
import { ConfigurationList } from '../components/Configurations/ConfigurationList';
import { SetupWizard } from '../components/SetupWizard/SetupWizard';
import { ConfigurationEditorModal } from '../components/Configurations/ConfigurationEditorModal';
import { MigrationWizardModal } from '../components/Migration/MigrationWizardModal';
import { DiagnosticsDrawer } from '../components/Diagnostics/DiagnosticsDrawer';

const { Content } = Layout;
const { Title, Text } = Typography;

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" tip="Loading Cloud Storage Configuration..." />
      </div>
    );
  }

  return (
    <Content style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Space align="center">
            <CloudServerOutlined style={{ fontSize: 26, color: '#1677ff' }} />
            <Title level={3} style={{ margin: 0 }}>
              Cloud Storage Manager
            </Title>
          </Space>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary">
              Configure and manage Amazon S3, Azure Blob, and Google Cloud Storage natively for Pimcore 12 Studio.
            </Text>
          </div>
        </div>

        <Space>
          <Button icon={<SyncOutlined />} onClick={loadAllData}>
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
        items={[
          {
            key: 'dashboard',
            label: (
              <span>
                <DashboardOutlined />
                Dashboard
              </span>
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
              <span>
                <UnorderedListOutlined />
                Storage Profiles ({configurations.length})
              </span>
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
              <span>
                <PlusOutlined />
                Guided Setup Wizard
              </span>
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
    </Content>
  );
};
