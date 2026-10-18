import React, { useState } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Popconfirm,
  Typography,
  Tooltip,
  Card,
  message,
} from 'antd';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  WarningFilled,
  ThunderboltOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloudUploadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { StorageConfiguration } from '../../types';
import { CloudStorageApi } from '../../services/api';

const { Text } = Typography;

interface Props {
  configurations: StorageConfiguration[];
  onRefresh: () => void;
  onEdit: (config: StorageConfiguration) => void;
  onMigrateTo: (targetId: number) => void;
}

export const ConfigurationList: React.FC<Props> = ({
  configurations,
  onRefresh,
  onEdit,
  onMigrateTo,
}) => {
  const [testingId, setTestingId] = useState<number | null>(null);
  const [activatingId, setActivatingId] = useState<number | null>(null);

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const res = await CloudStorageApi.testSavedConfiguration(id);
      if (res.success) {
        message.success(`Connection verified (${res.latency_ms} ms): ${res.message}`);
      } else {
        message.error(`Test failed: ${res.message}`);
      }
      onRefresh();
    } catch (e: any) {
      message.error(e.message || 'Test execution error');
    } finally {
      setTestingId(null);
    }
  };

  const handleActivate = async (id: number) => {
    setActivatingId(id);
    try {
      const res = await CloudStorageApi.activateConfiguration(id);
      message.success(res.message);
      onRefresh();
    } catch (e: any) {
      message.error(e.message || 'Activation failed');
    } finally {
      setActivatingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await CloudStorageApi.deleteConfiguration(id);
      message.success('Configuration deleted.');
      onRefresh();
    } catch (e: any) {
      message.error(e.message || 'Delete failed');
    }
  };

  const columns = [
    {
      title: 'Configuration',
      key: 'name',
      render: (_: any, record: StorageConfiguration) => (
        <div>
          <Space>
            <Text strong style={{ fontSize: 14 }}>{record.display_name}</Text>
            {record.is_active && <Tag color="green">ACTIVE</Tag>}
          </Space>
          <br />
          <Text code style={{ fontSize: 12 }}>{record.name}</Text>
        </div>
      ),
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      key: 'provider',
      render: (provider: string) => {
        const color = provider === 's3' ? 'orange' : provider === 'azure' ? 'blue' : provider === 'gcs' ? 'geekblue' : 'default';
        return <Tag color={color}>{provider.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Bucket / Container',
      dataIndex: 'bucket_or_container',
      key: 'bucket',
      render: (val: string, record: StorageConfiguration) => (
        <div>
          <Text strong>{val || 'N/A'}</Text>
          {record.path_prefix && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Prefix: /{record.path_prefix}</Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Region / Endpoint',
      key: 'endpoint',
      render: (_: any, record: StorageConfiguration) => (
        <div>
          {record.region_or_project && <Tag>{record.region_or_project}</Tag>}
          {record.endpoint && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>{record.endpoint}</Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Health / Verification',
      key: 'status',
      render: (_: any, record: StorageConfiguration) => {
        const isTested = record.last_test_status === 'success';
        const isFailed = record.last_test_status === 'failed';
        return (
          <div>
            {isTested && <Tag icon={<CheckCircleFilled />} color="success">Verified</Tag>}
            {isFailed && <Tag icon={<CloseCircleFilled />} color="error">Failed</Tag>}
            {!isTested && !isFailed && <Tag color="default">Not Tested</Tag>}
            {record.last_tested_at && (
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {new Date(record.last_tested_at).toLocaleDateString()}
                </Text>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: StorageConfiguration) => (
        <Space size="small">
          <Tooltip title="Run live connection & permission probe">
            <Button
              size="small"
              icon={testingId === record.id ? <SyncOutlined spin /> : <ThunderboltOutlined />}
              loading={testingId === record.id}
              onClick={() => handleTest(record.id!)}
            >
              Test
            </Button>
          </Tooltip>

          {!record.is_active ? (
            <Popconfirm
              title="Activate this storage backend?"
              description={`New asset uploads and reads will be routed to ${record.display_name}. Existing files should be migrated if needed.`}
              onConfirm={() => handleActivate(record.id!)}
              okText="Activate"
            >
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                loading={activatingId === record.id}
              >
                Activate
              </Button>
            </Popconfirm>
          ) : (
            <Tag color="success" style={{ margin: 0 }}>Active Backend</Tag>
          )}

          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          />

          {!record.is_active && (
            <Popconfirm
              title="Delete this configuration?"
              description="This will remove the configuration profile from Pimcore. Objects in the cloud bucket will not be deleted."
              onConfirm={() => handleDelete(record.id!)}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title="Configured Storage Profiles">
      <Table
        dataSource={configurations}
        rowKey="id"
        columns={columns}
        pagination={false}
      />
    </Card>
  );
};
