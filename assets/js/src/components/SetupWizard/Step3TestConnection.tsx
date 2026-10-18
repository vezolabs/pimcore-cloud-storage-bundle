import React, { useState } from 'react';
import { Button, Card, Typography, Alert, Space, Table, Tag } from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  SyncOutlined,
  SafetyOutlined,
  ArrowLeftOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { CloudStorageApi } from '../../services/api';
import { ConnectionTestResult } from '../../types';

const { Title, Paragraph, Text } = Typography;

interface Props {
  formData: any;
  testResult: ConnectionTestResult | null;
  onTestComplete: (result: ConnectionTestResult) => void;
  onBackToConfig?: () => void;
}

export const Step3TestConnection: React.FC<Props> = ({
  formData,
  testResult,
  onTestComplete,
  onBackToConfig,
}) => {
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setTesting(true);
    setError(null);
    try {
      const result = await CloudStorageApi.testDraftConfiguration(formData);
      onTestComplete(result);
    } catch (e: any) {
      const errMsg = e.message || 'Connection test failed to execute.';
      setError(errMsg);
      onTestComplete({
        success: false,
        message: errMsg,
        latency_ms: 0,
        details: e.details ? { validation_errors: e.details } : undefined,
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
          step:
            key === 'initialize_client'
              ? 'Initialize SDK Client'
              : key === 'write_permission'
              ? 'Upload Test Probe (Write)'
              : key === 'read_permission'
              ? 'Read Back Object (Read)'
              : key === 'delete_permission'
              ? 'Clean Up Object (Delete)'
              : key,
          status: val.status,
          description: val.description,
          duration: `${val.duration_ms} ms`,
        }))
    : [];

  const validationErrors = testResult?.details?.validation_errors;

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: '0 0 8px 0', color: '#1e293b' }}>
          Verify Storage Permissions
        </Title>
        <Paragraph type="secondary" style={{ fontSize: 14 }}>
          Pimcore will execute live write, read, and delete probes against your target bucket to guarantee full operational reliability before saving.
        </Paragraph>
      </div>

      {/* TARGET SUMMARY CARD */}
      <Card style={{ textAlign: 'center', padding: '16px 0', marginBottom: 20, borderRadius: 8 }}>
        <Space direction="vertical" size={16} align="center">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#f0f5ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1677ff',
              fontSize: 28,
            }}
          >
            <SafetyOutlined />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
              <Text strong style={{ fontSize: 17, color: '#0f172a' }}>
                Target: {formData.bucket_or_container || 'Not specified'}
              </Text>
              <Tag color="blue">{formData.provider?.toUpperCase()}</Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Region / Project: {formData.region_or_project || 'Default'} | Auth: {formData.auth_type?.replace(/_/g, ' ').toUpperCase()}
              {formData.path_prefix ? ` | Prefix: /${formData.path_prefix}` : ''}
            </Text>
          </div>

          <Button
            type="primary"
            size="large"
            icon={testing ? <SyncOutlined spin /> : <ThunderboltOutlined />}
            loading={testing}
            onClick={runTest}
            style={{ minWidth: 220, height: 44, borderRadius: 6, fontWeight: 600 }}
          >
            {testing ? 'Testing Live Operations...' : 'Run Live Connection Test'}
          </Button>
        </Space>
      </Card>

      {/* ERROR ALERT */}
      {error && !validationErrors && (
        <Alert
          type="error"
          showIcon
          message="Connection Test Error"
          description={error}
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      {/* VALIDATION ERRORS ALERT */}
      {validationErrors && (
        <Alert
          type="warning"
          showIcon
          icon={<InfoCircleOutlined />}
          message="Configuration Incomplete / Validation Errors"
          description={
            <div style={{ marginTop: 8 }}>
              <Paragraph style={{ margin: '0 0 8px 0', fontSize: 13 }}>
                The storage service could not be contacted because one or more required settings are missing or formatted incorrectly:
              </Paragraph>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {Object.entries(validationErrors).map(([field, msg]: [string, any]) => (
                  <li key={field} style={{ marginBottom: 4 }}>
                    <Text strong code>{field}</Text>: {String(msg)}
                  </li>
                ))}
              </ul>
              {onBackToConfig && (
                <div style={{ marginTop: 12 }}>
                  <Button size="small" icon={<ArrowLeftOutlined />} onClick={onBackToConfig}>
                    Back to Connection Details to Fix
                  </Button>
                </div>
              )}
            </div>
          }
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      {/* TEST RESULT CARD */}
      {testResult && (
        <Card
          title={
            <Space>
              {testResult.success ? (
                <CheckCircleFilled style={{ color: '#52c41a', fontSize: 18 }} />
              ) : (
                <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 18 }} />
              )}
              <Text strong style={{ fontSize: 15 }}>
                {testResult.success ? 'Storage Connection & Permissions Verified' : 'Connection Test Unsuccessful'}
              </Text>
            </Space>
          }
          extra={
            testResult.latency_ms > 0 ? (
              <Tag color="cyan">Latency: {testResult.latency_ms} ms</Tag>
            ) : null
          }
          style={{ marginBottom: 20, borderRadius: 8 }}
        >
          <Alert
            type={testResult.success ? 'success' : 'error'}
            message={testResult.message}
            showIcon
            style={{ marginBottom: 16, borderRadius: 6 }}
          />

          {tableData.length > 0 && (
            <Table
              dataSource={tableData}
              pagination={false}
              size="middle"
              bordered
              columns={[
                {
                  title: 'Operation Probe',
                  dataIndex: 'step',
                  key: 'step',
                  render: (text) => <Text strong>{text}</Text>,
                },
                {
                  title: 'Result',
                  dataIndex: 'status',
                  key: 'status',
                  width: 120,
                  render: (status) => (
                    <Tag color={status === 'passed' ? 'success' : 'error'}>
                      {status === 'passed' ? 'PASSED' : 'FAILED'}
                    </Tag>
                  ),
                },
                { title: 'Details', dataIndex: 'description', key: 'description' },
                {
                  title: 'Latency',
                  dataIndex: 'duration',
                  key: 'duration',
                  width: 100,
                  render: (dur) => <Text code>{dur}</Text>,
                },
              ]}
            />
          )}

          {testResult.details?.failure && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 6 }}>
              <Text type="danger" strong>Technical Diagnostic: </Text>
              <Text code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {testResult.details.failure.sanitized_error}
              </Text>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
