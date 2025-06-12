import React, { useEffect, useState, useMemo } from 'react';
import {
  Typography,
  Box,
  CircularProgress,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
} from 'recharts';
import { format, parseISO, startOfDay, startOfHour } from 'date-fns';
import { ko } from 'date-fns/locale';
import { dashboardAPI, type TimeStats } from '../../services/apiService';

interface DailySubmissionsProps {
  workspaceId?: string;
}

interface ChartData {
  date: string;
  count: number;
}

type Granularity = 'day' | 'hour';
type TimeWindow = '1d' | '7d' | '30d';

const CustomTooltip = ({ active, payload, label, granularity }: TooltipProps<number, string> & { granularity: Granularity }) => {
  if (active && payload && payload.length) {
    const formatString = granularity === 'day' ? 'PPP' : 'PPP p';
    return (
      <Paper sx={{ p: 1, backdropFilter: 'blur(6px)', backgroundColor: 'rgba(255,255,255,0.8)' }}>
        <Typography variant="body2">
          {format(parseISO(label), formatString, { locale: ko })}
        </Typography>
        <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
          제출 수: {payload[0].value}
        </Typography>
      </Paper>
    );
  }
  return null;
};

const DailySubmissions: React.FC<DailySubmissionsProps> = ({ workspaceId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<TimeStats[]>([]);
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30d');

  useEffect(() => {
    const daysMap: Record<TimeWindow, number> = { '1d': 1, '7d': 7, '30d': 30 };
    const days = daysMap[timeWindow];

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getTimeStats({
          workspace_id: workspaceId,
          days: days,
        });
        setRawData(response);
        setError(null);
      } catch (err) {
        console.error('제출 현황 데이터 로드 실패:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workspaceId, timeWindow]);

  // 시간 범위 변경 시, 적절한 단위로 자동 변경
  useEffect(() => {
    if (timeWindow === '1d') {
      setGranularity('hour');
    } else if (timeWindow === '30d') {
      setGranularity('day');
    }
  }, [timeWindow]);

  const chartData = useMemo((): ChartData[] => {
    if (!rawData.length) return [];

    const submissionsByTime = rawData.reduce<{ [key: string]: number }>((acc, item) => {
      const dateKey = granularity === 'hour'
        ? format(startOfHour(parseISO(item.timestamp)), "yyyy-MM-dd'T'HH:mm:ss")
        : format(startOfDay(parseISO(item.timestamp)), "yyyy-MM-dd'T'HH:mm:ss");
      
      acc[dateKey] = (acc[dateKey] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(submissionsByTime)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rawData, granularity]);

  const formatXAxisTick = (dateString: string) => {
    try {
      const formatString = granularity === 'day' ? 'M.d' : 'd일 HH시';
      return format(parseISO(dateString), formatString, { locale: ko });
    } catch (e) {
      return dateString;
    }
  };

  const calculateYAxisDomain = (data: ChartData[]) => {
    const maxCount = Math.max(0, ...data.map(item => item.count));
    const maxDomain = maxCount < 5 ? 5 : Math.ceil(maxCount / 5) * 5;
    return [0, maxDomain];
  };

  const handleGranularityChange = (
    event: React.MouseEvent<HTMLElement>,
    newGranularity: Granularity | null,
  ) => {
    if (newGranularity !== null) {
      setGranularity(newGranularity);
    }
  };
  
  const handleTimeWindowChange = (
    event: React.MouseEvent<HTMLElement>,
    newTimeWindow: TimeWindow | null,
  ) => {
    if (newTimeWindow !== null) {
      setTimeWindow(newTimeWindow);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={340}>
        <CircularProgress size={40} sx={{ color: '#6366f1' }} />
      </Box>
    );
  }

  if (error || !chartData.length) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 6, borderRadius: 3, border: '1px solid #f1f5f9', textAlign: 'center',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          minHeight: 340, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}
      >
        <Typography variant="body1" color="text.secondary">
          {error || '아직 제출된 설문이 없습니다.'}
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Box display="flex" justifyContent="flex-end" mb={2} gap={2}>
        <ToggleButtonGroup
          value={timeWindow}
          exclusive
          onChange={handleTimeWindowChange}
          aria-label="기간 선택"
          size="small"
        >
          <ToggleButton value="1d" aria-label="1일">1일</ToggleButton>
          <ToggleButton value="7d" aria-label="7일">7일</ToggleButton>
          <ToggleButton value="30d" aria-label="30일">30일</ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          value={granularity}
          exclusive
          onChange={handleGranularityChange}
          aria-label="단위 선택"
          size="small"
        >
          <ToggleButton value="day" aria-label="일별 보기" disabled={timeWindow === '1d'}>일별</ToggleButton>
          <ToggleButton value="hour" aria-label="시간별 보기" disabled={timeWindow === '30d'}>시간별</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxisTick}
              stroke="#94a3b8"
              interval="preserveStartEnd"
              minTickGap={granularity === 'day' ? 50 : 30}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              stroke="#94a3b8"
              tickFormatter={(value) => value.toFixed(0)}
              domain={calculateYAxisDomain(chartData)}
              allowDecimals={false}
              tick={{ fontSize: 12 }}
              width={35}
            />
            <Tooltip
              content={<CustomTooltip granularity={granularity} />}
              cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
            />
            <Area type="monotone" dataKey="count" name="제출 수" stroke="#8b5cf6" fill="url(#colorDaily)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

export default DailySubmissions; 