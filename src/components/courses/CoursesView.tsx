import { useState } from 'react';
import { BookOpen, CalendarDays, CheckCircle2, Clock3, Filter, GraduationCap, ListChecks, MoreHorizontal, Plus, Search, Sparkles, Star, X } from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import StatCard from '@/components/StatCard';
import ConfirmModal from '@/components/ConfirmModal';
import CourseFormModal from '@/components/courses/CourseFormModal';
import CourseDetailModal from '@/components/courses/CourseDetailModal';
import { CourseStatusBadge } from '@/components/courses/courseBadges';
import { courseCategories, courseCategoryColors, formatHours, isEndingSoon, isStale, learnedHours, type Course, type CourseCategory, type CourseInput, type CourseStatus } from '@/lib/courses';
import { formatShortDate } from '@/lib/dates';

type Tab = 'todos' | CourseStatus;
type SortKey = 'recientes' | 'progreso' | 'calificacion';

const tabs: { id: Tab; label: string }[] = [
  { id: 'todos', label: 'Todos' }, { id: 'en curso', label: 'En curso' }, { id: 'completado', label: 'Completados' }, { id: 'por empezar', label: 'Por empezar' },
];

export default function CoursesView({ courses, today, onSave, onDelete, onStudyTask }: {
  courses: Course[];
  today: string;
  onSave: (input: CourseInput, file: File | null, existing: Course | null) => Promise<boolean>;
  onDelete: (course: Course) => Promise<void>;
  onStudyTask: (course: Course) => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>('todos');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'Todas' | CourseCategory>('Todas');
  const [sort, setSort] = useState<SortKey>('recientes');
  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formCourse, setFormCourse] = useState<Course | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const completedCount = courses.filter((course) => course.status === 'completado').length;
  const inProgressCount = courses.filter((course) => course.status === 'en curso').length;
  const totalHours = courses.reduce((sum, course) => sum + learnedHours(course), 0);
  const certificateCount = courses.filter((course) => course.certificate_path || course.certificate_url).length;

  const skillCounts = new Map<string, number>();
  courses.filter((course) => course.status === 'completado').forEach((course) => course.skills.forEach((skill) => skillCounts.set(skill, (skillCounts.get(skill) ?? 0) + 1)));
  const skillList = [...skillCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const search = query.trim().toLowerCase();
  const visible = courses
    .filter((course) => tab === 'todos' || course.status === tab)
    .filter((course) => category === 'Todas' || course.category === category)
    .filter((course) => !skillFilter || course.skills.includes(skillFilter))
    .filter((course) => !search || course.name.toLowerCase().includes(search) || course.platform.toLowerCase().includes(search) || course.skills.some((skill) => skill.toLowerCase().includes(search)))
    .sort((a, b) => {
      if (sort === 'progreso') return b.progress - a.progress;
      if (sort === 'calificacion') return (b.rating ?? 0) - (a.rating ?? 0);
      return b.created_at.localeCompare(a.created_at);
    });

  const detailCourse = detailId ? courses.find((course) => course.id === detailId) ?? null : null;

  function openNewForm() { setFormCourse(null); setFormOpen(true); }
  function openEditForm(course: Course) { setMenuId(null); setDetailId(null); setFormCourse(course); setFormOpen(true); }
  function closeForm() { setFormOpen(false); setFormCourse(null); }

  async function handleSave(input: CourseInput, file: File | null) {
    const saved = await onSave(input, file, formCourse);
    if (saved) closeForm();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    await onDelete(target);
  }

  const emptyLibrary = courses.length === 0;

  return <div className="page-wrap">
    <PageIntro eyebrow="Mi aprendizaje" title="Todo lo que he aprendido." description="Cada curso es una semilla. Mira cuánto ha crecido tu conocimiento." action={<button className="primary-button" onClick={openNewForm}><Plus size={17} />Nuevo curso</button>} />

    {!emptyLibrary && <div className="stats-grid courses-stats">
      <StatCard icon={<CheckCircle2 />} value={completedCount} label="Cursos completados" tone="sage" />
      <StatCard icon={<GraduationCap />} value={inProgressCount} label="Cursos en curso" tone="butter" />
      <StatCard icon={<Clock3 />} value={`${formatHours(totalHours)} h`} label="Horas de aprendizaje" tone="forest" />
      <StatCard icon={<BookOpen />} value={certificateCount} label="Certificados obtenidos" tone="rose" />
    </div>}

    {emptyLibrary ? <div className="panel courses-empty">
      <div className="courses-empty-art" aria-hidden="true"><span>🌱</span><i /><i /></div>
      <h2>Aún no has plantado tu primer curso.</h2>
      <p>¿Qué te gustaría aprender?</p>
      <button className="primary-button" onClick={openNewForm}><Plus size={17} />Agregar mi primer curso</button>
    </div> : <>
      <div className="courses-toolbar">
        <div className="course-tabs" role="tablist" aria-label="Filtrar por estado">{tabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
        <button className="course-filter-toggle secondary-button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}><Filter size={15} />Filtrar</button>
        <div className={`course-filters ${filtersOpen ? 'is-open' : ''}`}>
          <div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, plataforma o habilidad..." aria-label="Buscar cursos" /></div>
          <label className="filter-select"><span className="sr-only">Categoría</span><select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}><option>Todas</option>{courseCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="filter-select"><span className="sr-only">Orden</span><select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}><option value="recientes">Más recientes</option><option value="progreso">Por progreso</option><option value="calificacion">Por calificación</option></select></label>
        </div>
      </div>

      {skillFilter && <div className="skill-filter-chip"><Sparkles size={14} />Cursos que enseñan <strong>{skillFilter}</strong><button onClick={() => setSkillFilter(null)} aria-label="Quitar filtro de habilidad"><X size={14} /></button></div>}

      {visible.length === 0 ? <div className="panel empty-state courses-no-match">No hay cursos que coincidan con tus filtros.</div> : <div className="course-grid">
        {visible.map((course) => {
          const color = courseCategoryColors[course.category] ?? '#9AA08F';
          const hasCertificate = Boolean(course.certificate_path || course.certificate_url);
          const endingSoon = isEndingSoon(course, today);
          const stale = isStale(course, today);
          return <article className="course-card panel" key={course.id} style={{ borderTop: `4px solid ${color}` }}>
            <div className="course-card-top">
              <span className="course-category" style={{ color }}><i style={{ background: color }} />{course.category}</span>
              <div className="course-menu-wrap" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setMenuId(null); }}>
                <button className="course-menu-button" onClick={() => setMenuId(menuId === course.id ? null : course.id)} aria-label={`Opciones de ${course.name}`} aria-expanded={menuId === course.id} aria-haspopup="menu"><MoreHorizontal size={17} /></button>
                {menuId === course.id && <div className="course-menu" role="menu">
                  <button role="menuitem" onClick={() => { setMenuId(null); setDetailId(course.id); }}>Ver detalles</button>
                  <button role="menuitem" onClick={() => openEditForm(course)}>Editar</button>
                  <button role="menuitem" className="danger" onClick={() => { setMenuId(null); setDeleteTarget(course); }}>Eliminar</button>
                </div>}
              </div>
            </div>
            <button className="course-title" onClick={() => setDetailId(course.id)}>{course.name}</button>
            <p className="course-meta">{course.platform || 'Sin plataforma'}{course.instructor ? ` · ${course.instructor}` : ''}</p>
            <div className="course-badges"><CourseStatusBadge status={course.status} />{hasCertificate && <span className="certificate-badge"><Star size={12} />Certificado</span>}{endingSoon && <span className="course-alert">Termina pronto</span>}{stale && <span className="course-alert">Sin avances</span>}</div>
            <div className="course-progress" aria-label={`Progreso ${course.progress}%`}><div><i style={{ width: `${course.progress}%`, background: color }} /></div><span>{course.progress}%</span></div>
            <div className="course-foot">
              <span><CalendarDays size={13} />{course.end_date ? `Término ${formatShortDate(course.end_date)}` : course.start_date ? `Inicio ${formatShortDate(course.start_date)}` : 'Sin fechas'}</span>
              {course.rating ? <span className="rating-stars" aria-label={`${course.rating} de 5 estrellas`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={13} className={star <= course.rating! ? 'filled' : ''} />)}</span> : <span className="muted-text">Sin calificar</span>}
            </div>
            {course.status === 'en curso' && <button className="secondary-button course-task-button" onClick={() => void onStudyTask(course)}><ListChecks size={15} />Crear tarea de estudio</button>}
          </article>;
        })}
      </div>}

      {skillList.length > 0 && <section className="panel skill-map">
        <div className="panel-heading"><h2><span><Sparkles size={17} /></span>Mis habilidades</h2><small className="muted-text">Basadas en cursos completados</small></div>
        <div className="skill-map-list">{skillList.map(([skill, count]) => <button key={skill} className={`skill-chip ${skillFilter === skill ? 'active' : ''}`} onClick={() => setSkillFilter(skillFilter === skill ? null : skill)} aria-pressed={skillFilter === skill}>{skill}<b>{count} {count === 1 ? 'curso' : 'cursos'}</b></button>)}</div>
      </section>}
    </>}

    {formOpen && <CourseFormModal course={formCourse} onClose={closeForm} onSave={handleSave} />}
    {detailCourse && <CourseDetailModal course={detailCourse} onClose={() => setDetailId(null)} onEdit={() => openEditForm(detailCourse)} />}
    {deleteTarget && <ConfirmModal title="¿Quieres eliminar este curso?" description="Esta acción no se puede deshacer." confirmLabel="Eliminar curso" onClose={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />}
  </div>;
}
