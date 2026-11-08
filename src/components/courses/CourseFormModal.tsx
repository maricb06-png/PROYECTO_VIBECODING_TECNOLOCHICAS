import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { BookOpen, Paperclip, Plus, Star, X } from 'lucide-react';
import { coursePlatforms, courseCategories, courseStatuses, validateCourse, type Course, type CourseCategory, type CourseErrors, type CourseInput, type CourseStatus } from '@/lib/courses';

const certificateTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const maxCertificateBytes = 5 * 1024 * 1024;
const maxSkillLength = 40;
const maxSkills = 12;

type FormState = Omit<CourseInput, 'total_hours'> & { total_hours: string };

function toFormState(course: Course | null): FormState {
  return {
    name: course?.name ?? '',
    platform: course?.platform ?? '',
    instructor: course?.instructor ?? '',
    category: course?.category ?? 'Otro',
    status: course?.status ?? 'por empezar',
    start_date: course?.start_date ?? '',
    end_date: course?.end_date ?? '',
    total_hours: course?.total_hours === null || course?.total_hours === undefined ? '' : String(course.total_hours),
    progress: course?.progress ?? 0,
    skills: course?.skills ?? [],
    course_url: course?.course_url ?? '',
    certificate_url: course?.certificate_url ?? '',
    certificate_path: course?.certificate_path ?? '',
    certificate_name: course?.certificate_name ?? '',
    rating: course?.rating ?? null,
    notes: course?.notes ?? '',
  };
}

export default function CourseFormModal({ course, onClose, onSave }: { course: Course | null; onClose: () => void; onSave: (input: CourseInput, file: File | null) => Promise<void> }) {
  const [values, setValues] = useState<FormState>(() => toFormState(course));
  const [skillDraft, setSkillDraft] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<CourseErrors & { file?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setValues((current) => ({ ...current, [key]: value }));

  function changeStatus(status: CourseStatus) {
    setValues((current) => ({ ...current, status, progress: status === 'completado' ? 100 : current.progress }));
  }

  function addSkill() {
    const skill = skillDraft.trim().slice(0, maxSkillLength);
    setSkillDraft('');
    if (!skill) return;
    if (values.skills.length >= maxSkills) { setErrors((current) => ({ ...current, skills: `Puedes guardar hasta ${maxSkills} habilidades.` })); return; }
    if (values.skills.some((item) => item.toLowerCase() === skill.toLowerCase())) return;
    setErrors((current) => ({ ...current, skills: undefined }));
    update('skills', [...values.skills, skill]);
  }

  function handleSkillKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addSkill();
    }
  }

  function chooseFile(next: File | null) {
    if (next && !certificateTypes.includes(next.type)) { setErrors((current) => ({ ...current, file: 'Sube un certificado en PDF, PNG, JPG o WEBP.' })); return; }
    if (next && next.size > maxCertificateBytes) { setErrors((current) => ({ ...current, file: 'El archivo debe pesar menos de 5 MB.' })); return; }
    setErrors((current) => ({ ...current, file: undefined }));
    setFile(next);
  }

  function removeCertificateFile() {
    setFile(null);
    setValues((current) => ({ ...current, certificate_path: '', certificate_name: '' }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const hours = values.total_hours.trim() === '' ? null : Number(values.total_hours.replace(',', '.'));
    const input: CourseInput = {
      ...values,
      name: values.name.trim(),
      platform: values.platform.trim(),
      instructor: values.instructor.trim(),
      start_date: values.start_date || null,
      end_date: values.end_date || null,
      total_hours: hours !== null && Number.isFinite(hours) ? hours : null,
      progress: values.status === 'completado' ? 100 : values.progress,
      course_url: values.course_url.trim(),
      certificate_url: values.certificate_url.trim(),
      notes: values.notes.trim(),
    };
    const validation = validateCourse(input);
    if (values.total_hours.trim() !== '' && hours === null) validation.total_hours = 'Escribe un número de horas válido.';
    if (Object.keys(validation).length || errors.file) { setErrors({ ...validation, file: errors.file }); return; }
    setErrors({});
    setSaving(true);
    await onSave(input, file);
    setSaving(false);
  }

  const completed = values.status === 'completado';
  const showCertificateFile = values.certificate_path !== '' || file !== null;

  return <div className="modal-backdrop" onMouseDown={onClose}><div className="task-modal course-modal" role="dialog" aria-modal="true" aria-labelledby="course-form-title" onMouseDown={(event) => event.stopPropagation()}>
    <div className="modal-heading"><div><span className="eyebrow"><BookOpen size={14} />{course ? 'Editar curso' : 'Nueva semilla'}</span><h2 id="course-form-title">{course ? 'Ajusta tu aprendizaje.' : 'Planta un nuevo curso.'}</h2></div><button className="close-button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>
    <form onSubmit={submit} noValidate>
      <label>Nombre del curso<span className="required-mark">*</span><input value={values.name} onChange={(event) => update('name', event.target.value)} placeholder="Por ejemplo, Introducción a React" autoFocus maxLength={160} aria-invalid={Boolean(errors.name)} />{errors.name && <span className="field-error">{errors.name}</span>}</label>
      <div className="form-grid">
        <label>Plataforma o institución<input list="course-platforms" value={values.platform} onChange={(event) => update('platform', event.target.value)} placeholder="Coursera, Platzi, escuela..." maxLength={120} /><datalist id="course-platforms">{coursePlatforms.map((item) => <option key={item} value={item} />)}</datalist></label>
        <label>Instructor<span className="optional-mark">opcional</span><input value={values.instructor} onChange={(event) => update('instructor', event.target.value)} maxLength={120} /></label>
        <label>Categoría<select value={values.category} onChange={(event) => update('category', event.target.value as CourseCategory)}>{courseCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Estado<select value={values.status} onChange={(event) => changeStatus(event.target.value as CourseStatus)}>{courseStatuses.map((item) => <option key={item} value={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>)}</select></label>
        <label>Fecha de inicio<input type="date" value={values.start_date ?? ''} onChange={(event) => update('start_date', event.target.value)} /></label>
        <label>Fecha de término<input type="date" value={values.end_date ?? ''} onChange={(event) => update('end_date', event.target.value)} aria-invalid={Boolean(errors.end_date)} />{errors.end_date && <span className="field-error">{errors.end_date}</span>}</label>
        <label>Duración total (horas)<input inputMode="decimal" value={values.total_hours} onChange={(event) => update('total_hours', event.target.value)} placeholder="Ej. 12" aria-invalid={Boolean(errors.total_hours)} />{errors.total_hours && <span className="field-error">{errors.total_hours}</span>}</label>
        <label>Calificación personal<div className="star-row" role="group" aria-label="Calificación personal">{[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`} aria-pressed={(values.rating ?? 0) >= star} className={(values.rating ?? 0) >= star ? 'star active' : 'star'} onClick={() => update('rating', values.rating === star ? null : star)}><Star size={20} /></button>)}</div></label>
      </div>
      <label>Progreso: {values.progress}%<input type="range" min={0} max={100} step={5} value={values.progress} disabled={completed} onChange={(event) => update('progress', Number(event.target.value))} className="progress-slider" />{completed && <span className="field-hint">Los cursos completados siempre quedan al 100%.</span>}</label>
      <label>Habilidades aprendidas<div className="skill-input"><input value={skillDraft} onChange={(event) => setSkillDraft(event.target.value)} onKeyDown={handleSkillKey} placeholder="Escribe una habilidad y presiona Enter" maxLength={maxSkillLength} /><button type="button" className="secondary-button" onClick={addSkill} aria-label="Agregar habilidad"><Plus size={15} /></button></div>{errors.skills && <span className="field-error">{errors.skills}</span>}{values.skills.length > 0 && <div className="skill-tags">{values.skills.map((skill) => <span key={skill} className="skill-tag">{skill}<button type="button" onClick={() => update('skills', values.skills.filter((item) => item !== skill))} aria-label={`Quitar ${skill}`}><X size={12} /></button></span>)}</div>}</label>
      <div className="form-grid">
        <label>Enlace al curso<input type="url" value={values.course_url} onChange={(event) => update('course_url', event.target.value)} placeholder="https://" aria-invalid={Boolean(errors.course_url)} />{errors.course_url && <span className="field-error">{errors.course_url}</span>}</label>
        <label>Enlace del certificado<input type="url" value={values.certificate_url} onChange={(event) => update('certificate_url', event.target.value)} placeholder="https://" aria-invalid={Boolean(errors.certificate_url)} />{errors.certificate_url && <span className="field-error">{errors.certificate_url}</span>}</label>
      </div>
      <label>Archivo del certificado<span className="optional-mark">PDF o imagen, máximo 5 MB</span>
        {showCertificateFile ? <div className="certificate-chip"><Paperclip size={15} /><span>{file?.name ?? values.certificate_name}</span><button type="button" onClick={removeCertificateFile}>Quitar</button></div> : <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />}
        {errors.file && <span className="field-error">{errors.file}</span>}
      </label>
      <label>Notas o aprendizajes clave<textarea value={values.notes} onChange={(event) => update('notes', event.target.value)} rows={4} maxLength={4000} placeholder="Lo que más te llevaste de este curso..." /></label>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Guardando...' : course ? 'Guardar cambios' : 'Plantar curso'}</button></div>
    </form>
  </div></div>;
}
