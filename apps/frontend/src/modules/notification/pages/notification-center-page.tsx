import { NotificationCenter } from '../components/notification-center';

export function NotificationCenterPage() {
  return (
    <div style={{ padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '24px', fontSize: '28px', color: '#1f2937' }}>
          Notifications
        </h1>

        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          }}
        >
          <NotificationCenter />
        </div>
      </div>
    </div>
  );
}
