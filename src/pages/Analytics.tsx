import React from 'react';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { Box, Container, Typography } from '@mui/material';

const Analytics: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Marketplace Analytics
        </Typography>
        <AnalyticsDashboard />
      </Box>
    </Container>
  );
};

export default Analytics;
