import React, { useState } from 'react';
import {
  Modal,
  Select,
  Button,
  Typography,
  Alert,
  Descriptions,
  Progress,
  Switch,
  Space,
  Table,
  message,
  Card,
  Divider,
  Tag,
} from 'antd';
import {
  SyncOutlined,
  CheckCircleFilled,
  WarningOutlined,
  FileDoneOutlined,
  ExclamationCircleOutlined,
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
      message.success(dryRun ? 'Dry run simulation finished.' : 'Migration process completed.');
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
      label: `${c.display_name} (${c.provider.toUpperCase()})`,
    })),
  ];

  return (
    <Modal
      title="Asset Migration Assistant"
      open={open}
      onCancel={onClose}
      width={750}
      footer={null}
    >
      <Paragraph type="secondary">
        Safely copy existing Pimcore asset binaries from one storage backend to another. Existing files will never be deleted or overwritten without verification.
      </Paragraph>

      {!activeJob ? (
        <>
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Source Storage:</Text>
              <Select
                style={{ width: '100%', marginTop: 4 }}
                value={sourceId}
                onChange={setSourceId}
                options={sourceOptions}
              />
            </div>

            <div>
              <Text strong>Destination Storage:</Text>
              <Select
                style={{ width: '100%', marginTop: 4 }}
                placeholder="Select target cloud storage profile"
                value={targetId}
                onChange={setTargetId}
                options={targetOptions}
              />
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Dry-Run Simulation Only</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Scans and verifies files without actually writing data to destination.
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
              >
                Run Preflight Scan
              </Button>
            </div>
          </Card>

          {preflight && (
            <Card title="Preflight Scan Results" size="small" style={{ marginBottom: 16 }}>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Source Storage">
                  {preflight.source?.display_name || 'Local Storage'}
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
                    <Tag color="success">YES</Tag>
                  ) : (
                    <Tag color="error">NO (Check Credentials)</Tag>
                  )}
                </Descriptions.Item>
              </Descriptions>

              <Alert
                type="info"
                showIcon
                message="Resumable & Safe"
                description="If any files already exist on the destination with matching size and checksums, they will be skipped automatically."
                style={{ margin: '16px 0' }}
              />

              <div style={{ textAlign: 'right' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={migrating ? <SyncOutlined spin /> : <FileDoneOutlined />}
                  loading={migrating}
                  onClick={handleStartMigration}
                  style={{ backgroundColor: dryRun ? '#1677ff' : '#52c41a', borderColor: dryRun ? '#1677ff' : '#52c41a' }}
                >
                  {dryRun ? 'Start Dry Run' : 'Start Migration'}
                </Button>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card title="Migration Execution Report" size="small">
          <Alert
            type={activeJob.status === 'completed' ? 'success' : activeJob.status === 'failed' ? 'error' : 'info'}
            showIcon
            message={`Migration Status: ${activeJob.status.toUpperCase()}`}
            description={
              activeJob.is_dry_run
                ? 'Dry run simulation finished without writing to target.'
                : 'Asset binaries copied to target cloud storage.'
            }
            style={{ marginBottom: 16 }}
          />

          <Progress percent={activeJob.progress_percent} status="normal" style={{ marginBottom: 16 }} />

          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Processed Files">
              {activeJob.processed_files} / {activeJob.total_files}
            </Descriptions.Item>
            <Descriptions.Item label="Failed Files">
              {activeJob.failed_files}
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
