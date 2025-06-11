import React, { useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  Paper,
  Typography,
  Tooltip,
  IconButton,
  useTheme,
} from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  LabelList,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { dashboardAPI, type SurveyStats } from '../../services/apiService';

interface SurveyStatsProps {
  workspaceId?: string;
}

interface ChartData {
  name: string;
  fullTitle: string;
  workspace: string;
  target: number;
  completed: number;
  rate: number;
  status: string;
}

export function SurveyStats({ workspaceId }: SurveyStatsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SurveyStats[]>([]);
  const theme = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getSurveyStats({ workspace_id: workspaceId });
        setStats(response);
        setError(null);
      } catch (err) {
        console.error('설문 통계 데이터 로드 실패:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workspaceId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress size={40} sx={{ color: '#6366f1' }} />
      </Box>
    );
  }

  if (error || !stats.length) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 6,
          borderRadius: 3,
          border: '1px solid #f1f5f9',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
        }}
      >
        <Typography variant="body1" color="text.secondary">
          {error || '아직 생성된 설문이 없습니다.'}
        </Typography>
      </Paper>
    );
  }

  // 차트 데이터 준비
  const chartData: ChartData[] = stats.map(survey => ({
    name: survey.title.length > 20 ? survey.title.substring(0, 20) + '...' : survey.title,
    fullTitle: survey.title,
    workspace: survey.workspace_title,
    target: survey.target,
    completed: survey.completed_count,
    rate: survey.achievement_rate,
    status: survey.status.toLowerCase()
  }));

  // 상태별 색상 설정
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4E7AEF'; // 토스 메인 블루
      case 'draft':
        return '#E4E9F2'; // 토스 그레이
      case 'closed':
        return '#F45B69'; // 토스 레드
      default:
        return '#E4E9F2';
    }
  };

  return (
    <Box
      sx={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(247,249,255,0.6) 100%)',
        borderRadius: 4,
        p: 4,
        border: '1px solid #F2F4F6'
      }}
    >
      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <Typography 
          variant="h6" 
          sx={{ 
            color: '#191F28', 
            fontWeight: 700,
            fontSize: '1.25rem',
            letterSpacing: '-0.02em'
          }}
        >
          설문별 참여율
        </Typography>
        <Tooltip title="각 설문의 목표 응답 수 대비 실제 응답률을 보여줍니다">
          <IconButton size="small">
            <InfoOutlined sx={{ fontSize: 16, color: '#8B95A1' }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Box height={300}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            barSize={32}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#F2F4F6" 
              vertical={false}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: 13, 
                fill: '#4E5968',
                fontWeight: 500,
                letterSpacing: '-0.02em'
              }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={({ x, y, payload }) => {
                const value = payload.value;
                const isHighlight = value === 100;
                return (
                  <g transform={`translate(${x},${y})`}>
                    {/* 배경 블록 */}
                    {isHighlight && (
                      <rect
                        x={-44}
                        y={-12}
                        width={40}
                        height={24}
                        rx={6}
                        fill="#4E7AEF"
                        fillOpacity={0.08}
                      />
                    )}
                    {/* 수치 */}
                    <text
                      x={-24}
                      y={0}
                      dy={4}
                      textAnchor="end"
                      fill={isHighlight ? '#4E7AEF' : '#191F28'}
                      style={{
                        fontSize: '13px',
                        fontWeight: isHighlight ? 700 : 600,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {value}
                    </text>
                    {/* % 기호 */}
                    <text
                      x={-8}
                      y={0}
                      dy={4}
                      textAnchor="end"
                      fill={isHighlight ? '#4E7AEF' : '#4E5968'}
                      style={{
                        fontSize: '13px',
                        fontWeight: isHighlight ? 700 : 600,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      %
                    </text>
                  </g>
                );
              }}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickMargin={12}
              width={50}
            />
            <Bar
              dataKey="rate"
              radius={[6, 6, 0, 0]}
              background={{ 
                fill: '#F7F9FF',
                radius: 6
              }}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getStatusColor(entry.status)}
                  fillOpacity={1}
                />
              ))}
              <LabelList
                dataKey="rate"
                position="top"
                formatter={(value: number) => `${value}%`}
                style={{ 
                  fontSize: '13px', 
                  fill: '#4E5968',
                  fontWeight: 600,
                  letterSpacing: '-0.02em'
                }}
              />
            </Bar>
            <RechartsTooltip
              cursor={{ fill: 'rgba(78, 122, 239, 0.1)' }}
              wrapperStyle={{ outline: 'none' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as ChartData;
                  return (
                    <div
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #F2F4F6',
                        borderRadius: '16px',
                        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.08)',
                        padding: '16px',
                        fontSize: '14px',
                        letterSpacing: '-0.02em'
                      }}
                    >
                      <p style={{ 
                        margin: '0 0 12px', 
                        fontWeight: 700, 
                        color: '#191F28',
                        fontSize: '15px'
                      }}>
                        {data.fullTitle}
                      </p>
                      <p style={{ 
                        margin: '0 0 8px', 
                        color: '#4E5968',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '24px'
                      }}>
                        <span>워크스페이스</span>
                        <span style={{ fontWeight: 600 }}>{data.workspace}</span>
                      </p>
                      <p style={{ 
                        margin: '0 0 8px', 
                        color: '#4E5968',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '24px'
                      }}>
                        <span>대상 인원</span>
                        <span style={{ fontWeight: 600 }}>{data.target}명</span>
                      </p>
                      <p style={{ 
                        margin: '0 0 8px', 
                        color: '#4E5968',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '24px'
                      }}>
                        <span>완료 인원</span>
                        <span style={{ fontWeight: 600 }}>{data.completed}명</span>
                      </p>
                      <p style={{ 
                        margin: '0', 
                        color: '#191F28',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '24px',
                        fontWeight: 700,
                        fontSize: '15px'
                      }}>
                        <span>달성률</span>
                        <span>{data.rate}%</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
} 