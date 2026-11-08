import type { CourseStatus } from '@/lib/courses';

const statusTone: Record<CourseStatus, string> = {
  'por empezar': 'status-soft',
  'en curso': 'status-active',
  'pausado': 'status-paused',
  'completado': 'status-done',
};

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return <span className={`course-status ${statusTone[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}
