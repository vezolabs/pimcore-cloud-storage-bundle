import React, { useState } from 'react';
import { Button, Card, Typography, Alert, Space, Table, Spin, Result } from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  SyncOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { CloudStorageApi } from '../../services/api';
import { ConnectionTestResult } from '../../types';

const { Title, Paragraph, Text } = Typography;

interface Props {
  formData: any;
  testResult: ConnectionTestResult | null;
  onTestComplete: (result: ConnectionTestResult) => void;
}

export const Step3TestConnection: React.FC<Props> = ({ formData, testResult, onTestComplete }) => {
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setTesting(true);
    setError(null);
    try {
      const result = await CloudStorageApi.testDraftConfiguration(formData);
      onTestComplete(result);
    } catch (e: any) {
      setError(e.message || 'Connection test failed to execute.');
      onTestComplete({
        success: false,
        message: e.message || 'Connection test failed to execute.',
        latency_ms: 0,
      });
    } finally {
      setTesting(false);
    }
  };

  const tableData = testResult?.details
    ? Object.entries(testResult.details)
        .filter(([key]) => key !== 'failure' && key !== 'validation_errors')
        .map(([key, val]: [string, any]) => ({
          key,
          step: key === 'initialize_client' ? 'Initialize SDK Client' :
                key === 'write_permission' ? 'Upload Test Object (Write)' :
                key === 'read_permission' ? 'Read Back Object (Read)' :
                key === 'delete_permission' ? 'Clean Up Object (Delete)' : key,
          status: val.status,
          description: val.description,
          duration: `${val.duration_ms} ms`,
        }))
    : [];

  return (
    <div style={{ maxWidth: 750, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={4}>Verify Storage Permissions</Title>
        <Paragraph type="secondary">
          Pimcore will test live read, write, and delete permissions on your target bucket to guarantee operational reliability before anything is stored.
        </Paragraph>
      </div>

      <Card style={{ textAlign: 'center', padding: '16px 0', marginBottom: 24 }}>
        <Space direction="vertical" size={16} align="center">
          <div style={{ fontSize: 44, color: '#1677ff' }}>
            <SafetyOutlined />
          </div>
          <div>
            <Text strong style={{ fontSize: 16 }}>
              Target: {formData.bucket_or_container || 'Not configured'}
            </Text>
            <br />
            <Text type="secondary">
              Provider: {formData.provider?.toUpperCase()} | Region/Project: {formData.region_or_project || 'Default'}
            </Text>
          </div>

          <Button
            type="primary"
            size="large"
            icon={testing ? <SyncOutlined spin /> : <ThunderboltOutlined />}
            loading={testing}
            onClick={runTest}
            style={{ minWidth: 200, height: 44, borderRadius: 6 }}
          >
            {testing ? 'Testing Operations...' : 'Test Live Connection'}
          </Button>
        </Space>
      </Card>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Connection Test Error"
          description={error}
          style={{ marginBottom: 20 }}
        />
      )}

      {testResult && (
        <Card
          title={
            <Space>
              {testResult.success ? (
                <CheckCircleFilled style={{ color: '#52c41a', fontSize: 18 }} />
              ) : (
                <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 18 }} />
              )}
              <Text strong>{testResult.success ? 'All Operations Verified' : 'Test Unsuccessful'}</Text>
            </Space>
          }
          extra={<Text type="secondary">Latency: {testResult.latency_ms} ms</Text>}
          style={{ marginBottom: 20 }}
        >
          <Alert
            type={testResult.success ? 'success' : 'error'}
            message={testResult.message}
            showIcon
            style={{ marginBottom: 16 }}
          />

          {tableData.length > 0 && (
            <Table
              dataSource={tableData}
              pagination={false}
              size="small"
              columns={[
                { title: 'Operation Step', dataIndex: 'step', key: 'step' },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status) => (
                    <span style={{ color: status === 'passed' ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>
                      {status === 'passed' ? 'PASSED' : 'FAILED'}
                    </span>
                  ),
                },
                { title: 'Description', dataIndex: 'description', key: 'description' },
                { title: 'Latency', dataIndex: 'duration', key: 'duration' },
              ]}
            />
          )}

          {testResult.details?.failure && (
            <div style={{ marginTop: 16 }}>
              <Text type="danger" strong>Details: </Text>
              <Text code>{testResult.details.failure.sanitized_error}</Text>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
