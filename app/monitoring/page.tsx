import { redirect } from 'next/navigation';

// /monitoring redirige automatiquement vers /settings/metrics
export default function MonitoringPage() {
  redirect('/settings/metrics');
}
