import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';

const ThankYou: React.FC = () => {
  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: 4
    }}>
      <Container maxWidth="sm">
        <Paper sx={{ 
          p: 6, 
          textAlign: 'center',
          borderRadius: 4,
          boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
        }}>
          <CheckCircle sx={{ fontSize: 100, color: '#48bb78', mb: 3 }} />
          
          <Typography variant="h3" sx={{ 
            fontWeight: 800, 
            mb: 2,
            background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            감사합니다!
          </Typography>
          
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            mb: 2,
            color: '#2d3748'
          }}>
            설문이 성공적으로 제출되었습니다
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ 
            mb: 4,
            fontSize: '1.1rem',
            lineHeight: 1.6
          }}>
            AI 분석 결과는 입력하신 이메일로 발송될 예정입니다.
          </Typography>
          
          <Typography variant="caption" color="text.secondary">
            이 창은 안전하게 닫으셔도 됩니다.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default ThankYou; 