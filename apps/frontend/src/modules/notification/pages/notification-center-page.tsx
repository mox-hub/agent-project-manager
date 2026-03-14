import { NotificationCenter } from '../components/notification-center';

export function NotificationCenterPage() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-[900px] mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Notifications
        </h1>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <NotificationCenter />
        </div>
      </div>
    </div>
  );
}
