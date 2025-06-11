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
  Tooltip as MuiTooltip,
  IconButton,
} from '@mui/material';
import {
  CalendarToday,
  BarChart as BarChartIcon,
  InfoOutlined,
  Timeline,
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
import { workspaceAPI } from '../../services/apiService';
import { format, parseISO, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { surveyAPI } from '../../services/apiService';
import { dashboardAPI, type TimeStats } from '../../services/apiService';

interface SubmissionTrendProps {
  workspaceId?: string;
}

interface SubmissionData {
  date: string;
  count: number;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <Paper sx={{ p: 1 }}>
        <Typography variant="body2">
          {format(parseISO(label), 'PPP', { locale: ko })}
        </Typography>
        <Typography variant="body2" color="primary">
          제출 수: {payload[0].value}
        </Typography>
      </Paper>
    );
  }
  return null;
};

const SubmissionTrend: React.FC<SubmissionTrendProps> = ({ workspaceId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SubmissionData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getTimeStats({
          workspace_id: workspaceId,
          days: 30
        });

        // API 응답을 SubmissionData 형식으로 변환
        const submissionsByDate = response.reduce<{ [key: string]: number }>((acc, item) => {
          const date = format(startOfDay(parseISO(item.timestamp)), 'yyyy-MM-dd');
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});

        // 날짜별로 정렬된 SubmissionData 배열 생성
        const submissionData: SubmissionData[] = Object.entries(submissionsByDate)
          .map(([date, count]) => ({
            date,
            count
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        setData(submissionData);
        setError(null);
      } catch (err) {
        console.error('설문 제출 추이 데이터 로드 실패:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workspaceId]);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'M.d', { locale: ko });
    } catch (e) {
      return dateString;
    }
  };

  const calculateYAxisDomain = (data: SubmissionData[]) => {
    const maxCount = Math.max(...data.map(item => item.count));
    // 최대값이 10 이하면 10을 최대값으로, 그 이상이면 가장 가까운 10의 배수로 올림
    const maxDomain = maxCount <= 10 ? 10 : Math.ceil(maxCount / 10) * 10;
    return [0, maxDomain];
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress size={40} sx={{ color: '#6366f1' }} />
      </Box>
    );
  }

  if (error || !data.length) {
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
          {error || '아직 제출된 설문이 없습니다.'}
        </Typography>
      </Paper>
    );
  }

  return (
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#94a3b8"
            interval="preserveStartEnd"
            minTickGap={50}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            stroke="#94a3b8"
            tickFormatter={(value) => value.toFixed(0)}
            domain={calculateYAxisDomain(data)}
            allowDecimals={false}
            tick={{ fontSize: 12 }}
            width={35}
          />
          <Tooltip
            labelFormatter={(value) => format(parseISO(value), 'PPP', { locale: ko })}
            content={CustomTooltip}
            cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="count"
            name="제출 수"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#colorCount)"
            dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#818cf8' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SubmissionTrend; 