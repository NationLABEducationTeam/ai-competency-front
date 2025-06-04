import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  Tab,
  Tabs,
  Divider,
  Link,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useAuthStore } from '../store/authStore';
import { authAPI, testConnection } from '../services/apiService';
import { UserLogin, UserCreate } from '../types';
import { 
  Visibility, 
  VisibilityOff,
  LightbulbCircle,
  Groups,
  Assessment,
  ManageAccounts,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // 로그인 폼 데이터
  const [loginData, setLoginData] = useState<UserLogin>({
    email: '',
    password: '',
  });

  // 회원가입 폼 데이터
  const [registerData, setRegisterData] = useState<UserCreate>({
    email: '',
    password: '',
    name: '',
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // 백엔드 연결 상태 확인
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        await testConnection();
        setBackendStatus('connected');
      } catch (error) {
        setBackendStatus('disconnected');
        setError('백엔드 서버에 연결할 수 없습니다. 서버 상태를 확인해주세요.');
      }
    };

    checkBackendConnection();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await authAPI.login(loginData);
      
      // 토큰을 localStorage에 저장
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('token_type', response.token_type);
      
      // 사용자 정보 가져오기
      try {
        const userInfo = await authAPI.getCurrentUser();
        login(response.access_token, userInfo);
      } catch (userError) {
        // 사용자 정보를 가져올 수 없는 경우 기본 정보로 로그인
        const defaultUser = {
          id: 1,
          email: loginData.email,
          created_at: new Date().toISOString(),
        };
        login(response.access_token, defaultUser);
      }
      
      // 로그인 후 리다이렉트
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        localStorage.removeItem('redirectAfterLogin');
        navigate(redirectPath);
      } else {
      navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('로그인 실패:', error);
      if (error.message.includes('401')) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (error.message.includes('404')) {
        setError('존재하지 않는 사용자입니다.');
      } else {
        setError('로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerData.name || !registerData.email || !registerData.password) {
      setError('이름, 이메일, 비밀번호를 모두 입력해주세요.');
      return;
    }

    if (registerData.password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (registerData.password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await authAPI.register(registerData);
      
      // 백엔드 응답에 id나 email이 있으면 성공으로 판단
      if (response && ((response as any).id || (response as any).email)) {
        setShowSuccessDialog(true);
      } else {
        setError('회원가입에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error: any) {
      console.error('회원가입 실패:', error);
      
      // 에러 메시지 개선
      if (error.message.includes('Email already registered') || 
          error.message.includes('이미 존재하는 이메일') || 
          error.message.includes('already exists') || 
          error.message.includes('duplicate') ||
          error.status === 409 ||
          error.status === 400) {
        setError('등록된 메일입니다.');
        
        // 3초 후 자동으로 로그인 폼으로 전환
        setTimeout(() => {
          setIsSignUp(false);
          setError('');
          // 입력한 이메일을 로그인 폼에 자동 입력
          setLoginData({ 
            email: registerData.email, 
            password: '' 
          });
          // 회원가입 폼 초기화
          setRegisterData({ email: '', password: '', name: '' });
          setConfirmPassword('');
        }, 3000);
      } else if (error.message.includes('invalid email')) {
        setError('잘못된 이메일 형식입니다.');
      } else if (error.message.includes('422')) {
        setError('입력 정보를 다시 확인해주세요.');
      } else {
        setError('회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 상단 네비게이션 */}
      <Box sx={{ 
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        px: 4,
        py: 2,
      }}>
        <Box sx={{ 
          maxWidth: 1200,
          mx: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ 
              width: 48,
              height: 48,
              backgroundColor: '#4763E4',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <LightbulbCircle sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                color: '#333',
                lineHeight: 1.2,
              }}>
                AI Assessment
              </Typography>
              <Typography variant="body2" sx={{ 
                color: '#666',
                fontWeight: 500,
              }}>
                Admin Dashboard
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
          </Box>
        </Box>
      </Box>

      {/* 메인 컨텐츠 */}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
      }}>
        <Box sx={{ 
          display: 'flex',
          maxWidth: 1000,
          width: '100%',
          backgroundColor: 'white',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          {/* 왼쪽 보라색 영역 */}
          <Box sx={{ 
            flex: 1,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            p: 6,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            color: 'white',
          }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 3 }}>
              Welcome to AITRACK
            </Typography>
            <Typography variant="body1" sx={{ mb: 5, opacity: 0.9 }}>
              AI 역량 진단 관리 플랫폼
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ 
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 2,
                p: 3,
                flex: 1,
                textAlign: 'center',
              }}>
                <Assessment sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="body2">역량 평가 관리</Typography>
              </Box>
              <Box sx={{ 
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 2,
                p: 3,
                flex: 1,
                textAlign: 'center',
              }}>
                <Groups sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="body2">현행 교육 워크스페이스</Typography>
              </Box>
            </Box>
          </Box>

          {/* 오른쪽 로그인 폼 영역 */}
          <Box sx={{ 
            flex: 1,
            p: 6,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: '#333' }}>
              {isSignUp ? '계정 생성' : '관리자 로그인'}
            </Typography>
            <Typography variant="body1" sx={{ color: '#666', mb: 4 }}>
              {isSignUp ? '시작하려면 회원가입을 해주세요' : '대시보드에 접근하려면 로그인이 필요합니다'}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {success}
              </Alert>
            )}

            {!isSignUp ? (
              <form onSubmit={handleLogin}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  이메일
                </Typography>
                <TextField
                  fullWidth
                  placeholder="admin@example.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  variant="outlined"
                  disabled={loading}
                  sx={{ mb: 3 }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    비밀번호
                  </Typography>
                  <Link
                    href="#"
                    underline="hover"
                    sx={{ fontSize: '0.875rem', color: '#6366f1' }}
                  >
                    비밀번호 찾기
                  </Link>
                </Box>
                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  variant="outlined"
                  disabled={loading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      sx={{ color: '#6366f1' }}
                    />
                  }
                  label="로그인 상태 유지"
                  sx={{ mb: 3 }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    backgroundColor: '#6366f1',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: '#5558e3',
                    },
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : '로그인'}
                </Button>

                <Typography variant="body2" sx={{ textAlign: 'center', mt: 3, color: '#666' }}>
                  계정이 없으신가요?{' '}
                  <Link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsSignUp(true);
                      setError('');
                    }}
                    sx={{ color: '#6366f1', fontWeight: 600 }}
                  >
                    회원가입
                  </Link>
                </Typography>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  이름
                </Typography>
                <TextField
                  fullWidth
                  placeholder="이름을 입력하세요"
                  value={registerData.name || ''}
                  onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                  variant="outlined"
                  disabled={loading}
                  sx={{ mb: 3 }}
                />

                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  Email
                </Typography>
                <TextField
                  fullWidth
                  placeholder="your@email.com"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  variant="outlined"
                  disabled={loading}
                  sx={{ mb: 3 }}
                />

                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  Password
                </Typography>
                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  placeholder="비밀번호를 입력하세요"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  variant="outlined"
                  disabled={loading}
                  helperText="최소 6자 이상"
                  sx={{ mb: 3 }}
                />

                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  비밀번호 확인
                </Typography>
                <TextField
                  fullWidth
                  type="password"
                  placeholder="비밀번호를 다시 입력하세요"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  variant="outlined"
                  disabled={loading}
                  sx={{ mb: 3 }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    backgroundColor: '#6366f1',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: '#5558e3',
                    },
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : '회원가입'}
                </Button>

                <Typography variant="body2" sx={{ textAlign: 'center', mt: 3, color: '#666' }}>
                  이미 계정이 있으신가요?{' '}
                  <Link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsSignUp(false);
                      setError('');
                    }}
                    sx={{ color: '#6366f1', fontWeight: 600 }}
                  >
                    로그인
                  </Link>
                </Typography>
              </form>
            )}
          </Box>
        </Box>
      </Box>

      {/* 회원가입 성공 팝업 */}
      <Dialog
        open={showSuccessDialog}
        onClose={() => {}} // 배경 클릭으로 닫기 방지
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 2,
          }
        }}
      >
        <DialogTitle sx={{ 
          textAlign: 'center', 
          pb: 1,
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#4caf50'
        }}>
          🎉 회원가입 완료!
        </DialogTitle>
        
        <DialogContent sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
            회원가입이 성공적으로 완료되었습니다!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            이제 로그인하여 AI 역량 진단 플랫폼을 이용하실 수 있습니다.
          </Typography>
        </DialogContent>
        
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              setShowSuccessDialog(false);
              window.location.reload();
            }}
            sx={{
              background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
              color: 'white',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #45a049 0%, #3d8b40 100%)',
              }
            }}
          >
            로그인 하러가기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login; 