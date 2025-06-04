import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Paper,
  Tooltip,
  IconButton,
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  People, 
  CheckCircle, 
  Timer,
  Assessment,
  School,
  InfoOutlined 
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import S3Service, { SurveyResponse } from '../../services/s3Service';
import { workspaceAPI } from '../../services/apiService';
import { surveyAPI } from '../../services/apiService';

interface SubmissionOverviewProps {
  workspaceId?: string;
}

const SubmissionOverview: React.FC<SubmissionOverviewProps> = ({ workspaceId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allResponses, setAllResponses] = useState<SurveyResponse[]>([]);
  const [activeWorkspaces, setActiveWorkspaces] = useState<string[]>([]);
  const [surveyTargetCounts, setSurveyTargetCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('📊 설문 제출 현황 데이터 로드 시작');
        
        // 활성 워크스페이스 목록 가져오기
        const workspaces = await workspaceAPI.getAll();
        const activeWorkspaceNames = workspaces.map(w => w.title);
        setActiveWorkspaces(activeWorkspaceNames);
        console.log('📊 활성 워크스페이스:', activeWorkspaceNames);
        
        // 활성 설문 목록 가져오기
        const surveys = await surveyAPI.getAll();
        const activeSurveyIds = surveys.filter(s => s.status === 'active').map(s => s.id);
        // 워크스페이스별 최신 설문 대상 인원수 추출
        const targetCounts: Record<string, number> = {};
        for (const ws of workspaces) {
          // 해당 워크스페이스의 최신 설문 찾기
          const wsSurveys = surveys.filter(s => s.workspace_id === ws.id);
          if (wsSurveys.length > 0) {
            // 최신 설문(가장 최근 생성) 기준
            const latest = wsSurveys.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b);
            targetCounts[ws.title] = latest.target ?? 0;
          } else {
            targetCounts[ws.title] = 0;
          }
        }
        setSurveyTargetCounts(targetCounts);
        
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
        console.error('설문 제출 현황 데이터 로드 실패:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  if (!allResponses.length) {
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: '#1e293b',
              fontSize: '24px'
            }}
          >
            설문 제출 현황 개요
          </Typography>
          <Tooltip 
            title="전체 워크스페이스의 설문 제출 통계를 한눈에 확인할 수 있습니다"
            placement="top"
          >
            <IconButton size="small">
              <InfoOutlined sx={{ fontSize: 16, color: '#94a3b8' }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Paper
          elevation={0}
          sx={{
            p: 6,
            borderRadius: 3,
            border: '1px solid #f1f5f9',
            textAlign: 'center'
          }}
        >
          <Assessment sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
          <Typography
            variant="h6"
            sx={{ color: '#64748b', fontWeight: 600, mb: 1 }}
          >
            아직 제출된 설문이 없습니다
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: '#94a3b8' }}
          >
            설문이 제출되면 여기에 통계가 표시됩니다
          </Typography>
        </Paper>
      </Box>
    );
  }

  // 통계 계산
  const totalSubmissions = allResponses.length;
  const uniqueRespondents = new Set(allResponses.map(r => r.studentInfo.email)).size;
  const completionRate = 100; // S3에 저장된 것은 모두 완료된 것
  
  // 평균 점수 계산
  const avgScore = allResponses.reduce((sum, response) => {
    if (response.aiAnalysis?.overallScore) {
      return sum + response.aiAnalysis.overallScore;
    } else if (response.answers) {
      const scores = Object.values(response.answers) as number[];
      const responseAvg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return sum + responseAvg;
    }
    return sum;
  }, 0) / totalSubmissions;

  // 워크스페이스별 통계
  const workspaceStats = allResponses.reduce((acc, response) => {
    const workspace = response.workspaceName;
    if (!acc[workspace]) {
      acc[workspace] = {
        name: workspace,
        count: 0,
        uniqueUsers: new Set<string>(),
        totalScore: 0
      };
    }
    acc[workspace].count++;
    acc[workspace].uniqueUsers.add(response.studentInfo.email);
    
    // 점수 계산
    if (response.aiAnalysis?.overallScore) {
      acc[workspace].totalScore += response.aiAnalysis.overallScore;
    } else if (response.answers) {
      const scores = Object.values(response.answers) as number[];
      const responseAvg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      acc[workspace].totalScore += responseAvg;
    }
    
    return acc;
  }, {} as Record<string, { name: string; count: number; uniqueUsers: Set<string>; totalScore: number }>);

  // 차트 데이터 준비 (대상 인원수 vs 실제 제출)
  const chartData = Object.values(workspaceStats).map(stat => ({
    name: stat.name.length > 10 ? stat.name.substring(0, 10) + '...' : stat.name,
    target: surveyTargetCounts[stat.name] ?? 0, // 대상 인원수
    total: stat.count, // 실제 제출
  }));

  const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    description,
    icon: Icon, 
    trend, 
    trendValue, 
    color 
  }: {
    title: string;
    value: string | number;
    subtitle: string;
    description: string;
    icon: any;
    trend?: 'up' | 'down';
    trendValue?: string;
    color: string;
  }) => (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: '1px solid #f1f5f9',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px rgba(99, 102, 241, 0.1)',
          border: '1px solid #e2e8f0',
        }
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon sx={{ color, fontSize: 24 }} />
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          {trend && (
            <Box display="flex" alignItems="center" gap={0.5}>
              {trend === 'up' ? (
                <TrendingUp sx={{ color: '#10b981', fontSize: 16 }} />
              ) : (
                <TrendingDown sx={{ color: '#ef4444', fontSize: 16 }} />
              )}
              <Typography
                variant="caption"
                sx={{
                  color: trend === 'up' ? '#10b981' : '#ef4444',
                  fontWeight: 600,
                  fontSize: '12px'
                }}
              >
                {trendValue}
              </Typography>
            </Box>
          )}
          <Tooltip title={description} placement="top">
            <IconButton size="small">
              <InfoOutlined sx={{ fontSize: 14, color: '#94a3b8' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: '#1e293b',
          mb: 0.5,
          fontSize: '28px'
        }}
      >
        {value}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: '#64748b',
          fontWeight: 500,
          fontSize: '14px'
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: '#94a3b8',
          fontSize: '12px'
        }}
      >
        {subtitle}
      </Typography>
    </Paper>
  );

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: '#1e293b',
            fontSize: '24px'
          }}
        >
          설문 제출 현황 개요
        </Typography>
        <Tooltip 
          title="전체 워크스페이스의 설문 제출 통계를 한눈에 확인할 수 있습니다"
          placement="top"
        >
          <IconButton size="small">
            <InfoOutlined sx={{ fontSize: 16, color: '#94a3b8' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 통계 카드들 */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { 
            xs: '1fr', 
            sm: 'repeat(2, 1fr)', 
            md: 'repeat(4, 1fr)' 
          }, 
          gap: 3, 
          mb: 4 
        }}
      >
        <StatCard
          title="총 참여자"
          value={totalSubmissions.toLocaleString()}
          subtitle={`${uniqueRespondents}명의 고유 응답자`}
          description="전체 설문 제출 횟수입니다. 한 사람이 여러 번 제출하면 각각 카운트됩니다."
          icon={People}
          trend="up"
          trendValue="실시간"
          color="#6366f1"
        />
        <StatCard
          title="고유 응답자"
          value={uniqueRespondents.toLocaleString()}
          subtitle="실제 참여한 사람 수"
          description="실제로 설문에 참여한 고유한 사람의 수입니다. 이메일 기준으로 중복을 제거합니다."
          icon={People}
          trend="up"
          trendValue="활성"
          color="#06b6d4"
        />
        <StatCard
          title="완료율"
          value={`${completionRate.toFixed(1)}%`}
          subtitle="모든 응답 완료"
          description="설문을 끝까지 완료한 비율입니다. 중간에 포기한 응답은 저장되지 않아 항상 100%입니다."
          icon={CheckCircle}
          trend="up"
          trendValue="100%"
          color="#10b981"
        />
        <StatCard
          title="평균 점수"
          value={avgScore.toFixed(1)}
          subtitle="5점 만점 기준"
          description="모든 설문 응답의 평균 점수입니다. AI 분석 점수 또는 답변 점수의 평균값입니다."
          icon={Assessment}
          trend={avgScore >= 3.5 ? "up" : "down"}
          trendValue={avgScore >= 3.5 ? "양호" : "개선필요"}
          color="#f59e0b"
        />
      </Box>

      {/* 차트 */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
          border: '1px solid #f1f5f9',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
        }}
      >
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: '#1e293b',
              fontSize: '18px'
            }}
          >
            워크스페이스별 제출 현황
          </Typography>
          <Tooltip 
            title="각 워크스페이스별 전체 제출 수와 고유 응답자 수를 비교해서 볼 수 있습니다"
            placement="top"
          >
            <IconButton size="small">
              <InfoOutlined sx={{ fontSize: 14, color: '#94a3b8' }} />
            </IconButton>
          </Tooltip>
        </Box>
        
        {/* 범례 */}
        <Box display="flex" gap={3} mb={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box 
              sx={{ 
                width: 12, 
                height: 12, 
                borderRadius: 1, 
                backgroundColor: '#6366f1' 
              }} 
            />
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '12px' }}>
              대상 인원수
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Box 
              sx={{ 
                width: 12, 
                height: 12, 
                borderRadius: 1, 
                backgroundColor: '#06b6d4' 
              }} 
            />
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '12px' }}>
              실제 제출
            </Typography>
          </Box>
        </Box>
        
        <Box height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
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
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  fontSize: '14px'
                }}
                formatter={(value, name) => [
                  value,
                  name === 'target' ? '대상 인원수' : '실제 제출'
                ]}
              />
              <Bar dataKey="target" name="대상 인원수" radius={[8, 8, 0, 0]} fill="#6366f1" />
              <Bar dataKey="total" name="실제 제출" radius={[8, 8, 0, 0]} fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Box>
  );
};

export default SubmissionOverview; 