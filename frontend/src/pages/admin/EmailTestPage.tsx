import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardBody, Button, Input, StatusBadge } from '../../components/ui';
import { emailTestService, type SendTestEmailRequest, type EmailTestResult } from '../../services/emailTestService';

export function EmailTestPage() {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('This is a test email to verify email deliverability from the MyScheduling application.');
  const [testHistory, setTestHistory] = useState<EmailTestResult[]>([]);

  // Fetch users for dropdown
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['emailTestUsers'],
    queryFn: () => emailTestService.getUsers(),
  });

  // Fetch email config
  const { data: emailConfig, isLoading: configLoading } = useQuery({
    queryKey: ['emailConfig'],
    queryFn: () => emailTestService.getEmailConfig(),
  });

  // Derive toEmail from selectedUserId
  const toEmail = selectedUserId ? users.find(u => u.id === selectedUserId)?.email || '' : '';
  const [manualEmail, setManualEmail] = useState('');

  // Send test email mutation
  const sendEmailMutation = useMutation({
    mutationFn: (request: SendTestEmailRequest) => emailTestService.sendTestEmail(request),
    onSuccess: (result) => {
      setTestHistory(prev => [result, ...prev].slice(0, 10));
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send test email');
    },
  });

  const handleSendTest = () => {
    const emailToSend = manualEmail || toEmail;
    if (!emailToSend) {
      toast.error('Please enter or select a recipient email');
      return;
    }

    sendEmailMutation.mutate({
      toEmail: emailToSend,
      subject: subject || undefined,
      body: body || undefined,
    });
  };

  const handlePresetMessage = (preset: 'default' | 'html' | 'simple') => {
    switch (preset) {
      case 'default':
        setSubject('');
        setBody('This is a test email to verify email deliverability from the MyScheduling application.');
        break;
      case 'html':
        setSubject('HTML Test Email');
        setBody('Testing <b>bold</b>, <i>italic</i>, and <u>underlined</u> text formatting.');
        break;
      case 'simple':
        setSubject('Quick Test');
        setBody('Testing 1-2-3');
        break;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Deliverability Test</h1>
        <p className="text-gray-600 mt-1">
          Test email delivery to verify your email configuration is working correctly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Configuration Status */}
        <Card className="lg:col-span-1">
          <CardHeader title="Email Configuration" />
          <CardBody>
            {configLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : emailConfig ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <StatusBadge
                    status={emailConfig.isConfigured ? 'Configured' : 'Not Configured'}
                    variant={emailConfig.isConfigured ? 'success' : 'danger'}
                  />
                </div>
                <div>
                  <span className="text-sm text-gray-600">Provider</span>
                  <p className="font-medium text-gray-900">{emailConfig.provider}</p>
                </div>
                {emailConfig.fromEmail && (
                  <div>
                    <span className="text-sm text-gray-600">From Address</span>
                    <p className="font-medium text-gray-900 text-sm">{emailConfig.fromEmail}</p>
                  </div>
                )}
                {emailConfig.fromName && (
                  <div>
                    <span className="text-sm text-gray-600">From Name</span>
                    <p className="font-medium text-gray-900">{emailConfig.fromName}</p>
                  </div>
                )}
                {emailConfig.smtpHost && (
                  <div>
                    <span className="text-sm text-gray-600">SMTP Host</span>
                    <p className="font-medium text-gray-900 text-sm">{emailConfig.smtpHost}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Unable to load configuration</p>
            )}
          </CardBody>
        </Card>

        {/* Send Test Email Form */}
        <Card className="lg:col-span-2">
          <CardHeader title="Send Test Email" />
          <CardBody>
            <div className="space-y-4">
              {/* Recipient Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Recipient
                </label>
                <div className="flex gap-3">
                  <select
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      setManualEmail('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    disabled={usersLoading}
                    aria-label="Select recipient user"
                  >
                    <option value="">-- Select a user --</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.displayName} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Manual Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or Enter Email Directly
                </label>
                <Input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => {
                    setManualEmail(e.target.value);
                    setSelectedUserId('');
                  }}
                  placeholder="email@example.com"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject (optional)
                </label>
                <Input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Leave blank for auto-generated subject with timestamp"
                />
              </div>

              {/* Message Body */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Message Body
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handlePresetMessage('default')}
                      className="text-xs text-purple-600 hover:text-purple-700"
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetMessage('simple')}
                      className="text-xs text-purple-600 hover:text-purple-700"
                    >
                      Simple
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetMessage('html')}
                      className="text-xs text-purple-600 hover:text-purple-700"
                    >
                      HTML Test
                    </button>
                  </div>
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder="Enter test message..."
                />
              </div>

              {/* Send Button */}
              <div className="pt-4">
                <Button
                  variant="primary"
                  onClick={handleSendTest}
                  disabled={(!manualEmail && !toEmail) || sendEmailMutation.isPending || !emailConfig?.isConfigured}
                  className="w-full"
                >
                  {sendEmailMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send Test Email
                    </>
                  )}
                </Button>
                {!emailConfig?.isConfigured && (
                  <p className="text-sm text-red-500 mt-2 text-center">
                    Email is not configured. Please check your server configuration.
                  </p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Test History */}
        <Card className="lg:col-span-3">
          <CardHeader title="Test History" subtitle="Recent test results from this session" />
          <CardBody>
            {testHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p>No tests sent yet. Send a test email to see results here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {testHistory.map((result, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge
                            status={result.success ? 'Success' : 'Failed'}
                            variant={result.success ? 'success' : 'danger'}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">
                          {result.message}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                          {result.messageId || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(result.sentAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
