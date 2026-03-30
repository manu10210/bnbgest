'use client';

import InteractiveCalendar from '../../components/InteractiveCalendar';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <InteractiveCalendar />
    </ProtectedRoute>
  );
}
