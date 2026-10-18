import React, { useState, useEffect } from 'react';
import {
  Modal,
  Select,
  Button,
  Typography,
  Alert,
  Descriptions,
  Progress,
  Switch,
  Table,
  message,
  Card,
  Tag,
} from 'antd';
import {
  SyncOutlined,
  CheckCircleFilled,
  FileDoneOutlined,
  SwapOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { StorageConfiguration, MigrationJob, MigrationPreflightReport } from '../../types';
import { CloudStorageApi } from '../../services/api';

const { Title, Paragraph, Text } = Typography;

interface Props {
  open: boolean;
  configurations: StorageConfiguration[];
  defaultTargetId?: number | null;
  onClose: () => void;
  onMigrationComplete: () => void;
}

export const MigrationWizardModal: React.FC<Props> = ({
  open,
  configurations,
  defaultTargetId,
  onClose,
  onMigrationComplete,
}) => {
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [targetId, setTargetId] = useState<number | null>(defaultTargetId || null);
  const [dryRun, setDryRun] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [preflight, setPreflight] = useState<MigrationPreflightReport | null>(null);

  const [migrating, setMigrating] = useState(false);
  const [activeJob, setActiveJob] = useState<MigrationJob | null>(null);

  useEffect(() => {
    if (open) {
      if (defaultTargetId) {
        setTargetId(defaultTargetId);
      }
    } else {
      setPreflight(null);
      setActiveJob(null);
      setScanning(false);
      setMigrating(false);
    }
  }, [open, defaultTargetId]);

  const handlePreflightScan = async () => {
    if (!targetId) {
      message.error('Please select a destination storage profile.');
      return;
    }

    setScanning(true);
    try {
      const res = await CloudStorageApi.getMigrationPreflight(targetId, sourceId);
      setPreflight(res);
      message.success('Preflight scan completed.');
    } catch (e: any) {
      message.error(e.message || 'Preflight scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleStartMigration = async () => {
    if (!targetId) return;

    setMigrating(true);
    try {
      const job = await CloudStorageApi.startMigration(targetId, sourceId, dryRun);
      setActiveJob(job);
      message.success(dryRun ? 'Dry run simulation finished.' : 'Migration completed successfully.');
      onMigrationComplete();
    } catch (e: any) {
      message.error(e.message || 'Migration failed to execute.');
    } finally {
      setMigrating(false);
    }
  };

  const targetOptions = configurations.map((c) => ({
    value: c.id,
    label: `${c.display_name} (${c.provider.toUpperCase()} - ${c.bucket_or_container})`,
  }));

  const sourceOptions = [
    { value: null, label: 'Current Active Storage Backend' },
    ...configurations.map((c) => ({
      value: c.id,
      label: `${c.display_name} (${c.provider.toUpperCase()} - ${c.bucket_or_container})`,
    })),
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SwapOutlined style={{ color: '#722ed1' }} />
          <span>Asset Migration Assistant</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={780}
      footer={null}
      destroyOnClose
    >
      <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
        Safely copy existing Pimcore asset binaries from one storage provider to another. Existing files are preserved and never deleted automatically.
      </Paragraph>

      {!activeJob ? (
        <>
          <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
            <div style={{ marginBottom: 14 }}>
              <Text strong>Source Storage Location:</Text>
              <Select
                style={{ width: '100%', marginTop: 4 }}
                value={sourceId}
                onChange={setSourceId}
                options={sourceOptions}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <Text strong>Destination Cloud Storage:</Text>
              <Select
                style={{ width: '100%', marginTop: 4 }}
                placeholder="Select target cloud storage profile"
                value={targetId}
                onChange={setTargetId}
                options={targetOptions}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <div>
                <Text strong>Dry-Run Simulation Only</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Scans and verifies target access without writing data.
                </Text>
              </div>
              <Switch checked={dryRun} onChange={setDryRun} />
            </div>

            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Button
                type="primary"
                loading={scanning}
                onClick={handlePreflightScan}
                disabled={!targetId}
                style={{ borderRadius: 6 }}
              >
                Run Preflight Scan
              </Button>
            </div>
          </Card>

          {preflight && (
            <Card title="Preflight Scan Results" size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Source Storage">
                  {preflight.source?.display_name || 'Active Storage Backend'}
                </Descriptions.Item>
                <Descriptions.Item label="Destination">
                  {preflight.target?.display_name}
                </Descriptions.Item>
                <Descriptions.Item label="Total Files Detected">
                  <Text strong>{preflight.report.total_files}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Total Data Size">
                  <Text strong>{preflight.report.formatted_size}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Estimated Duration">
                  ~{preflight.report.estimated_duration_seconds} seconds
                </Descriptions.Item>
                <Descriptions.Item label="Target Reachable">
                  {preflight.report.target_accessible ? (
                    <Tag color="success">ACCESSIBLE</Tag>
                  ) : (
                    <Tag color="error">UNREACHABLE (Check Credentials)</Tag>
                  )}
                </Descriptions.Item>
              </Descriptions>

              <Alert
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                message="Deduplication & Safe Resumption"
                description="Files that already exist on the target storage with matching size and checksums will be skipped automatically."
                style={{ margin: '14px 0', borderRadius: 6 }}
              />

              <div style={{ textAlign: 'right' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={migrating ? <SyncOutlined spin /> : <FileDoneOutlined />}
                  loading={migrating}
                  onClick={handleStartMigration}
                  disabled={!preflight.report.target_accessible}
                  style={{
                    borderRadius: 6,
                    fontWeight: 600,
                    backgroundColor: dryRun ? '#1677ff' : '#16a34a',
                    borderColor: dryRun ? '#1677ff' : '#16a34a',
                  }}
                >
                  {dryRun ? 'Start Dry-Run Simulation' : 'Execute Asset Migration'}
                </Button>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card title="Migration Execution Report" size="small" style={{ borderRadius: 8 }}>
          <Alert
            type={activeJob.status === 'completed' ? 'success' : activeJob.status === 'failed' ? 'error' : 'info'}
            showIcon
            message={`Migration Status: ${activeJob.status.toUpperCase()}`}
            description={
              activeJob.is_dry_run
                ? 'Dry run simulation finished without writing files to target.'
                : 'Asset binaries copied to target cloud storage.'
            }
            style={{ marginBottom: 16, borderRadius: 6 }}
          />

          <Progress percent={activeJob.progress_percent} status="normal" style={{ marginBottom: 16 }} />

          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Processed Files">
              {activeJob.processed_files} / {activeJob.total_files}
            </Descriptions.Item>
            <Descriptions.Item label="Failed Files">
              <span style={{ color: activeJob.failed_files > 0 ? '#dc2626' : undefined, fontWeight: 600 }}>
                {activeJob.failed_files}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Source ➔ Target">
              {activeJob.source_name} ➔ {activeJob.target_name}
            </Descriptions.Item>
            <Descriptions.Item label="Mode">
              {activeJob.is_dry_run ? 'Dry Run' : 'Real Copy'}
            </Descriptions.Item>
          </Descriptions>

          {activeJob.error_log && activeJob.error_log.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Text type="danger" strong>Failure Details ({activeJob.error_log.length} errors):</Text>
              <Table
                dataSource={activeJob.error_log}
                rowKey="path"
                size="small"
                pagination={{ pageSize: 5 }}
                columns={[
                  { title: 'Asset Path', dataIndex: 'path', key: 'path' },
                  { title: 'Error Reason', dataIndex: 'message', key: 'message' },
                ]}
              />
            </div>
          )}

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setActiveJob(null)}>Run Another Migration</Button>
            <Button type="primary" onClick={onClose} style={{ marginLeft: 8 }}>
              Close
            </Button>
          </div>
        </Card>
      )}
    </Modal>
  );
};
