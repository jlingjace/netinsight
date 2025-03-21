import React from 'react';
import { Box, Container, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ReportList from '../../components/Reports/ReportList';

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();

  // 跳转到生成报告页面
  const handleCreateReport = () => {
    navigate('/reports/generate');
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', my: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleCreateReport}
        >
          生成新报告
        </Button>
      </Box>
      <ReportList />
    </Container>
  );
};

export default ReportsPage; 