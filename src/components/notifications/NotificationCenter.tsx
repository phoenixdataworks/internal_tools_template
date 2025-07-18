'use client';

import { useState } from 'react';
import {
  Badge,
  Box,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemText,
  Typography,
  ListItemIcon,
  CircularProgress,
  ListItemButton,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Info as InfoIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import {
  NotificationType,
  NotificationWithMetadata,
  isAuthNotification,
  isChatNotification,
  isSystemNotification,
} from '@/types/notification';

export default function NotificationCenter() {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const router = useRouter();
  const { showToast } = useToast();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } =
    useNotifications();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      setIsLoading(id);
      await markAsRead(id);
    } catch (error) {
      showToast?.('Failed to mark notification as read', 'error');
    } finally {
      setIsLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsLoading(id);
      await deleteNotification(id);
    } catch (error) {
      showToast?.('Failed to delete notification', 'error');
    } finally {
      setIsLoading(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setIsLoading('all');
      await markAllAsRead();
      showToast?.('All notifications marked as read', 'success');
    } catch (error) {
      showToast?.('Failed to mark all notifications as read', 'error');
    } finally {
      setIsLoading(null);
    }
  };

  const handleClearAll = async () => {
    try {
      setIsLoading('clear');
      await clearAll();
      showToast?.('All notifications cleared', 'success');
    } catch (error) {
      showToast?.('Failed to clear notifications', 'error');
    } finally {
      setIsLoading(null);
    }
  };

  const handleNotificationClick = async (notification: NotificationWithMetadata) => {
    try {
      // Mark as read when clicked
      await markAsRead(notification.id);

      // Handle navigation based on notification type
      if (isChatNotification(notification)) {
        router.push(`/chat/${notification.data.thread_id}`);
        handleClose();
        return;
      }

      if (isAuthNotification(notification)) {
        if (notification.data.action === 'verify_email') {
          router.push('/settings/profile');
        } else if (notification.data.action === 'password_reset') {
          router.push('/auth/reset-password');
        }
        handleClose();
        return;
      }

      if (isSystemNotification(notification)) {
        if (notification.data.action === 'maintenance') {
          router.push('/system-status');
        }
        handleClose();
        return;
      }
    } catch (error) {
      showToast?.('Failed to handle notification', 'error');
      console.error('Error handling notification click:', error);
    }
  };

  const formatNotificationDate = (date: string | null) => {
    if (!date) return 'Unknown date';
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'auth':
        return <EmailIcon color="primary" />;
      case 'chat':
        return <ChatIcon color="success" />;
      case 'system':
        return <InfoIcon color="warning" />;
      case 'team':
        return <NotificationsIcon color="info" />;
      case 'mention':
        return <NotificationsIcon color="secondary" />;
      default:
        const _exhaustiveCheck: never = type;
        return <NotificationsIcon />;
    }
  };

  const isClickable = (notification: NotificationWithMetadata) => {
    if (isChatNotification(notification)) {
      return true;
    }

    if (isAuthNotification(notification)) {
      return notification.data.action !== 'new_device';
    }

    if (isSystemNotification(notification)) {
      return notification.data.action === 'maintenance';
    }

    return false;
  };

  const renderNotificationContent = (notification: NotificationWithMetadata) => {
    if (isChatNotification(notification)) {
      return 'New message in chat';
    }

    if (isAuthNotification(notification)) {
      switch (notification.data.action) {
        case 'verify_email':
          return 'Please verify your email';
        case 'password_reset':
          return 'Password reset requested';
        case 'new_device':
          return 'New device signin detected';
        case 'account_update':
          return 'Account security update';
        default:
          const _exhaustiveCheck: never = notification.data.action;
          return 'Unknown auth notification';
      }
    }

    if (isSystemNotification(notification)) {
      switch (notification.data.action) {
        case 'maintenance':
          return 'System maintenance scheduled';
        case 'update':
          return 'System update available';
        case 'security':
          return 'Security alert';
        default:
          const _exhaustiveCheck: never = notification.data.action;
          return 'Unknown system notification';
      }
    }

    return 'Unknown notification';
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  return (
    <Box>
      <IconButton
        onClick={handleClick}
        size="large"
        aria-label="show notifications"
        color="inherit"
      >
        <Badge badgeContent={unreadCount} color="error">
          {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ width: 360, maxHeight: 480 }}>
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6">Notifications</Typography>
            <Box>
              {unreadCount > 0 && (
                <IconButton size="small" onClick={handleMarkAllAsRead} title="Mark all as read">
                  <CheckCircleIcon />
                </IconButton>
              )}
              <IconButton size="small" onClick={handleClearAll} title="Clear all notifications">
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ overflowY: 'auto', maxHeight: 400 }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : notifications.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography color="text.secondary">No notifications</Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {notifications.map(notification => (
                  <ListItem
                    key={notification.id}
                    disablePadding
                    sx={{
                      opacity: notification.read ? 0.7 : 1,
                      cursor: isClickable(notification) ? 'pointer' : 'default',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: notification.read ? 'transparent' : 'action.hover',
                    }}
                    onClick={() =>
                      isClickable(notification) && handleNotificationClick(notification)
                    }
                  >
                    <ListItemButton disabled={!isClickable(notification)}>
                      <ListItemIcon>
                        {getNotificationIcon(notification.type as NotificationType)}
                      </ListItemIcon>
                      <ListItemText
                        primary={renderNotificationContent(notification)}
                        secondary={
                          <Typography component="span" variant="body2" color="text.secondary">
                            {formatNotificationDate(notification.created_at)}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Box>
      </Popover>
    </Box>
  );
}
