import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Tooltip,
  IconButton,
} from '@mui/material';
import { Timeline, TrendingUp, InfoOutlined, AccessTime } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import S3Service, { SurveyResponse } from '../../services/s3Service';
import { workspaceAPI, surveyAPI } from '../../services/apiService';
import { format, subHours, subDays, subWeeks, subMonths, startOfHour, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';

interface SubmissionTrendProps {
  workspaceId?: string;
}

interface TrendData {
  time_period: string;
  total_submissions: number;
  unique_respondents: number;
  completed_submissions: number;
}

type TimeWindow = 'hour' | 'day' | 'week' | 'month';

const SubmissionTrend: React.FC<SubmissionTrendProps> = ({ workspaceId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allResponses, setAllResponses] = useState<SurveyResponse[]>([]);
  const [activeWorkspaces, setActiveWorkspaces] = useState<string[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('day');

  // S3 데이터를 시간대별로 집계하는 함수
  const processTimeData = (responses: SurveyResponse[], timeWindow: TimeWindow): TrendData[] => {
    if (!responses.length) return [];

    const groupedData: { [key: string]: SurveyResponse[] } = {};

    responses.forEach(response => {
      const date = new Date(response.submittedAt);
      let key: string;

      switch (timeWindow) {
        case 'hour':
          // 시간별: YYYY-MM-DD HH
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
          break;
        case 'day':
          // 일별: YYYY-MM-DD
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          break;
        case 'week':
          // 주별: YYYY-WW
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))).padStart(2, '0')}`;
          break;
        case 'month':
          // 월별: YYYY-MM
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(response);
    });

    // 시간순으로 정렬하고 데이터 변환
    const sortedKeys = Object.keys(groupedData).sort();
    
    return sortedKeys.map(key => {
      const groupResponses = groupedData[key];
      const uniqueRespondents = new Set(groupResponses.map(r => r.studentInfo.email)).size;
      
      return {
        time_period: formatTimePeriod(key, timeWindow),
        total_submissions: groupResponses.length,
        unique_respondents: uniqueRespondents,
        completed_submissions: groupResponses.length, // S3에 저장된 것은 모두 완료된 것
      };
    });
  };

  // 시간 표시 형식 변환
  const formatTimePeriod = (key: string, timeWindow: TimeWindow): string => {
    switch (timeWindow) {
      case 'hour':
        const [datePart, timePart] = key.split(' ');
        const date = new Date(datePart);
        return `${date.getMonth() + 1}/${date.getDate()} ${timePart}`;
      case 'day':
        const dayDate = new Date(key);
        return `${dayDate.getMonth() + 1}/${dayDate.getDate()}`;
      case 'week':
        return key.replace('W', '주 ');
      case 'month':
        const [year, month] = key.split('-');
        return `${year}년 ${month}월`;
      default:
        return key;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('📊 시간대별 설문 제출 추이 데이터 로드 시작');
        
        // 활성 워크스페이스 목록 가져오기
        const workspaces = await workspaceAPI.getAll();
        const activeWorkspaceNames = workspaces.map(w => w.title);
        setActiveWorkspaces(activeWorkspaceNames);
        console.log('📊 활성 워크스페이스:', activeWorkspaceNames);
        
        // 활성 설문 목록 가져오기
        const surveys = await surveyAPI.getAll();
        const activeSurveyIds = surveys.filter(s => s.status === 'active').map(s => s.id);
        
        // S3에서 모든 응답 데이터 가져오기
        const responses = await S3Service.listAllReports();
        console.log('📊 로드된 전체 응답 수:', responses.length);
        
        // 활성 워크스페이스의 응답 + 활성 설문 응답만 필터링
        const filteredResponses = responses.filter(response => 
          activeWorkspaceNames.includes(response.workspaceName) &&
          (!response.surveyId || activeSurveyIds.includes(response.surveyId))
        );
        console.log('📊 활성 워크스페이스+설문 응답 수:', filteredResponses.length);
        
        setAllResponses(filteredResponses);
        setError(null);
      } catch (err: any) {
        console.error('시간대별 설문 제출 추이 데이터 로드 실패:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        setLoading(true);
        console.log('📈 S3에서 시간대별 제출 추이 데이터 로드 시작');
        
        // 시간대별로 데이터 집계
        const processedData = processTimeData(allResponses, timeWindow);
        console.log('📈 처리된 시간대별 데이터:', processedData);
        
        setTrendData(processedData);
        setError(null);
      } catch (err: any) {
        console.error('시간대별 제출 추이 데이터 로드 실패:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchTrendData();
  }, [allResponses, timeWindow]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress size={40} sx={{ color: '#6366f1' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Typography color="error" sx={{ fontSize: '14px', fontWeight: 500 }}>{error}</Typography>
      </Box>
    );
  }

  if (!trendData.length) {
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
        <Timeline sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
        <Typography
          variant="h6"
          sx={{ color: '#64748b', fontWeight: 600, mb: 1 }}
        >
          시간대별 설문 제출 추이
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: '#94a3b8' }}
        >
          아직 제출된 설문이 없습니다
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        borderRadius: 3,
        border: '1px solid #f1f5f9',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: '0 8px 25px rgba(99, 102, 241, 0.1)',
        }
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #6366f120 0%, #6366f110 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <TrendingUp sx={{ color: '#6366f1', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: '#1e293b',
                fontSize: '18px'
              }}
            >
              시간대별 설문 제출 추이
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#94a3b8',
                fontSize: '12px'
              }}
            >
              총 {trendData.reduce((sum, item) => sum + item.total_submissions, 0)}개 응답
            </Typography>
          </Box>
        </Box>
        <FormControl 
          size="small" 
          sx={{ 
            minWidth: 120,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '& fieldset': {
                borderColor: '#e2e8f0',
              },
              '&:hover fieldset': {
                borderColor: '#6366f1',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#6366f1',
              },
            }
          }}
        >
          <InputLabel sx={{ fontSize: '14px' }}>시간 단위</InputLabel>
          <Select
            value={timeWindow}
            label="시간 단위"
            onChange={(e) => setTimeWindow(e.target.value as TimeWindow)}
            sx={{ fontSize: '14px' }}
          >
            <MenuItem value="hour" sx={{ fontSize: '14px' }}>시간별</MenuItem>
            <MenuItem value="day" sx={{ fontSize: '14px' }}>일별</MenuItem>
            <MenuItem value="week" sx={{ fontSize: '14px' }}>주별</MenuItem>
            <MenuItem value="month" sx={{ fontSize: '14px' }}>월별</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Box height={300}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="time_period" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
            />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      fontSize: '14px',
                      padding: '12px'
                    }}>
                      <p style={{ margin: 0, marginBottom: '8px', fontWeight: 600 }}>{label}</p>
                      {payload.map((entry, index) => (
                        <p key={index} style={{ margin: 0, color: entry.color }}>
                          {`${entry.name}: ${entry.value}개`}
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '14px' }}
            />
            <Line
              type="monotone"
              dataKey="total_submissions"
              name="전체 제출"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ fill: '#6366f1', strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8, stroke: '#6366f1', strokeWidth: 2, fill: '#ffffff' }}
            />
            <Line
              type="monotone"
              dataKey="unique_respondents"
              name="고유 응답자"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
            />
            <Line
              type="monotone"
              dataKey="completed_submissions"
              name="완료된 제출"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8, stroke: '#f59e0b', strokeWidth: 2, fill: '#ffffff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default SubmissionTrend; 