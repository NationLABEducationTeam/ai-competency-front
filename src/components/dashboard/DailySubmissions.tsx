import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Paper,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  CalendarToday,
  BarChart,
  InfoOutlined,
  Timeline,
} from '@mui/icons-material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import S3Service, { SurveyResponse } from '../../services/s3Service';
import { workspaceAPI } from '../../services/apiService';
import { format, subDays, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { surveyAPI } from '../../services/apiService';

interface DailySubmissionsProps {
  workspaceId?: string;
}

interface DailyTrend {
  submission_date: string;
  total_submissions: number;
  unique_respondents: number;
  completed_submissions: number;
}

const DailySubmissions: React.FC<DailySubmissionsProps> = ({ workspaceId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allResponses, setAllResponses] = useState<SurveyResponse[]>([]);
  const [activeWorkspaces, setActiveWorkspaces] = useState<string[]>([]);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);

  // S3 데이터를 일별로 집계하는 함수
  const processDailyData = (responses: SurveyResponse[], days: number): DailyTrend[] => {
    if (!responses.length) return [];

    // 최근 N일간의 날짜 범위 생성
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);

    // 날짜별로 데이터 그룹화
    const groupedData: { [key: string]: SurveyResponse[] } = {};

    // 빈 날짜들도 포함하여 초기화
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      groupedData[dateKey] = [];
    }

    // 응답 데이터를 날짜별로 분류
    responses.forEach(response => {
      const responseDate = new Date(response.submittedAt);
      const dateKey = responseDate.toISOString().split('T')[0];
      
      // 지정된 기간 내의 데이터만 포함
      if (responseDate >= startDate && responseDate <= endDate) {
        if (!groupedData[dateKey]) {
          groupedData[dateKey] = [];
        }
        groupedData[dateKey].push(response);
      }
    });

    // 날짜순으로 정렬하고 데이터 변환
    const sortedKeys = Object.keys(groupedData).sort();
    
    return sortedKeys.map(dateKey => {
      const dayResponses = groupedData[dateKey];
      const uniqueRespondents = new Set(dayResponses.map(r => r.studentInfo.email)).size;
      
      return {
        submission_date: dateKey,
        total_submissions: dayResponses.length,
        unique_respondents: uniqueRespondents,
        completed_submissions: dayResponses.length, // S3에 저장된 것은 모두 완료된 것
      };
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('📊 일별 설문 제출 현황 데이터 로드 시작');
        
        // 활성 워크스페이스 목록 가져오기
        const workspaces = await workspaceAPI.getAll();
        const activeWorkspaceNames = workspaces.map(w => w.title);
        setActiveWorkspaces(activeWorkspaceNames);
        console.log('📊 활성 워크스페이스:', activeWorkspaceNames);
        
        // S3에서 모든 응답 데이터 가져오기
        const responses = await S3Service.listAllReports();
        console.log('📊 로드된 전체 응답 수:', responses.length);
        
        // 활성 설문 목록 가져오기
        const surveys = await surveyAPI.getAll();
        const activeSurveyIds = surveys.filter(s => s.status === 'active').map(s => s.id);

        // 활성 워크스페이스의 응답 + 활성 설문 응답만 필터링
        const filteredResponses = responses.filter(response => 
          activeWorkspaceNames.includes(response.workspaceName) &&
          (!response.surveyId || activeSurveyIds.includes(response.surveyId))
        );
        console.log('📊 활성 워크스페이스+설문 응답 수:', filteredResponses.length);
        
        setAllResponses(filteredResponses);
        setError(null);
      } catch (err: any) {
        console.error('일별 설문 제출 현황 데이터 로드 실패:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchDailyData = async () => {
      try {
        console.log('📅 S3에서 일별 제출 현황 데이터 로드 시작');
        
        // 일별로 데이터 집계
        const processedData = processDailyData(allResponses, period);
        console.log('📅 처리된 일별 데이터:', processedData);
        
        setDailyTrend(processedData);
        setError(null);
      } catch (err: any) {
        console.error('일별 제출 현황 데이터 로드 실패:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      }
    };

    fetchDailyData();
  }, [allResponses, period]);

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

  if (!dailyTrend.length) {
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
        <BarChart sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
        <Typography
          variant="h6"
          sx={{ color: '#64748b', fontWeight: 600, mb: 1 }}
        >
          일별 제출 현황
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

  // 통계 계산
  const totalSubmissions = dailyTrend.reduce((sum, item) => sum + item.total_submissions, 0);
  const avgDaily = totalSubmissions / period;
  const maxDaily = Math.max(...dailyTrend.map(item => item.total_submissions));

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
              background: 'linear-gradient(135deg, #10b98120 0%, #10b98110 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CalendarToday sx={{ color: '#10b981', fontSize: 20 }} />
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
              일별 제출 현황
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#94a3b8',
                fontSize: '12px'
              }}
            >
              일평균 {avgDaily.toFixed(1)}개 • 최대 {maxDaily}개
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
                borderColor: '#10b981',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#10b981',
              },
            }
          }}
        >
          <InputLabel sx={{ fontSize: '14px' }}>기간</InputLabel>
          <Select
            value={period}
            label="기간"
            onChange={(e: SelectChangeEvent<7 | 30 | 90>) => setPeriod(e.target.value as 7 | 30 | 90)}
            sx={{ fontSize: '14px' }}
          >
            <MenuItem value={7} sx={{ fontSize: '14px' }}>최근 7일</MenuItem>
            <MenuItem value={30} sx={{ fontSize: '14px' }}>최근 30일</MenuItem>
            <MenuItem value={90} sx={{ fontSize: '14px' }}>최근 90일</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Box height={300}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dailyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="submission_date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={(date: string) => new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
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
            <Area
              type="monotone"
              dataKey="total_submissions"
              name="전체 제출"
              stackId="1"
              stroke="#6366f1"
              fill="url(#colorTotal)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="completed_submissions"
              name="완료된 제출"
              stackId="2"
              stroke="#10b981"
              fill="url(#colorCompleted)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="unique_respondents"
              name="고유 응답자"
              stackId="3"
              stroke="#f59e0b"
              fill="url(#colorUnique)"
              strokeWidth={2}
            />
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default DailySubmissions; 