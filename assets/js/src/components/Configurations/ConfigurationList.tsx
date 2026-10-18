import React, { useState } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Popconfirm,
  Typography,
  Tooltip,
  Card,
  message,
} from 'antd';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ThunderboltOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  SyncOutlined,
  SwapOutlined,
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
      message.success('Configuration profile removed.');
      onRefresh();
    } catch (e: any) {
      message.error(e.message || 'Delete failed');
    }
  };

  const columns = [
    {
      title: 'Configuration Profile',
      key: 'name',
      width: 220,
      render: (_: any, record: StorageConfiguration) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text strong style={{ fontSize: 14 }}>{record.display_name}</Text>
            {record.is_active && <Tag color="green">ACTIVE</Tag>}
          </div>
          <Text code style={{ fontSize: 11, color: '#64748b' }}>{record.name}</Text>
        </div>
      ),
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      key: 'provider',
      width: 130,
      render: (provider: string) => {
        const color = provider === 's3' ? 'orange' : provider === 'azure' ? 'blue' : provider === 'gcs' ? 'purple' : 'default';
        return <Tag color={color} style={{ fontWeight: 600 }}>{provider.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Bucket / Container',
      dataIndex: 'bucket_or_container',
      key: 'bucket',
      width: 200,
      render: (val: string, record: StorageConfiguration) => (
        <div>
          <Text code strong>{val || 'N/A'}</Text>
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
      width: 160,
      render: (_: any, record: StorageConfiguration) => (
        <div>
          {record.region_or_project && <Tag>{record.region_or_project}</Tag>}
          {record.endpoint && (
            <div style={{ marginTop: 2 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>{record.endpoint}</Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Health Status',
      key: 'status',
      width: 140,
      render: (_: any, record: StorageConfiguration) => {
        const isTested = record.last_test_status === 'success';
        const isFailed = record.last_test_status === 'failed';
        return (
          <div>
            {isTested && <Tag icon={<CheckCircleFilled />} color="success">Verified</Tag>}
            {isFailed && <Tag icon={<CloseCircleFilled />} color="error">Failed</Tag>}
            {!isTested && !isFailed && <Tag color="default">Not Tested</Tag>}
            {record.last_tested_at && (
              <div style={{ marginTop: 2 }}>
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
      width: 240,
      fixed: 'right' as const,
      render: (_: any, record: StorageConfiguration) => (
        <Space size={6} wrap>
          <Tooltip title="Run live connection probe">
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
              description={`New asset uploads will be routed to ${record.display_name}. Existing files can be migrated with the Migration Assistant.`}
              onConfirm={() => handleActivate(record.id!)}
              okText="Activate"
            >
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                loading={activatingId === record.id}
                style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
              >
                Activate
              </Button>
            </Popconfirm>
          ) : (
            <Tag color="success" style={{ margin: 0 }}>Active</Tag>
          )}

          <Tooltip title="Migrate assets to this storage">
            <Button
              size="small"
              icon={<SwapOutlined />}
              onClick={() => onMigrateTo(record.id!)}
            >
              Migrate
            </Button>
          </Tooltip>

          <Tooltip title="Edit configuration">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            />
          </Tooltip>

          {!record.is_active && (
            <Popconfirm
              title="Delete this configuration profile?"
              description="This removes the configuration profile from Pimcore. Objects inside your cloud storage bucket are not deleted."
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
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Configured Storage Profiles</span>
          <Tag color="blue">{configurations.length}</Tag>
        </div>
      }
      style={{ borderRadius: 8 }}
    >
      <Table
        dataSource={configurations}
        rowKey="id"
        columns={columns}
        pagination={false}
        scroll={{ x: 920 }}
      />
    </Card>
  );
};
