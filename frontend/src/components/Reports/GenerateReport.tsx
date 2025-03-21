import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, TextField, FormControl, 
  InputLabel, Select, MenuItem, FormHelperText, 
  Paper, Grid, CircularProgress, Snackbar, Alert
} from '@mui/material';
import { reportService } from '../../services/reportService';
import { fileService, FileInfo } from '../../services/fileService';
import { useNavigate } from 'react-router-dom';

// 使用新的FileInfo接口代替旧的File接口
// interface File {
//   id: string;
//   filename: string;
//   upload_date: string;
//   status: string;
//   file_type: string;
//   size: number;
//   user_id: string;
// }

// 不再需要FileResponse接口
// interface FileResponse {
//   items: File[];
//   total: number;
//   pages: number;
//   page: number;
//   per_page: number;
// }

const GenerateReport: React.FC = () => {
  const [title, setTitle] = useState<string>('');
  const [fileId, setFileId] = useState<string>('');
  const [reportType, setReportType] = useState<string>('comprehensive');
  const [loading, setLoading] = useState<boolean>(false);
  const [fileLoading, setFileLoading] = useState<boolean>(true);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const navigate = useNavigate();

  // 表单验证
  const [titleError, setTitleError] = useState<string>('');
  const [fileError, setFileError] = useState<string>('');

  // 获取文件列表
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setFileLoading(true);
        const response = await fileService.getFiles(1, 100);
        // 仅使用已处理完成的文件
        const processedFiles = response.filter(file => file.status === 'completed' || file.status === 'processed');
        setFiles(processedFiles);
      } catch (error) {
        console.error('获取文件列表失败:', error);
        setError('获取文件列表失败，请稍后重试');
      } finally {
        setFileLoading(false);
      }
    };

    fetchFiles();
  }, []);

  // 验证表单
  const validateForm = (): boolean => {
    let isValid = true;

    // 验证标题
    if (!title.trim()) {
      setTitleError('请输入报告标题');
      isValid = false;
    } else {
      setTitleError('');
    }

    // 验证文件
    if (!fileId) {
      setFileError('请选择要分析的文件');
      isValid = false;
    } else {
      setFileError('');
    }

    return isValid;
  };

  // 处理生成报告
  const handleGenerateReport = async () => {
    // 表单验证
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 调用生成报告API
      const result = await reportService.generateReport(fileId, reportType);
      
      // 生成成功，设置成功状态
      setSuccess(true);
      
      // 2秒后导航到报告列表
      setTimeout(() => {
        navigate('/reports');
      }, 2000);
      
    } catch (err) {
      console.error('生成报告失败:', err);
      setError('生成报告失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理关闭提示
  const handleCloseSnackbar = () => {
    setSuccess(false);
    setError(null);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', mt: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        生成网络分析报告
      </Typography>
      
      <Paper sx={{ p: 3, mt: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="报告标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={!!titleError}
              helperText={titleError}
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth error={!!fileError} required disabled={loading || fileLoading}>
              <InputLabel id="file-select-label">选择文件</InputLabel>
              <Select
                labelId="file-select-label"
                value={fileId}
                label="选择文件"
                onChange={(e) => setFileId(String(e.target.value))}
              >
                {fileLoading ? (
                  <MenuItem disabled>加载中...</MenuItem>
                ) : files.length > 0 ? (
                  files.map((file) => (
                    <MenuItem key={file.id} value={file.id}>
                      {file.filename} ({file.fileType})
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>没有可用的文件</MenuItem>
                )}
              </Select>
              {fileError && <FormHelperText>{fileError}</FormHelperText>}
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth disabled={loading}>
              <InputLabel id="report-type-label">分析类型</InputLabel>
              <Select
                labelId="report-type-label"
                value={reportType}
                label="分析类型"
                onChange={(e) => setReportType(e.target.value)}
              >
                <MenuItem value="comprehensive">综合分析</MenuItem>
                <MenuItem value="security">安全分析</MenuItem>
                <MenuItem value="performance">性能分析</MenuItem>
                <MenuItem value="traffic">流量分析</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              onClick={handleGenerateReport}
              disabled={loading || fileLoading}
              startIcon={loading && <CircularProgress size={20} color="inherit" />}
            >
              {loading ? '生成中...' : '生成报告'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* 成功/错误提示 */}
      <Snackbar open={success || !!error} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={success ? "success" : "error"} 
          sx={{ width: '100%' }}
        >
          {success ? '报告生成任务已提交，正在处理中...' : error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GenerateReport; 