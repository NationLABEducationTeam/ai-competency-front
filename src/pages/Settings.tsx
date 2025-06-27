import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Person,
  Security,
  Notifications,
  Storage,
  Delete,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const Settings: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    surveyAlerts: true,
    reportReady: true,
    systemUpdates: false,
  });
  const [saveMessage, setSaveMessage] = useState('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleProfileSave = () => {
    // 실제로는 API 호출
    setSaveMessage('프로필이 성공적으로 업데이트되었습니다.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handlePasswordChange = () => {
    if (profileData.newPassword !== profileData.confirmPassword) {
      setSaveMessage('새 비밀번호가 일치하지 않습니다.');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    // 실제로는 API 호출
    setSaveMessage('비밀번호가 성공적으로 변경되었습니다.');
    setProfileData({
      ...profileData,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleNotificationSave = () => {
    // 실제로는 API 호출
    setSaveMessage('알림 설정이 저장되었습니다.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        설정
      </Typography>

      {saveMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {saveMessage}
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab
              icon={<Person />}
              label="프로필"
              iconPosition="start"
              sx={{ textTransform: 'none', minHeight: 64 }}
            />
            <Tab
              icon={<Security />}
              label="보안"
              iconPosition="start"
              sx={{ textTransform: 'none', minHeight: 64 }}
            />
            <Tab
              icon={<Notifications />}
              label="알림"
              iconPosition="start"
              sx={{ textTransform: 'none', minHeight: 64 }}
            />
            <Tab
              icon={<Storage />}
              label="데이터"
              iconPosition="start"
              sx={{ textTransform: 'none', minHeight: 64 }}
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* 프로필 탭 */}
          <TabPanel value={activeTab} index={0}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              프로필 정보
            </Typography>
            <Box sx={{ maxWidth: 500 }}>
              <TextField
                fullWidth
                label="이름"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                sx={{ mb: 3 }}
              />
              <TextField
                fullWidth
                label="이메일"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                sx={{ mb: 3 }}
              />
              <Button
                variant="contained"
                onClick={handleProfileSave}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  textTransform: 'none',
                }}
              >
                프로필 저장
              </Button>
            </Box>
          </TabPanel>

          {/* 보안 탭 */}
          <TabPanel value={activeTab} index={1}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              비밀번호 변경
            </Typography>
            <Box sx={{ maxWidth: 500 }}>
              <TextField
                fullWidth
                label="현재 비밀번호"
                type="password"
                value={profileData.currentPassword}
                onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                sx={{ mb: 3 }}
              />
              <TextField
                fullWidth
                label="새 비밀번호"
                type="password"
                value={profileData.newPassword}
                onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                sx={{ mb: 3 }}
              />
              <TextField
                fullWidth
                label="새 비밀번호 확인"
                type="password"
                value={profileData.confirmPassword}
                onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                sx={{ mb: 3 }}
              />
              <Button
                variant="contained"
                onClick={handlePasswordChange}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  textTransform: 'none',
                }}
              >
                비밀번호 변경
              </Button>
            </Box>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              로그인 기록
            </Typography>
            <List>
              {[
                { device: 'Chrome on Windows', time: '2024년 5월 20일 14:30', location: '서울, 대한민국' },
                { device: 'Safari on iPhone', time: '2024년 5월 19일 09:15', location: '서울, 대한민국' },
                { device: 'Chrome on macOS', time: '2024년 5월 18일 16:45', location: '서울, 대한민국' },
              ].map((login, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={login.device}
                    secondary={`${login.time} • ${login.location}`}
                  />
                </ListItem>
              ))}
            </List>
          </TabPanel>

          {/* 알림 탭 */}
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              알림 설정
            </Typography>
            <Box sx={{ maxWidth: 500 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.emailNotifications}
                    onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                  />
                }
                label="이메일 알림"
                sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', ml: 0 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.surveyAlerts}
                    onChange={(e) => setNotifications({ ...notifications, surveyAlerts: e.target.checked })}
                  />
                }
                label="새로운 설문 응답 알림"
                sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', ml: 0 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.reportReady}
                    onChange={(e) => setNotifications({ ...notifications, reportReady: e.target.checked })}
                  />
                }
                label="리포트 생성 완료 알림"
                sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', ml: 0 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.systemUpdates}
                    onChange={(e) => setNotifications({ ...notifications, systemUpdates: e.target.checked })}
                  />
                }
                label="시스템 업데이트 알림"
                sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', ml: 0 }}
              />
              <Button
                variant="contained"
                onClick={handleNotificationSave}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  textTransform: 'none',
                }}
              >
                알림 설정 저장
              </Button>
            </Box>
          </TabPanel>

          {/* 데이터 탭 */}
          <TabPanel value={activeTab} index={3}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              데이터 관리
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Card sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    데이터 내보내기
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    모든 설문 데이터와 응답을 Excel 파일로 내보냅니다.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="outlined"
                    sx={{ textTransform: 'none' }}
                  >
                    데이터 내보내기
                  </Button>
                </CardActions>
              </Card>

              <Card sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    데이터 백업
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    전체 시스템 데이터를 백업합니다.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="outlined"
                    sx={{ textTransform: 'none' }}
                  >
                    백업 생성
                  </Button>
                </CardActions>
              </Card>

              <Card sx={{ flex: '1 1 300px', minWidth: '300px', borderColor: 'error.main' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1, color: 'error.main' }}>
                    데이터 삭제
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    모든 데이터를 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    sx={{ textTransform: 'none' }}
                  >
                    모든 데이터 삭제
                  </Button>
                </CardActions>
              </Card>
            </Box>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              저장소 사용량
            </Typography>
            <Box sx={{ maxWidth: 500 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">설문 데이터</Typography>
                <Typography variant="body2">2.3 GB / 10 GB</Typography>
              </Box>
              <Box sx={{ width: '100%', height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, mb: 2 }}>
                <Box
                  sx={{
                    width: '23%',
                    height: '100%',
                    backgroundColor: '#667eea',
                    borderRadius: 4,
                  }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">리포트 파일</Typography>
                <Typography variant="body2">1.8 GB / 5 GB</Typography>
              </Box>
              <Box sx={{ width: '100%', height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, mb: 2 }}>
                <Box
                  sx={{
                    width: '36%',
                    height: '100%',
                    backgroundColor: '#48bb78',
                    borderRadius: 4,
                  }}
                />
              </Box>
                         </Box>
           </TabPanel>
         </Box>
       </Paper>

       {/* 로그아웃 섹션 */}
       <Paper sx={{ mt: 3, p: 3 }}>
         <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'error.main' }}>
           계정 관리
         </Typography>
         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <Box>
             <Typography variant="body1" sx={{ mb: 0.5 }}>
               로그아웃
             </Typography>
             <Typography variant="body2" color="text.secondary">
               현재 세션에서 로그아웃합니다.
             </Typography>
           </Box>
           <Button
             variant="outlined"
             color="error"
             onClick={logout}
             sx={{ textTransform: 'none' }}
           >
             로그아웃
           </Button>
         </Box>
       </Paper>
     </Box>
   );
 };
 
 export default Settings; 