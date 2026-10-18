import React, { useState, useEffect } from 'react';
import { Drawer, Table, Tag, Typography, Tabs, Card, Space, Button, Alert } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, WarningFilled, SyncOutlined, HistoryOutlined } from '@ant-design/icons';
import { CloudStorageApi } from '../../services/api';
import { SystemDiagnostics, ConfigAuditLog } from '../../types';

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
}

export const DiagnosticsDrawer: React.FC<Props> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [history, setHistory] = useState<ConfigAuditLog[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [diag, hist] = await Promise.all([
        CloudStorageApi.getDiagnostics(),
        CloudStorageApi.getHistory(),
      ]);
      setDiagnostics(diag);
      setHistory(hist);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const checksData = diagnostics?.checks
    ? Object.entries(diagnostics.checks).map(([key, item]) => ({
        key,
        name: item.name,
        status: item.status,
        value: item.value,
        message: item.message,
      }))
    : [];

  const checkColumns = [
    { title: 'Diagnostic Check', dataIndex: 'name', key: 'name' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        if (status === 'ok') return <Tag icon={<CheckCircleFilled />} color="success">OK</Tag>;
        if (status === 'warning') return <Tag icon={<WarningFilled />} color="warning">WARNING</Tag>;
        return <Tag icon={<CloseCircleFilled />} color="error">ERROR</Tag>;
      },
    },
    { title: 'Detected Value', dataIndex: 'value', key: 'value' },
    { title: 'Notice / Detail', dataIndex: 'message', key: 'message' },
  ];

  const historyColumns = [
    {
      title: 'Timestamp',
      dataIndex: 'created_at',
      key: 'time',
      render: (t: string) => new Date(t).toLocaleString(),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (act: string) => {
        const color = act === 'ACTIVATE' ? 'green' : act === 'CREATE' ? 'blue' : act === 'DELETE' ? 'red' : 'default';
        return <Tag color={color}>{act}</Tag>;
      },
    },
    { title: 'Configuration', dataIndex: 'config_name', key: 'name' },
    { title: 'Admin User', dataIndex: 'changed_by', key: 'user' },
    { title: 'Note', dataIndex: 'note', key: 'note' },
  ];

  return (
    <Drawer
      title="Cloud Storage Diagnostics & History"
      placement="right"
      width={700}
      onClose={onClose}
      open={open}
      extra={
        <Button icon={<SyncOutlined spin={loading} />} onClick={loadData}>
          Refresh
        </Button>
      }
    >
      <Tabs
        items={[
          {
            key: 'diagnostics',
            label: 'System Environment',
            children: (
              <div>
                {diagnostics && (
                  <Alert
                    type={diagnostics.status === 'healthy' ? 'success' : diagnostics.status === 'warning' ? 'warning' : 'error'}
                    message={diagnostics.summary}
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}
                <Table
                  dataSource={checksData}
                  columns={checkColumns}
                  pagination={false}
                  size="small"
                />
              </div>
            ),
          },
          {
            key: 'history',
            label: 'Audit History',
            children: (
              <div>
                <Table
                  dataSource={history}
                  rowKey="id"
                  columns={historyColumns}
                  pagination={{ pageSize: 10 }}
                  size="small"
                />
              </div>
            ),
          },
        ]}
      />
    </Drawer>
  );
};
