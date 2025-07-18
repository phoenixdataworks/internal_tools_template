'use client';

import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Alert, CircularProgress } from '@mui/material';
import {
  Storage as StorageIcon,
  QueryStats as QueryIcon,
  TrendingUp as PlanningIcon,
  Assessment as ResultsIcon,
} from '@mui/icons-material';
import { DataSourceManager, DataSource } from '../data-warehouse/DataSourceManager';
import { QueryEditor, Query, QueryExecution } from '../data-warehouse/QueryEditor';
import {
  PlanningModelBuilder,
  PlanningModel,
  ModelExecution,
} from '../planning/PlanningModelBuilder';
import { ResultsViewer } from '../data-warehouse/ResultsViewer';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface InternalToolsDashboardProps {
  isLoading?: boolean;
  error?: string;
}

export function InternalToolsDashboard({ isLoading = false, error }: InternalToolsDashboardProps) {
  const [tabValue, setTabValue] = useState(0);

  // Mock data - in real implementation, these would come from API calls
  const [dataSources, setDataSources] = useState<DataSource[]>([
    {
      id: '1',
      name: 'Production Snowflake',
      type: 'snowflake',
      connection_config: { account: 'company.snowflakecomputing.com', warehouse: 'COMPUTE_WH' },
      is_active: true,
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      name: 'Analytics BigQuery',
      type: 'bigquery',
      connection_config: { project_id: 'analytics-project', dataset: 'analytics' },
      is_active: true,
      created_at: '2024-01-20T14:30:00Z',
    },
  ]);

  const [queries, setQueries] = useState<Query[]>([
    {
      id: '1',
      name: 'Monthly Revenue Report',
      description: 'Aggregates monthly revenue by product and region',
      query_text: 'SELECT product, region, SUM(revenue) FROM sales GROUP BY product, region',
      data_source_id: '1',
      parameters: { year: 2024 },
      created_at: '2024-01-25T09:00:00Z',
    },
    {
      id: '2',
      name: 'Customer Retention Analysis',
      description: 'Analyzes customer retention rates over time',
      query_text: 'SELECT cohort_month, retention_rate FROM customer_retention WHERE year = :year',
      data_source_id: '2',
      parameters: { year: 2024 },
      created_at: '2024-01-26T11:00:00Z',
    },
  ]);

  const [queryExecutions, setQueryExecutions] = useState<QueryExecution[]>([
    {
      id: '1',
      query_id: '1',
      status: 'completed',
      result_data: [
        { product: 'Product A', region: 'North', revenue: 50000 },
        { product: 'Product B', region: 'South', revenue: 75000 },
      ],
      execution_time_ms: 1250,
      created_at: '2024-01-27T10:00:00Z',
    },
  ]);

  const [models, setModels] = useState<PlanningModel[]>([
    {
      id: '1',
      name: 'Revenue Forecast',
      description: '12-month revenue forecasting model',
      model_type: 'forecast',
      model_config: { period: 'monthly', horizon: 12, confidence_level: 0.95 },
      created_at: '2024-01-28T08:00:00Z',
    },
    {
      id: '2',
      name: 'Budget Scenario Analysis',
      description: 'What-if analysis for budget planning',
      model_type: 'scenario',
      model_config: { scenarios: ['optimistic', 'pessimistic', 'baseline'] },
      created_at: '2024-01-29T15:00:00Z',
    },
  ]);

  const [modelExecutions, setModelExecutions] = useState<ModelExecution[]>([
    {
      id: '1',
      model_id: '1',
      status: 'completed',
      result_data: {
        forecast: [
          { month: '2024-02', revenue: 120000 },
          { month: '2024-03', revenue: 135000 },
        ],
        confidence_interval: { lower: 110000, upper: 150000 },
      },
      execution_time_ms: 5000,
      created_at: '2024-01-30T09:00:00Z',
    },
  ]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Data Source Handlers
  const handleDataSourceCreate = async (dataSource: Omit<DataSource, 'id' | 'created_at'>) => {
    const newDataSource: DataSource = {
      ...dataSource,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    };
    setDataSources(prev => [...prev, newDataSource]);
  };

  const handleDataSourceUpdate = async (id: string, updates: Partial<DataSource>) => {
    setDataSources(prev => prev.map(ds => (ds.id === id ? { ...ds, ...updates } : ds)));
  };

  const handleDataSourceDelete = async (id: string) => {
    setDataSources(prev => prev.filter(ds => ds.id !== id));
  };

  const handleDataSourceToggle = async (id: string, isActive: boolean) => {
    setDataSources(prev => prev.map(ds => (ds.id === id ? { ...ds, is_active: isActive } : ds)));
  };

  const handleDataSourceTest = async (id: string) => {
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, message: 'Connection successful' };
  };

  // Query Handlers
  const handleQueryCreate = async (query: Omit<Query, 'id' | 'created_at'>) => {
    const newQuery: Query = {
      ...query,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    };
    setQueries(prev => [...prev, newQuery]);
  };

  const handleQueryUpdate = async (id: string, updates: Partial<Query>) => {
    setQueries(prev => prev.map(q => (q.id === id ? { ...q, ...updates } : q)));
  };

  const handleQueryDelete = async (id: string) => {
    setQueries(prev => prev.filter(q => q.id !== id));
  };

  const handleQueryExecute = async (queryId: string, parameters?: Record<string, any>) => {
    const execution: QueryExecution = {
      id: Date.now().toString(),
      query_id: queryId,
      status: 'running',
      result_data: null,
      execution_time_ms: 0,
      created_at: new Date().toISOString(),
    };

    setQueryExecutions(prev => [execution, ...prev]);

    // Simulate execution
    await new Promise(resolve => setTimeout(resolve, 2000));

    const updatedExecution: QueryExecution = {
      ...execution,
      status: 'completed',
      result_data: [
        { column1: 'value1', column2: 'value2' },
        { column1: 'value3', column2: 'value4' },
      ],
      execution_time_ms: 1500,
    };

    setQueryExecutions(prev => prev.map(ex => (ex.id === execution.id ? updatedExecution : ex)));
    return updatedExecution;
  };

  // Model Handlers
  const handleModelCreate = async (model: Omit<PlanningModel, 'id' | 'created_at'>) => {
    const newModel: PlanningModel = {
      ...model,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    };
    setModels(prev => [...prev, newModel]);
  };

  const handleModelUpdate = async (id: string, updates: Partial<PlanningModel>) => {
    setModels(prev => prev.map(m => (m.id === id ? { ...m, ...updates } : m)));
  };

  const handleModelDelete = async (id: string) => {
    setModels(prev => prev.filter(m => m.id !== id));
  };

  const handleModelExecute = async (modelId: string) => {
    const execution: ModelExecution = {
      id: Date.now().toString(),
      model_id: modelId,
      status: 'running',
      result_data: null,
      execution_time_ms: 0,
      created_at: new Date().toISOString(),
    };

    setModelExecutions(prev => [execution, ...prev]);

    // Simulate execution
    await new Promise(resolve => setTimeout(resolve, 3000));

    const updatedExecution: ModelExecution = {
      ...execution,
      status: 'completed',
      result_data: {
        forecast: [
          { period: '2024-02', value: 100000 },
          { period: '2024-03', value: 110000 },
        ],
        metrics: { accuracy: 0.85, confidence: 0.95 },
      },
      execution_time_ms: 3000,
    };

    setModelExecutions(prev => prev.map(ex => (ex.id === execution.id ? updatedExecution : ex)));
    return updatedExecution;
  };

  // Results Handlers
  const handleRefreshResults = () => {
    // In real implementation, this would refetch data
    console.log('Refreshing results...');
  };

  const handleDownloadResults = (executionId: string, format: 'csv' | 'json') => {
    console.log(`Downloading execution ${executionId} as ${format}`);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Internal Tools Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage data sources, run analytics queries, and execute planning models
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<StorageIcon />} label="Data Sources" />
          <Tab icon={<QueryIcon />} label="Analytics" />
          <Tab icon={<PlanningIcon />} label="Planning" />
          <Tab icon={<ResultsIcon />} label="Results" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <DataSourceManager
          dataSources={dataSources}
          onDataSourceCreate={handleDataSourceCreate}
          onDataSourceUpdate={handleDataSourceUpdate}
          onDataSourceDelete={handleDataSourceDelete}
          onDataSourceToggle={handleDataSourceToggle}
          onDataSourceTest={handleDataSourceTest}
          isLoading={isLoading}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <QueryEditor
          queries={queries}
          executions={queryExecutions}
          dataSources={dataSources.map(ds => ({ id: ds.id, name: ds.name, type: ds.type }))}
          onQueryCreate={handleQueryCreate}
          onQueryUpdate={handleQueryUpdate}
          onQueryDelete={handleQueryDelete}
          onQueryExecute={handleQueryExecute}
          isLoading={isLoading}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <PlanningModelBuilder
          models={models}
          executions={modelExecutions}
          onModelCreate={handleModelCreate}
          onModelUpdate={handleModelUpdate}
          onModelDelete={handleModelDelete}
          onModelExecute={handleModelExecute}
          isLoading={isLoading}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <ResultsViewer
          queryExecutions={queryExecutions}
          modelExecutions={modelExecutions}
          onRefresh={handleRefreshResults}
          onDownload={handleDownloadResults}
          isLoading={isLoading}
        />
      </TabPanel>
    </Box>
  );
}
