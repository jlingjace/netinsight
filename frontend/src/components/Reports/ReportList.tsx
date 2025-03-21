import React, { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Button, Typography, Box, Chip, TablePagination, CircularProgress
} from '@mui/material';
import { Report, PaginatedResponse, reportService } from '../../services/reportService';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 状态颜色映射
const statusColorMap: Record<string, string> = {
  'pending': 'warning',
  'processing': 'info',
  'completed': 'success',
  'failed': 'error',
};

const ReportList: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const navigate = useNavigate();

  // 获取报告列表
  const fetchReports = async () => {
    try {
      setLoading(true);
      const response: PaginatedResponse<Report> = await reportService.getReports(page + 1, rowsPerPage);
      setReports(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('获取报告列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取报告列表
  useEffect(() => {
    fetchReports();
  }, [page, rowsPerPage]);

  // 处理页面变化
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // 处理每页行数变化
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 查看报告详情
  const viewReportDetail = (reportId: string) => {
    navigate(`/reports/${reportId}`);
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
    } catch (error) {
      return '无效日期';
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          网络分析报告
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="报告列表">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>标题</TableCell>
                  <TableCell>分析类型</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>安全评分</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell>完成时间</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.length > 0 ? (
                  reports.map((report) => (
                    <TableRow key={report.id} hover>
                      <TableCell>{report.id}</TableCell>
                      <TableCell>{report.title}</TableCell>
                      <TableCell>{report.reportType}</TableCell>
                      <TableCell>
                        <Chip 
                          label={
                            report.status === 'pending' ? '等待中' : 
                            report.status === 'processing' ? '处理中' : 
                            report.status === 'completed' ? '已完成' : '失败'
                          } 
                          color={statusColorMap[report.status] as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {report.status === 'completed' ? report.security?.score || 'N/A' : 'N/A'}
                      </TableCell>
                      <TableCell>{formatDate(report.createdAt)}</TableCell>
                      <TableCell>
                        {report.completedAt ? formatDate(report.completedAt) : '未完成'}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outlined" 
                          size="small" 
                          onClick={() => viewReportDetail(report.id)}
                          disabled={report.status !== 'completed'}
                        >
                          查看详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      暂无报告数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="每页行数:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count}`}
          />
        </>
      )}
    </Box>
  );
};

export default ReportList; 