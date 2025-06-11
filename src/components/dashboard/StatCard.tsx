import React from 'react';
import { Box, Typography, Paper, alpha } from '@mui/material';
import { SvgIconComponent } from '@mui/icons-material';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: SvgIconComponent;
  trend: number;
  color: 'primary' | 'success' | 'warning' | 'info';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, color }) => {
  const getColorValue = (colorName: string) => {
    switch (colorName) {
      case 'primary':
        return '#1976d2';
      case 'success':
        return '#2e7d32';
      case 'warning':
        return '#ed6c02';
      case 'info':
        return '#0288d1';
      default:
        return '#1976d2';
    }
  };

  return (
    <Paper
      sx={{
        p: 3,
        height: '100%',
        position: 'relative',
        background: alpha(getColorValue(color), 0.05),
        backdropFilter: 'blur(6px)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          p: 1.5,
        }}
      >
        <Icon sx={{ color: getColorValue(color), fontSize: 24 }} />
      </Box>
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        {trend !== 0 && (
          <Typography
            variant="caption"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              color: trend > 0 ? 'success.main' : 'error.main',
            }}
          >
            {trend > 0 ? '+' : ''}{trend}%
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default StatCard; 