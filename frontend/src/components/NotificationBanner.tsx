import { useState, useMemo } from 'react';
import { useTenantSettings } from '../hooks/useTenantSettings';

interface NotificationBannerProps {
  className?: string;
}

export function NotificationBanner({ className = '' }: NotificationBannerProps) {
  const { data: settings } = useTenantSettings();

  // Initialize environment dismissed state from sessionStorage
  const [dismissedEnvironment, setDismissedEnvironment] = useState(() => {
    return sessionStorage.getItem('dismissedEnvironmentBanner') === 'true';
  });

  const [dismissedNotification, setDismissedNotification] = useState(false);

  // Check if notification was dismissed for this specific message
  const isNotificationDismissed = useMemo(() => {
    if (!settings?.notificationBannerMessage) return false;
    const dismissedMessage = sessionStorage.getItem('dismissedNotificationMessage');
    return dismissedMessage === settings.notificationBannerMessage;
  }, [settings?.notificationBannerMessage]);

  // Check if notification has expired
  const isNotificationExpired = settings?.notificationBannerExpiresAt
    ? new Date(settings.notificationBannerExpiresAt) < new Date()
    : false;

  const showEnvironmentBanner =
    settings?.showEnvironmentBanner &&
    settings?.environmentName &&
    settings.environmentName.toLowerCase() !== 'production' &&
    !dismissedEnvironment;

  const showNotificationBanner =
    settings?.notificationBannerEnabled &&
    settings?.notificationBannerMessage &&
    !isNotificationExpired &&
    !dismissedNotification &&
    !isNotificationDismissed;

  const handleDismissEnvironment = () => {
    setDismissedEnvironment(true);
    sessionStorage.setItem('dismissedEnvironmentBanner', 'true');
  };

  const handleDismissNotification = () => {
    setDismissedNotification(true);
    if (settings?.notificationBannerMessage) {
      sessionStorage.setItem('dismissedNotificationMessage', settings.notificationBannerMessage);
    }
  };

  if (!showEnvironmentBanner && !showNotificationBanner) {
    return null;
  }

  const getEnvironmentColor = (env: string) => {
    const envLower = env.toLowerCase();
    if (envLower === 'development' || envLower === 'dev') {
      return 'bg-purple-600';
    }
    if (envLower === 'test' || envLower === 'testing') {
      return 'bg-orange-500';
    }
    if (envLower === 'staging' || envLower === 'uat') {
      return 'bg-yellow-500 text-yellow-900';
    }
    return 'bg-gray-600';
  };

  const getNotificationStyles = (type?: string) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-800',
          icon: (
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          icon: (
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-800',
          icon: (
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800',
          icon: (
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
    }
  };

  const notificationStyles = getNotificationStyles(settings?.notificationBannerType);

  return (
    <div className={className}>
      {/* Environment Banner */}
      {showEnvironmentBanner && (
        <div className={`${getEnvironmentColor(settings.environmentName!)} text-white px-4 py-2`}>
          <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">
                Environment: <span className="font-bold uppercase">{settings.environmentName}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleDismissEnvironment}
              className="text-white/80 hover:text-white transition"
              title="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Notification Banner */}
      {showNotificationBanner && (
        <div className={`${notificationStyles.bg} border-b px-4 py-3`}>
          <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-3">
              {notificationStyles.icon}
              <span className={`text-sm font-medium ${notificationStyles.text}`}>
                {settings.notificationBannerMessage}
              </span>
            </div>
            <button
              type="button"
              onClick={handleDismissNotification}
              className={`${notificationStyles.text} opacity-70 hover:opacity-100 transition`}
              title="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBanner;
