import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Pencil, Star, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { courseCategoryColors, formatHours, learnedHours, type Course } from '@/lib/courses';
import { formatShortDate } from '@/lib/dates';
import { CourseStatusBadge } from '@/components/courses/courseBadges';

export default function CourseDetailModal({ course, onClose, onEdit }: { course: Course; onClose: () => void; onEdit: () => void }) {
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState('');

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function openCertificate() {
    setOpening(true);
    setOpenError('');
    const { data, error } = await supabase.storage.from('course-certificates').createSignedUrl(course.certificate_path, 300);
    setOpening(false);
    if (error || !data?.signedUrl) { setOpenError('No pudimos abrir el certificado. Inténtalo de nuevo.'); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  const certificateLink = course.certificate_url;
  const hasCertificate = Boolean(course.certificate_path || certificateLink);
  const color = courseCategoryColors[course.category] ?? '#9AA08F';

  return <div className="modal-backdrop" onMouseDown={onClose}><div className="task-modal course-modal course-detail" role="dialog" aria-modal="true" aria-labelledby="course-detail-title" onMouseDown={(event) => event.stopPropagation()}>
    <div className="modal-heading"><div><span className="eyebrow" style={{ color }}>{course.category}</span><h2 id="course-detail-title">{course.name}</h2>{course.platform && <p className="detail-subtitle">{course.platform}{course.instructor ? ` · ${course.instructor}` : ''}</p>}</div><button className="close-button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>
    <div className="detail-status"><CourseStatusBadge status={course.status} /><div className="detail-progress" aria-label={`Progreso ${course.progress}%`}><i style={{ width: `${course.progress}%`, background: color }} /></div><strong>{course.progress}%</strong></div>
    <dl className="detail-grid">
      <div><dt>Inicio</dt><dd>{course.start_date ? formatShortDate(course.start_date) : 'Sin fecha'}</dd></div>
      <div><dt>Término</dt><dd>{course.end_date ? formatShortDate(course.end_date) : 'Sin fecha'}</dd></div>
      <div><dt>Duración</dt><dd>{course.total_hours !== null ? `${formatHours(course.total_hours)} h` : 'Sin definir'}</dd></div>
      <div><dt>Horas aprendidas</dt><dd>{formatHours(learnedHours(course))} h</dd></div>
      <div><dt>Mi calificación</dt><dd>{course.rating ? <span className="rating-stars" aria-label={`${course.rating} de 5 estrellas`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} className={star <= course.rating! ? 'filled' : ''} />)}</span> : 'Sin calificar'}</dd></div>
    </dl>
    {course.course_url && <a className="detail-link" href={course.course_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />Ir al curso</a>}
    {course.skills.length > 0 && <section className="detail-section"><h3>Habilidades</h3><div className="skill-tags">{course.skills.map((skill) => <span key={skill} className="skill-tag">{skill}</span>)}</div></section>}
    <section className="detail-section"><h3>Notas y aprendizajes</h3><p className="detail-notes">{course.notes || 'Todavía no has escrito notas para este curso.'}</p></section>
    <section className="detail-section"><h3>Certificado</h3>{hasCertificate ? <div className="certificate-actions">{course.certificate_path && <button className="secondary-button" onClick={openCertificate} disabled={opening}><FileText size={15} />{opening ? 'Abriendo...' : `Abrir ${course.certificate_name || 'certificado'}`}</button>}{certificateLink && <a className="secondary-button" href={certificateLink} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />Ver enlace del certificado</a>}</div> : <p className="detail-notes">Aún no has guardado un certificado.</p>}{openError && <span className="field-error">{openError}</span>}</section>
    <div className="modal-actions"><button type="button" className="secondary-button" onClick={onEdit}><Pencil size={15} />Editar curso</button></div>
  </div></div>;
}
