import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Grid, Chip, Divider, 
  CircularProgress, Card, CardContent, Table, 
  TableHead, TableRow, TableCell, TableBody, 
  TableContainer, Button, Alert, Tabs, Tab
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { Report, ReportEvent, HttpRequest, reportService } from '../../services/reportService';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 严重程度颜色映射
const severityColorMap: Record<string, string> = {
  'high': 'error',
  'medium': 'warning',
  'low': 'info',
};

// 状态颜色映射
const statusColorMap: Record<string, string> = {
  'active': 'error',
  'resolved': 'success',
  'ignored': 'default',
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// 标签面板组件
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ReportDetail: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState<number>(0);
  const navigate = useNavigate();

  // 获取报告详情
  useEffect(() => {
    const fetchReportDetail = async () => {
      if (!reportId) return;
      
      try {
        setLoading(true);
        const reportData = await reportService.getReportDetail(reportId, true);
        setReport(reportData);
      } catch (err) {
        setError('获取报告详情失败，请稍后重试');
        console.error('获取报告详情失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportDetail();
  }, [reportId]);

  // 处理标签变化
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 更新事件状态
  const handleUpdateEventStatus = async (eventId: number, status: 'active' | 'resolved' | 'ignored') => {
    try {
      await reportService.updateEventStatus(eventId, status);
      
      // 更新本地状态
      if (report && report.events) {
        const updatedEvents = report.events.map(event => 
          event.id === eventId ? { ...event, status } : event
        );
        
        setReport({
          ...report,
          events: updatedEvents
        });
      }
    } catch (err) {
      console.error('更新事件状态失败:', err);
    }
  };

  // 导出报告
  const handleExportReport = async () => {
    if (!reportId) return;
    
    try {
      const exportData = await reportService.exportReport(reportId);
      // 处理导出数据...
      console.log('报告已导出:', exportData);
    } catch (err) {
      console.error('导出报告失败:', err);
    }
  };

  // 返回报告列表
  const handleBack = () => {
    navigate('/reports');
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
    } catch (error) {
      return '无效日期';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !report) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error">{error || '报告不存在或已被删除'}</Alert>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={handleBack}>
          返回报告列表
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">
          报告详情: {report.title}
        </Typography>
        <Box>
          <Button variant="outlined" onClick={handleBack} sx={{ mr: 1 }}>
            返回
          </Button>
          <Button variant="contained" onClick={handleExportReport}>
            导出报告
          </Button>
        </Box>
      </Box>
      
      {/* 概览卡片 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>报告概览</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">报告ID</Typography>
              <Typography variant="body1">{report.id}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">分析类型</Typography>
              <Typography variant="body1">{report.reportType}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">状态</Typography>
              <Chip 
                label={
                  report.status === 'pending' ? '等待中' : 
                  report.status === 'processing' ? '处理中' : 
                  report.status === 'completed' ? '已完成' : '失败'
                } 
                color={
                  report.status === 'pending' ? 'warning' : 
                  report.status === 'processing' ? 'info' : 
                  report.status === 'completed' ? 'success' : 'error'
                }
                size="small"
              />
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">创建时间</Typography>
              <Typography variant="body1">{formatDate(report.createdAt)}</Typography>
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle1" gutterBottom>安全概况</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" align="center" color="primary">
                  {report.security?.score || 'N/A'}
                </Typography>
                <Typography variant="body2" align="center" color="text.secondary">
                  安全评分
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" align="center" color="error">
                  {report.security?.highSeverityEvents || 0}
                </Typography>
                <Typography variant="body2" align="center" color="text.secondary">
                  高危事件
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" align="center" color="warning.main">
                  {report.security?.mediumSeverityEvents || 0}
                </Typography>
                <Typography variant="body2" align="center" color="text.secondary">
                  中危事件
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" align="center" color="info.main">
                  {report.security?.lowSeverityEvents || 0}
                </Typography>
                <Typography variant="body2" align="center" color="text.secondary">
                  低危事件
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
      
      {/* 详细数据标签页 */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="报告详情标签页">
            <Tab label="安全事件" id="report-tab-0" aria-controls="report-tabpanel-0" />
            <Tab label="HTTP请求" id="report-tab-1" aria-controls="report-tabpanel-1" />
            <Tab label="流量统计" id="report-tab-2" aria-controls="report-tabpanel-2" />
          </Tabs>
        </Box>
        
        {/* 安全事件标签页 */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>安全事件列表</Typography>
          {report.events && report.events.length > 0 ? (
            <TableContainer>
              <Table aria-label="安全事件表格">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>事件类型</TableCell>
                    <TableCell>严重程度</TableCell>
                    <TableCell>源IP</TableCell>
                    <TableCell>目标IP</TableCell>
                    <TableCell>描述</TableCell>
                    <TableCell>时间</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.events.map((event: ReportEvent) => (
                    <TableRow key={event.id} hover>
                      <TableCell>{event.id}</TableCell>
                      <TableCell>{event.eventType}</TableCell>
                      <TableCell>
                        <Chip 
                          label={
                            event.severity === 'high' ? '高' : 
                            event.severity === 'medium' ? '中' : '低'
                          } 
                          color={severityColorMap[event.severity] as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{event.sourceIp}</TableCell>
                      <TableCell>{event.targetIp || 'N/A'}</TableCell>
                      <TableCell>{event.description}</TableCell>
                      <TableCell>{formatDate(event.timestamp)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={
                            event.status === 'active' ? '活跃' : 
                            event.status === 'resolved' ? '已解决' : '已忽略'
                          } 
                          color={statusColorMap[event.status] as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {event.status === 'active' ? (
                          <>
                            <Button 
                              size="small" 
                              color="success" 
                              onClick={() => handleUpdateEventStatus(event.id, 'resolved')}
                              sx={{ mr: 1 }}
                            >
                              标记解决
                            </Button>
                            <Button 
                              size="small" 
                              color="info" 
                              onClick={() => handleUpdateEventStatus(event.id, 'ignored')}
                            >
                              忽略
                            </Button>
                          </>
                        ) : (
                          <Button 
                            size="small" 
                            color="warning" 
                            onClick={() => handleUpdateEventStatus(event.id, 'active')}
                          >
                            重新打开
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">未检测到安全事件</Alert>
          )}
        </TabPanel>
        
        {/* HTTP请求标签页 */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>HTTP请求列表</Typography>
          {report.httpRequests && report.httpRequests.length > 0 ? (
            <TableContainer>
              <Table aria-label="HTTP请求表格">
                <TableHead>
                  <TableRow>
                    <TableCell>URL</TableCell>
                    <TableCell>方法</TableCell>
                    <TableCell>状态码</TableCell>
                    <TableCell>内容类型</TableCell>
                    <TableCell>响应大小</TableCell>
                    <TableCell>持续时间(ms)</TableCell>
                    <TableCell>时间</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.httpRequests.map((request: HttpRequest) => (
                    <TableRow key={request.id} hover>
                      <TableCell>{request.url}</TableCell>
                      <TableCell>{request.method}</TableCell>
                      <TableCell>
                        <Chip 
                          label={request.statusCode} 
                          color={
                            request.statusCode < 300 ? 'success' : 
                            request.statusCode < 400 ? 'info' : 
                            request.statusCode < 500 ? 'warning' : 'error'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{request.contentType || 'N/A'}</TableCell>
                      <TableCell>{request.size} bytes</TableCell>
                      <TableCell>{request.duration} ms</TableCell>
                      <TableCell>{formatDate(request.timestamp)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">无HTTP请求数据</Alert>
          )}
        </TabPanel>
        
        {/* 流量统计标签页 */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>流量统计数据</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" align="center">
                    {report.metrics?.totalPackets || 0}
                  </Typography>
                  <Typography variant="body2" align="center" color="text.secondary">
                    总数据包
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" align="center">
                    {report.metrics?.totalConnections || 0}
                  </Typography>
                  <Typography variant="body2" align="center" color="text.secondary">
                    总连接数
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" align="center">
                    {report.metrics?.uniqueIps || 0}
                  </Typography>
                  <Typography variant="body2" align="center" color="text.secondary">
                    唯一IP数
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" align="center">
                    {report.metrics?.averageLatency || 0} ms
                  </Typography>
                  <Typography variant="body2" align="center" color="text.secondary">
                    平均延迟
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" align="center">
                    {report.metrics?.packetLoss || 0}%
                  </Typography>
                  <Typography variant="body2" align="center" color="text.secondary">
                    丢包率
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" align="center">
                    {report.metrics?.errorRate || 0}%
                  </Typography>
                  <Typography variant="body2" align="center" color="text.secondary">
                    错误率
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default ReportDetail; 