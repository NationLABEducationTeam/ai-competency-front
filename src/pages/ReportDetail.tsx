import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReportStore } from '../store/reportStore';
import { generateReportPDF } from '../utils/pdfGenerator';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Card,
  CardContent,
  Divider,
  Chip,
  LinearProgress,
  Avatar,
  Stack,
  Alert,
  Grid,
  Container,
  Fade,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Download,
  PictureAsPdf,
  Person,
  Email,
  School,
  Assessment,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Psychology,
  EmojiEvents,
  Warning,
  Speed,
  Star,
  AutoAwesome,
  Timeline,
} from '@mui/icons-material';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { SurveyResponse } from '../types';

const ReportDetail: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { getReportById } = useReportStore();
  
  const report = reportId ? getReportById(reportId) : null;

  const handleDownloadPDF = async () => {
    if (!report) return;
    
    try {
      await generateReportPDF(report);
    } catch (error) {
      console.error('PDF 생성 실패:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.0) return '#10b981';
    if (score >= 3.0) return '#3b82f6';
    if (score >= 2.0) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLevel = (score: number) => {
    if (score >= 4.0) return '우수';
    if (score >= 3.0) return '양호';
    if (score >= 2.0) return '보통';
    return '개선필요';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 4.0) return <EmojiEvents sx={{ color: '#10b981' }} />;
    if (score >= 3.0) return <TrendingUp sx={{ color: '#3b82f6' }} />;
    if (score >= 2.0) return <Timeline sx={{ color: '#f59e0b' }} />;
    return <Warning sx={{ color: '#ef4444' }} />;
  };

  if (!report) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ maxWidth: 400, mx: 'auto' }}>
          리포트를 찾을 수 없습니다.
        </Alert>
      </Container>
    );
  }

  // 차트 데이터 준비
  const radarData = report.categoryScores.map(category => ({
    category: category.category.replace(/\//g, '/\n'),
    score: category.score,
    maxScore: category.maxScore,
    percentage: category.percentage
  }));

  const pieData = report.categoryScores.map((category, index) => ({
    name: category.category,
    value: category.percentage,
    color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][index % 6]
  }));

  const barData = report.categoryScores.map(category => ({
    name: category.category.length > 10 ? category.category.substring(0, 10) + '...' : category.category,
    현재점수: category.score,
    만점: category.maxScore,
    percentage: category.percentage
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      py: 4
    }}>
      <Container maxWidth="lg">
      {/* 헤더 */}
        <Fade in timeout={800}>
          <Paper sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton 
              onClick={() => navigate(-1)}
                  sx={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    }
                  }}
            >
              <ArrowBack />
            </IconButton>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    🤖 AI 역량 진단 리포트
                  </Typography>
                  <Typography variant="subtitle1" sx={{ color: '#64748b' }}>
                    AI Competency Assessment Report
            </Typography>
                </Box>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<PictureAsPdf />}
            onClick={handleDownloadPDF}
            sx={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              textTransform: 'none',
              fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  boxShadow: '0 8px 25px rgba(239, 68, 68, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    boxShadow: '0 12px 35px rgba(239, 68, 68, 0.4)',
                  }
            }}
          >
            PDF 다운로드
          </Button>
        </Box>
          </Paper>
        </Fade>

        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, 
          gap: 4 
        }}>
          {/* 학생 정보 & 종합 점수 */}
          <Box>
            <Fade in timeout={1000}>
              <Stack spacing={3}>
                {/* 학생 정보 카드 */}
                <Card sx={{ 
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)',
                  border: '1px solid #e0e7ff',
                  boxShadow: '0 10px 25px rgba(102, 126, 234, 0.1)'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ 
                        width: 60, 
                        height: 60,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        fontSize: '24px',
                        fontWeight: 700,
                        mr: 2
          }}>
            {report.studentInfo.name.charAt(0)}
          </Avatar>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
              {report.studentInfo.name}
            </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          {report.studentInfo.organization}
            </Typography>
                      </Box>
                    </Box>
                    
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email sx={{ color: '#667eea', fontSize: 18 }} />
                        <Typography variant="body2" sx={{ color: '#475569' }}>
              {report.studentInfo.email}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <School sx={{ color: '#667eea', fontSize: 18 }} />
                        <Typography variant="body2" sx={{ color: '#475569' }}>
                          {report.studentInfo.major} · {report.studentInfo.education}
            </Typography>
        </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person sx={{ color: '#667eea', fontSize: 18 }} />
                        <Typography variant="body2" sx={{ color: '#475569' }}>
                          {report.studentInfo.age}세
                  </Typography>
                </Box>
                    </Stack>
                  </CardContent>
                </Card>

                {/* 종합 점수 카드 */}
                <Card sx={{ 
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  border: '1px solid #bae6fd',
                  boxShadow: '0 10px 25px rgba(14, 165, 233, 0.1)'
                }}>
                  <CardContent sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ 
                      color: '#0369a1', 
                fontWeight: 700, 
                mb: 2, 
                display: 'flex', 
                alignItems: 'center', 
                      justifyContent: 'center',
                      gap: 1
              }}>
                      <Speed />
                      종합 AI 역량 점수
              </Typography>
              
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h1" sx={{ 
                  fontWeight: 800,
                        color: getScoreColor(report.overallScore),
                        fontSize: '4rem',
                        lineHeight: 1
                }}>
                        {report.overallScore.toFixed(1)}
                </Typography>
                      <Typography variant="h6" sx={{ color: '#64748b', fontWeight: 500 }}>
                        / 5.0
                </Typography>
              </Box>
              
                    <Chip
                      icon={getScoreIcon(report.overallScore)}
                      label={getScoreLevel(report.overallScore)}
                      sx={{
                        backgroundColor: getScoreColor(report.overallScore),
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1rem',
                        px: 2,
                        py: 1,
                        height: 40
                      }}
                    />
                    
                    <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6 }}>
                        {report.overallScore >= 4.0 
                          ? '🌟 우수한 AI 역량을 보유하고 있습니다!'
                          : report.overallScore >= 3.0
                          ? '📈 양호한 AI 기초 역량을 갖추고 있습니다.'
                          : '🚀 AI 역량 개발의 기초 단계입니다.'
                        }
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Stack>
            </Fade>
          </Box>

          {/* 차트 섹션 */}
          <Box>
            <Fade in timeout={1200}>
              <Stack spacing={3}>
                {/* 레이더 차트 */}
                <Card sx={{ 
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
              }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 700, 
                      mb: 3,
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                      color: '#1e293b'
                    }}>
                      <AutoAwesome sx={{ color: '#667eea' }} />
                      역량 분포 차트
                    </Typography>
                    
                    <Box sx={{ height: 400 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis 
                            dataKey="category" 
                            tick={{ fontSize: 12, fill: '#64748b' }}
                          />
                          <PolarRadiusAxis 
                            angle={90} 
                            domain={[0, 5]} 
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                          />
                          <Radar
                            name="현재 점수"
                            dataKey="score"
                            stroke="#667eea"
                            fill="#667eea"
                            fillOpacity={0.3}
                            strokeWidth={3}
                          />
                          <Radar
                            name="만점"
                            dataKey="maxScore"
                            stroke="#e2e8f0"
                            fill="transparent"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                          />
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
              </Box>
                  </CardContent>
                </Card>

                {/* 막대 차트 & 도넛 차트 */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, 
                  gap: 3 
                }}>
                  <Card sx={{ 
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    height: '100%'
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ 
                fontWeight: 700, 
                        mb: 3,
                display: 'flex',
                alignItems: 'center',
                        gap: 1,
                        color: '#1e293b'
              }}>
                        <Assessment sx={{ color: '#667eea' }} />
                        카테고리별 상세 점수
              </Typography>

                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fontSize: 11, fill: '#64748b' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis 
                              tick={{ fontSize: 11, fill: '#64748b' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                        }}
                      />
                            <Bar dataKey="현재점수" fill="#667eea" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="만점" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                </Box>
                    </CardContent>
                  </Card>

                  <Card sx={{ 
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    height: '100%'
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ 
                        fontWeight: 700, 
                        mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                        gap: 1,
                        color: '#1e293b'
                  }}>
                        <Timeline sx={{ color: '#667eea' }} />
                        역량 비율
                  </Typography>
                      
                      <Box sx={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              formatter={(value) => [`${value}%`, '점수']}
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                        }}
                      />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </Stack>
            </Fade>
          </Box>
          </Box>

        {/* 카테고리별 상세 분석 */}
        <Box sx={{ mt: 4 }}>
          <Fade in timeout={1400}>
            <Card sx={{ 
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
            }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ 
                fontWeight: 700, 
                  mb: 4,
                display: 'flex',
                alignItems: 'center',
                  gap: 2,
                  color: '#1e293b'
              }}>
                  <Assessment sx={{ color: '#667eea', fontSize: 28 }} />
                  카테고리별 역량 상세 분석
              </Typography>

                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, 
                  gap: 3 
                }}>
                  {report.categoryScores.map((category, index) => (
                    <Paper key={index} sx={{ 
                      p: 3, 
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%)',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
                      }
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          color: '#1e293b',
                          fontSize: '1.1rem'
                        }}>
                          {category.category}
                            </Typography>
                        <Chip
                          label={`${category.percentage}%`}
                          sx={{
                            backgroundColor: getScoreColor(category.percentage / 20),
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                          }}
                        />
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                            <LinearProgress
                              variant="determinate"
                              value={category.percentage}
                              sx={{
                            height: 12,
                            borderRadius: 6,
                                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: getScoreColor(category.percentage / 20),
                              borderRadius: 6,
                                }
                              }}
                            />
                          </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                          {category.score} / {category.maxScore} 점
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {getScoreIcon(category.percentage / 20)}
                          <Typography variant="body2" sx={{ 
                            color: getScoreColor(category.percentage / 20),
                            fontWeight: 600
                          }}>
                            {category.percentage >= 80 ? '우수' : 
                             category.percentage >= 60 ? '양호' : 
                             category.percentage >= 40 ? '보통' : '개선필요'}
                          </Typography>
                        </Box>
                      </Box>
            </Paper>
                  ))}
          </Box>
              </CardContent>
            </Card>
          </Fade>
        </Box>

        {/* AI 분석 결과 */}
        {report.aiAnalysis && (
          <Box sx={{ mt: 4 }}>
            <Fade in timeout={1600}>
              <Card sx={{ 
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
              }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" sx={{ 
              fontWeight: 700, 
                    mb: 4,
              display: 'flex', 
              alignItems: 'center', 
                    gap: 2,
                    color: '#1e293b'
            }}>
                    <Psychology sx={{ color: '#667eea', fontSize: 28 }} />
                    AI 분석 결과 및 추천
            </Typography>
            
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, 
                    gap: 4 
                  }}>
                    {/* 강점 */}
                    <Paper sx={{ 
                      p: 3, 
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                      border: '1px solid #bbf7d0'
                    }}>
                      <Typography variant="h6" sx={{ 
                        color: '#059669', 
                        fontWeight: 700, 
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <EmojiEvents />
                        주요 강점
                      </Typography>
                      <Stack spacing={2}>
              {report.aiAnalysis.strengths.map((strength, index) => (
                          <Box key={index} sx={{ 
                            p: 2, 
                            backgroundColor: 'white', 
                            borderRadius: 1,
                            borderLeft: '4px solid #10b981'
                          }}>
                            <Typography variant="body2" sx={{ color: '#1f2937', lineHeight: 1.6 }}>
                  • {strength}
                </Typography>
                          </Box>
              ))}
            </Stack>
                    </Paper>

                    {/* 개선점 */}
                    <Paper sx={{ 
                      p: 3, 
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #fef2f2 0%, #fef2f2 100%)',
                      border: '1px solid #fecaca'
                    }}>
                      <Typography variant="h6" sx={{ 
                        color: '#dc2626', 
              fontWeight: 700, 
                        mb: 2,
              display: 'flex', 
              alignItems: 'center', 
                        gap: 1
            }}>
                        <TrendingUp />
                        개선 영역
            </Typography>
                      <Stack spacing={2}>
              {report.aiAnalysis.weaknesses.map((weakness, index) => (
                          <Box key={index} sx={{ 
                            p: 2, 
                            backgroundColor: 'white', 
                            borderRadius: 1,
                            borderLeft: '4px solid #ef4444'
                          }}>
                            <Typography variant="body2" sx={{ color: '#1f2937', lineHeight: 1.6 }}>
                  • {weakness}
                </Typography>
                          </Box>
              ))}
            </Stack>
      </Paper>

                    {/* 추천사항 */}
                    <Paper sx={{ 
                      p: 3, 
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                      border: '1px solid #fde68a'
                    }}>
                      <Typography variant="h6" sx={{ 
                        color: '#d97706', 
          fontWeight: 700, 
                        mb: 2,
          display: 'flex', 
          alignItems: 'center', 
                        gap: 1
        }}>
                        <Lightbulb />
                        학습 추천
                      </Typography>
                      <Stack spacing={2}>
                        {report.aiAnalysis.recommendations.slice(0, 3).map((recommendation, index) => (
                          <Box key={index} sx={{ 
                            p: 2, 
                            backgroundColor: 'white', 
                            borderRadius: 1,
                            borderLeft: '4px solid #f59e0b'
                          }}>
                            <Typography variant="body2" sx={{ color: '#1f2937', lineHeight: 1.6 }}>
                              {index + 1}. {recommendation}
        </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Paper>
                  </Box>
        
                  {/* AI 종합 분석 */}
                  <Box sx={{ mt: 4 }}>
                    <Paper sx={{ 
                      p: 4, 
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)',
                      border: '1px solid #c7d2fe'
                    }}>
                      <Typography variant="h6" sx={{ 
                        color: '#4338ca', 
                        fontWeight: 700, 
                        mb: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <AutoAwesome />
                        AI 종합 분석 및 제언
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        color: '#1f2937', 
                        lineHeight: 1.8,
                        fontSize: '1.1rem'
          }}>
            {report.aiAnalysis.summary}
          </Typography>
                    </Paper>
        </Box>
                </CardContent>
              </Card>
            </Fade>
        </Box>
        )}

        {/* 푸터 */}
        <Fade in timeout={1800}>
          <Paper sx={{ 
            mt: 4, 
            p: 3, 
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
              본 리포트는 AI 역량 진단 시스템에 의해 자동 생성되었습니다.
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              생성 시간: {report.generatedAt.toLocaleString('ko-KR')} | 문의사항이 있으시면 관리자에게 연락해 주세요.
        </Typography>
      </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default ReportDetail; 