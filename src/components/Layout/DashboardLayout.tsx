import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  InputBase,
} from '@mui/material';
import {
  Menu as MenuIcon,
  LightbulbCircle,
  FolderOutlined,
  QuestionAnswerOutlined,
  PeopleOutlined,
  InsertChartOutlined,
  SettingsOutlined,
  LogoutOutlined,
  SearchOutlined,
  HomeOutlined,
  DeleteOutlined,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../services/apiService';

const drawerWidth = 280;

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.warn('백엔드 로그아웃 실패:', error);
    } finally {
      logout();
      navigate('/login');
    }
  };

  const mainMenuItems = [
    { text: '대시보드', icon: <HomeOutlined />, path: '/dashboard' },
    { text: '워크스페이스', icon: <FolderOutlined />, path: '/workspaces' },
    { text: '리포트', icon: <InsertChartOutlined />, path: '/reports' },
    { text: '휴지통/보관함', icon: <DeleteOutlined />, path: '/trash' },
  ];

  const settingsMenuItems = [
    { text: '설정', icon: <SettingsOutlined />, path: '/settings' },
    { text: '로그아웃', icon: <LogoutOutlined />, path: '/logout' },
  ];

  const drawer = (
    <Box sx={{ height: '100%', backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
      {/* 로고 섹션 */}
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box sx={{ 
            width: 40,
            height: 40,
            backgroundColor: '#4763E4',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <LightbulbCircle sx={{ color: 'white', fontSize: 24 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
            AI 역량평가
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500 }}>
          관리자 대시보드
        </Typography>
      </Box>

      <Divider sx={{ borderColor: '#F3F4F6' }} />

      {/* 메뉴 섹션 */}
      <Box sx={{ flex: 1, p: 2 }}>
        <Typography variant="overline" sx={{ 
          px: 2, 
          mb: 1, 
          display: 'block',
          color: '#6B7280',
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.05em',
        }}>
          메뉴
        </Typography>
        <List>
          {mainMenuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 1.5,
                  py: 1.5,
                  px: 2,
                  '&.Mui-selected': {
                    backgroundColor: '#4763E4',
                    '&:hover': {
                      backgroundColor: '#4763E4',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                    '& .MuiListItemText-primary': {
                      color: 'white',
                      fontWeight: 600,
                    },
                  },
                  '&:hover': {
                    backgroundColor: '#F3F4F6',
                  },
                }}
              >
                <ListItemIcon sx={{
                  minWidth: 40,
                  color: location.pathname === item.path ? 'white' : '#6B7280',
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: '0.875rem',
                      fontWeight: location.pathname === item.path ? 600 : 500,
                      color: location.pathname === item.path ? 'white' : '#111827',
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Typography variant="overline" sx={{ 
          px: 2, 
          mb: 1, 
          mt: 3,
          display: 'block',
          color: '#6B7280',
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.05em',
        }}>
          설정
        </Typography>
        <List>
          {settingsMenuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => {
                  if (item.path === '/logout') {
                    handleLogout();
                  } else {
                    navigate(item.path);
                  }
                }}
                sx={{
                  borderRadius: 1.5,
                  py: 1.5,
                  px: 2,
                  '&.Mui-selected': {
                    backgroundColor: '#4763E4',
                    '&:hover': {
                      backgroundColor: '#4763E4',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                    '& .MuiListItemText-primary': {
                      color: 'white',
                      fontWeight: 600,
                    },
                  },
                  '&:hover': {
                    backgroundColor: '#F3F4F6',
                  },
                }}
              >
                <ListItemIcon sx={{
                  minWidth: 40,
                  color: location.pathname === item.path ? 'white' : '#6B7280',
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: '0.875rem',
                      fontWeight: location.pathname === item.path ? 600 : 500,
                      color: location.pathname === item.path ? 'white' : '#111827',
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: 'white',
          boxShadow: 'none',
          borderBottom: '1px solid #F3F4F6',
        }}
      >
        <Toolbar sx={{ height: 72, px: 3 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#111827' }}>
              대시보드
            </Typography>
            <Chip 
              label="관리자" 
              size="small"
              sx={{ 
                backgroundColor: '#EEF2FF',
                color: '#4763E4',
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 24,
              }}
            />
          </Box>

          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            ml: 'auto',
            gap: 2,
          }}>
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F9FAFB',
              borderRadius: 2,
              px: 2,
              py: 1,
              width: 300,
            }}>
              <SearchOutlined sx={{ color: '#6B7280', mr: 1 }} />
              <InputBase
                placeholder="검색..."
                sx={{
                  flex: 1,
                  fontSize: '0.875rem',
                  color: '#111827',
                  '& input::placeholder': {
                    color: '#6B7280',
                    opacity: 1,
                  },
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                  관리자
                </Typography>
                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                  {user?.email || 'admin@example.com'}
                </Typography>
              </Box>
              <Avatar 
                sx={{ 
                  width: 40, 
                  height: 40,
                  backgroundColor: '#F3F4F6',
                  color: '#6B7280',
                }}
              >
                {(user?.name || 'A')[0].toUpperCase()}
              </Avatar>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: '1px solid #F3F4F6',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: '1px solid #F3F4F6',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: '#F9FAFB',
          minHeight: '100vh',
        }}
      >
        <Toolbar sx={{ height: 71 }} />
        <Outlet />
      </Box>
    </Box>
  );
};

export default DashboardLayout; 