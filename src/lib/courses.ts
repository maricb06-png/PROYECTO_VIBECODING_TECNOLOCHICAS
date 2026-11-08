export const courseStatuses = ['por empezar', 'en curso', 'pausado', 'completado'] as const;
export const courseCategories = ['Programación', 'Ciencia de datos', 'Electrónica', 'Idiomas', 'Arte y diseño', 'Escritura', 'Desarrollo personal', 'Otro'] as const;
export const coursePlatforms = ['Coursera', 'Platzi', 'Domestika', 'Udemy', 'YouTube', 'Escuela', 'Otro'];
export const courseCategoryColors: Record<string, string> = {
  'Programación': '#7C9CB4',
  'Ciencia de datos': '#8FA58A',
  'Electrónica': '#C9A46A',
  'Idiomas': '#B98B9A',
  'Arte y diseño': '#D08C7A',
  'Escritura': '#A39A6E',
  'Desarrollo personal': '#6E9C8C',
  'Otro': '#9AA08F',
};

export type CourseStatus = (typeof courseStatuses)[number];
export type CourseCategory = (typeof courseCategories)[number];

export type Course = {
  id: string;
  name: string;
  platform: string;
  instructor: string;
  category: CourseCategory;
  status: CourseStatus;
  start_date: string | null;
  end_date: string | null;
  total_hours: number | null;
  progress: number;
  skills: string[];
  course_url: string;
  certificate_url: string;
  certificate_path: string;
  certificate_name: string;
  rating: number | null;
  notes: string;
  xp_awarded: boolean;
  last_progress_at: string;
  created_at: string;
  updated_at: string;
};

export type CourseInput = Pick<Course, 'name' | 'platform' | 'instructor' | 'category' | 'status' | 'start_date' | 'end_date' | 'total_hours' | 'progress' | 'skills' | 'course_url' | 'certificate_url' | 'certificate_path' | 'certificate_name' | 'rating' | 'notes'>;

export type CourseErrors = Partial<Record<'name' | 'end_date' | 'total_hours' | 'course_url' | 'certificate_url' | 'skills', string>>;

export const courseXp = 30;
const staleDays = 14;
const dueSoonDays = 3;

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateCourse(input: CourseInput): CourseErrors {
  const errors: CourseErrors = {};
  if (!input.name.trim()) errors.name = 'Escribe el nombre del curso para poder guardarlo.';
  if (input.start_date && input.end_date && input.end_date < input.start_date) errors.end_date = 'La fecha de término no puede ser anterior a la de inicio.';
  if (input.total_hours !== null && (input.total_hours < 0 || input.total_hours > 10000)) errors.total_hours = 'Las horas deben estar entre 0 y 10000.';
  if (input.course_url && !isHttpUrl(input.course_url)) errors.course_url = 'Pega un enlace que empiece por http:// o https://.';
  if (input.certificate_url && !isHttpUrl(input.certificate_url)) errors.certificate_url = 'Pega un enlace que empiece por http:// o https://.';
  return errors;
}

export function learnedHours(course: Pick<Course, 'total_hours' | 'progress'>) {
  return ((course.total_hours ?? 0) * course.progress) / 100;
}

function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000);
}

export function isEndingSoon(course: Course, today: string) {
  if (course.status !== 'en curso' || !course.end_date) return false;
  const days = daysBetween(today, course.end_date);
  return days >= 0 && days <= dueSoonDays;
}

export function isStale(course: Course, today: string) {
  if (course.status !== 'en curso') return false;
  const last = course.last_progress_at.slice(0, 10);
  return daysBetween(last, today) >= staleDays;
}

export function formatHours(hours: number) {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}
