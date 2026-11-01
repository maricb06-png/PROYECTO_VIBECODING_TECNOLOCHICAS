import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowRight, BarChart3, Bell, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, Feather, Filter, Flower2, Heart, Home, Leaf, ListChecks, Menu, MoreHorizontal,
  Pencil, Pin, Plus, Search, Sparkles, Sprout, StickyNote, Target, Trash2, X, Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type TaskStatus = 'pendiente' | 'en progreso' | 'completada';
type Priority = 'baja' | 'media' | 'alta' | 'urgente';
type Task = { id: string; title: string; description: string; category: string; priority: Priority; status: TaskStatus; due_date: string | null; start_time: string | null; end_time: string | null; estimated_minutes: number; created_at: string; completed_at: string | null };
type Habit = { id: string; name: string; icon: string; color: string; frequency: string; current_streak: number; completed_today: boolean };
type HabitCompletion = { id: string; habit_id: string; completed_on: string };
type Note = { id: string; title: string; body: string; category: string; color: string; pinned: boolean; created_at: string };
type Profile = { id: string; display_name: string; avatar: string; avatar_color: string; xp: number; level: number };
type Reflection = { id: string; week_key: string; achieved: string; difficult: string; learned: string; improve: string; priority: string };
type View = 'inicio' | 'tareas' | 'calendario' | 'habitos' | 'estadisticas' | 'notas';

const today = localDate();
const levelNames = ['Pequeño brote', 'Plantita', 'Jardinero', 'Explorador del bosque', 'Guardián del bosque'];
const levelThresholds = [0, 50, 120, 220, 350];
const gardenStages = ['Semilla', 'Brote', 'Planta pequeña', 'Planta desarrollada', 'Planta floreciendo', 'Jardín florecido'];
const gardenThresholds = [0, 15, 45, 90, 150, 240];
const categories = ['Todas', 'Estudio', 'Trabajo', 'Proyectos personales', 'Salud y bienestar', 'Ejercicio', 'Finanzas', 'Hogar', 'Vida social', 'Creatividad', 'Otros'];
const priorityLabel: Record<Priority, string> = { baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente' };
const priorityTone: Record<Priority, string> = { baja: 'sage', media: 'butter', alta: 'rose', urgente: 'forest' };

function AuthScreen() {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const result = mode === 'signup'
      ? await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: displayName.trim() } } })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (result.error) {
      setMessage(mode === 'signup' ? 'No pudimos crear el espacio. Revisa los datos e inténtalo de nuevo.' : 'No pudimos iniciar sesión con esos datos.');
      return;
    }
    if (mode === 'signup' && !result.data.session) setMessage('Revisa tu correo para confirmar tu cuenta y entrar a tu espacio.');
  }

  async function recover() {
    if (!email.trim()) { setMessage('Escribe tu correo para enviarte el enlace de recuperación.'); return; }
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
    setBusy(false);
    setMessage('Si el correo está registrado, recibirás un enlace para recuperar tu acceso.');
  }

  return <div className="auth-page"><div className="auth-card"><div className="auth-art"><div className="auth-sun" /><div className="auth-cloud cloud-one" /><div className="auth-cloud cloud-two" /><span className="auth-mascot">🦊</span><span className="auth-flower flower-one">✿</span><span className="auth-flower flower-two">✿</span><div className="auth-ground" /></div><div className="auth-content"><div className="brand auth-brand"><div className="brand-mark"><Leaf size={19} /></div><div><strong>Cozy Life</strong><span>tu pequeño mundo</span></div></div><span className="eyebrow"><Sparkles size={14} />Un espacio solo para ti</span><h1>{mode === 'signup' ? 'Crea tu pequeño mundo.' : 'Bienvenida de vuelta.'}</h1><p>{mode === 'signup' ? 'Organiza tus días con calma, cultiva tus hábitos y deja que cada pequeño paso florezca.' : 'Tu jardín y tus planes te estaban esperando.'}</p><form onSubmit={submit}>{mode === 'signup' && <label>Nombre de usuario<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="¿Cómo te llamamos?" required /></label>}<label>Correo electrónico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" required /></label><label>Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Al menos 6 caracteres" minLength={6} required /></label>{message && <div className="auth-message">{message}</div>}<button className="primary-button auth-submit" disabled={busy}>{busy ? 'Preparando...' : mode === 'signup' ? 'Crear mi espacio' : 'Iniciar sesión'}</button></form><button className="auth-link" onClick={recover}>¿Olvidaste tu contraseña?</button><div className="auth-switch">{mode === 'signup' ? '¿Ya tienes una cuenta?' : '¿Todavía no tienes un espacio?'} <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setMessage(''); }}>{mode === 'signup' ? 'Iniciar sesión' : 'Crear mi espacio'}</button></div></div></div></div>;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<View>('inicio');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [habitCompletions, setHabitCompletions] = useState<HabitCompletion[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [editingReflection, setEditingReflection] = useState<Reflection | null>(null);
  const [gardenCelebration, setGardenCelebration] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  async function loadWorkspace() {
    setLoading(true);
    const [taskResponse, habitResponse, noteResponse, completionResponse, profileResponse, reflectionResponse] = await Promise.all([
      supabase.from('cozy_tasks').select('*').order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('cozy_habits').select('*').order('created_at', { ascending: true }),
      supabase.from('cozy_notes').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('cozy_habit_completions').select('*').order('completed_on', { ascending: true }),
      supabase.from('cozy_profile').select('*').maybeSingle(),
      supabase.from('cozy_reflections').select('*').order('week_key', { ascending: false }),
    ]);
    if (taskResponse.error || habitResponse.error || noteResponse.error || completionResponse.error || profileResponse.error || reflectionResponse.error) { 
      setNotice('No pudimos cargar tu espacio. Revisa la conexión e inténtalo de nuevo.');
    } else {
      setTasks((taskResponse.data ?? []) as Task[]);
      const loadedCompletions = (completionResponse.data ?? []) as HabitCompletion[];
      setHabitCompletions(loadedCompletions);
      setHabits(((habitResponse.data ?? []) as Habit[]).map((habit) => ({ ...habit, completed_today: loadedCompletions.some((item) => item.habit_id === habit.id && item.completed_on === today) })));
      setNotes((noteResponse.data ?? []) as Note[]);
      let loadedProfile = profileResponse.data as Profile | null;
      if (loadedProfile && loadedProfile.xp === 0) {
        const existingTaskXp = ((taskResponse.data ?? []) as Task[]).filter((task) => task.status === 'completada').reduce((sum, task) => sum + xpForMinutes(task.estimated_minutes), 0);
        const existingHabitXp = loadedCompletions.length * 5;
        const calculatedXp = existingTaskXp + existingHabitXp;
        if (calculatedXp > 0) {
          const calculatedLevel = levelThresholds.reduce((level, threshold, index) => calculatedXp >= threshold ? index + 1 : level, 1);
          await supabase.from('cozy_profile').update({ xp: calculatedXp, level: calculatedLevel, updated_at: new Date().toISOString() }).eq('id', loadedProfile.id);
          loadedProfile = { ...loadedProfile, xp: calculatedXp, level: calculatedLevel };
        }
      }
      setProfile(loadedProfile);
      setReflections((reflectionResponse.data ?? []) as Reflection[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setAuthLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => { if (session) void loadWorkspace(); }, [session]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 3500); return () => window.clearTimeout(timer); }, [notice]);

  if (authLoading) return <div className="auth-loading"><div className="loader" /><p>Preparando tu pequeño mundo...</p></div>;
  if (!session) return <AuthScreen />;

  const completedToday = tasks.filter((task) => task.status === 'completada' && taskCompletedOn(task) === today).length;
  const openTasks = tasks.filter((task) => task.status !== 'completada');
  const overdue = openTasks.filter((task) => task.due_date && task.due_date < today).length;
  const dailyProgress = tasks.length ? Math.round((completedToday / Math.max(tasks.filter((task) => task.due_date === today || taskCompletedOn(task) === today).length, 1)) * 100) : 0;
  const greeting = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = profile?.display_name ?? 'Mara';
  const currentLevel = profile?.level ?? 1;
  const currentLevelName = levelNames[Math.min(currentLevel - 1, levelNames.length - 1)];
  const gardenStageIndex = getGardenStage(profile?.xp ?? 0);
  const gardenStage = gardenStages[gardenStageIndex];
  const gardenStart = gardenThresholds[gardenStageIndex];
  const gardenEnd = gardenThresholds[gardenStageIndex + 1] ?? gardenThresholds[gardenThresholds.length - 1];
  const gardenProgress = gardenStageIndex === gardenStages.length - 1 ? 100 : Math.round(((profile?.xp ?? 0) - gardenStart) / (gardenEnd - gardenStart) * 100);

  async function updateXp(delta: number) {
    if (!profile || delta === 0) return;
    const rpcResult = await supabase.rpc('add_cozy_xp', { p_delta: delta }).maybeSingle();
    const data = rpcResult.data as { new_xp: number; new_level: number } | null;
    if (rpcResult.error || !data) { setNotice('No pudimos actualizar tu progreso.'); return; }
    const nextXp = data.new_xp;
    const nextLevel = data.new_level;
    const beforeStage = getGardenStage(profile.xp);
    const afterStage = getGardenStage(nextXp);
    setProfile({ ...profile, xp: nextXp, level: nextLevel });
    if (afterStage > beforeStage) {
      setGardenCelebration(`Tu jardín ha crecido: ${gardenStages[afterStage]}.`);
      window.setTimeout(() => setGardenCelebration(''), 4200);
    }
  }

  async function toggleTask(task: Task) {
    const completed = task.status !== 'completada';
    const update = { status: completed ? 'completada' : 'pendiente', completed_at: completed ? new Date().toISOString() : null };
    const { error } = await supabase.from('cozy_tasks').update(update).eq('id', task.id);
    if (error) { setNotice('No pudimos actualizar la tarea.'); return; }
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, ...update, status: update.status as TaskStatus } : item));
    await updateXp(completed ? xpForMinutes(task.estimated_minutes) : -xpForMinutes(task.estimated_minutes));
    if (completed) setNotice('Tarea completada. Un pequeño paso cuenta mucho.');
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from('cozy_tasks').delete().eq('id', id);
    if (error) { setNotice('No pudimos eliminar la tarea.'); return; }
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  async function toggleHabit(habit: Habit) {
    const completion = habitCompletions.find((item) => item.habit_id === habit.id && item.completed_on === today);
    const completed = !completion;
    const response = completed
      ? await supabase.from('cozy_habit_completions').insert({ habit_id: habit.id, completed_on: today }).select().maybeSingle()
      : await supabase.from('cozy_habit_completions').delete().eq('habit_id', habit.id).eq('completed_on', today);
    if (response.error || (completed && !response.data)) { setNotice('No pudimos actualizar el hábito.'); return; }
    const nextStreak = completed ? habit.current_streak + 1 : Math.max(0, habit.current_streak - 1);
    const { error } = await supabase.from('cozy_habits').update({ completed_today: completed, current_streak: nextStreak }).eq('id', habit.id);
    if (error) { setNotice('No pudimos actualizar el hábito.'); return; }
    setHabitCompletions((current) => completed ? [...current, response.data as HabitCompletion] : current.filter((item) => item.habit_id !== habit.id || item.completed_on !== today));
    setHabits((current) => current.map((item) => item.id === habit.id ? { ...item, completed_today: completed, current_streak: nextStreak } : item));
    await updateXp(completed ? 5 : -5);
  }

  async function addHabit() {
    const name = window.prompt('¿Qué hábito quieres cuidar?');
    if (!name?.trim()) return;
    const { data, error } = await supabase.from('cozy_habits').insert({ name: name.trim(), icon: 'sprout', color: '#8FA58A', frequency: 'Diario' }).select().maybeSingle();
    if (error || !data) { setNotice('No pudimos crear el hábito.'); return; }
    setHabits((current) => [...current, data as Habit]);
  }

  async function saveProfile(displayName: string, avatarColor: string) {
    if (!profile || !displayName.trim()) return;
    const { error } = await supabase.from('cozy_profile').update({ display_name: displayName.trim(), avatar_color: avatarColor }).eq('id', profile.id);
    if (error) { setNotice('No pudimos actualizar tu perfil.'); return; }
    setProfile({ ...profile, display_name: displayName.trim(), avatar_color: avatarColor });
    setShowProfileModal(false);
    setProfileMenu(false);
    setNotice('Tu perfil se ha actualizado.');
  }

  async function saveReflection(reflection: Omit<Reflection, 'id'>, existing: Reflection | null) {
    const response = existing
      ? await supabase.from('cozy_reflections').update(reflection).eq('id', existing.id).select().maybeSingle()
      : await supabase.from('cozy_reflections').insert(reflection).select().maybeSingle();
    if (response.error || !response.data) { setNotice('No pudimos guardar tu reflexión.'); return; }
    const saved = response.data as Reflection;
    setReflections((current) => existing ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
    setShowReflectionModal(false);
    setEditingReflection(null);
    setNotice('Tu reflexión quedó guardada.');
  }

  async function saveNote(note: Omit<Note, 'id' | 'created_at'>, existing: Note | null) {
    const response = existing
      ? await supabase.from('cozy_notes').update(note).eq('id', existing.id).select().maybeSingle()
      : await supabase.from('cozy_notes').insert(note).select().maybeSingle();
    if (response.error || !response.data) { setNotice('No pudimos guardar la nota.'); return; }
    const saved = response.data as Note;
    setNotes((current) => existing ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
    setShowNoteForm(false);
    setEditingNote(null);
    setNotice(existing ? 'Nota actualizada.' : 'Nota guardada.');
  }

  async function deleteNote(note: Note) {
    const { error } = await supabase.from('cozy_notes').delete().eq('id', note.id);
    if (error) { setNotice('No pudimos eliminar la nota.'); return; }
    setNotes((current) => current.filter((item) => item.id !== note.id));
    setDeletingNote(null);
    setNotice('Nota eliminada.');
  }

  const navigate = (nextView: View) => { setView(nextView); setMobileNav(false); };
  const navItems: { id: View; label: string; icon: typeof Home }[] = [
    { id: 'inicio', label: 'Mi espacio', icon: Home }, { id: 'tareas', label: 'Mis tareas', icon: ListChecks }, { id: 'calendario', label: 'Calendario', icon: CalendarDays }, { id: 'habitos', label: 'Hábitos', icon: Sprout }, { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 }, { id: 'notas', label: 'Notas', icon: StickyNote },
  ];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Leaf size={19} /></div><div><strong>Cozy Life</strong><span>tu pequeño mundo</span></div></div>
      <div className="profile-menu-wrap" tabIndex={0} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setProfileMenu(false); }}><div className="profile-card"><div className="avatar" style={{ background: profile?.avatar_color ?? '#8FA58A' }} /><div><strong>Hola, {firstName}</strong><span>Nivel {currentLevel} · {currentLevelName}</span></div><button className="profile-more" onClick={() => setProfileMenu((open) => !open)} aria-label="Abrir menú del perfil"><MoreHorizontal size={17} /></button></div>{profileMenu && <div className="profile-menu"><button onClick={() => { setShowProfileModal(true); setProfileMenu(false); }}>Editar perfil</button><button onClick={() => { void supabase.auth.signOut(); setProfileMenu(false); }}>Cerrar sesión</button></div>}</div>
      <nav className="nav-list"><p className="nav-caption">Tu espacio</p>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span>{id === 'tareas' && openTasks.length > 0 && <b>{openTasks.length}</b>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="garden-mini"><div className="garden-stars"><Sparkles size={14} /><span>Tu jardín · {gardenStage}</span></div><div className="garden-art"><span>{gardenStageIndex < 1 ? '🌰' : gardenStageIndex < 2 ? '🌱' : gardenStageIndex < 3 ? '🪴' : gardenStageIndex < 4 ? '🌿' : gardenStageIndex < 5 ? '🌸' : '🌳'}</span><span>{gardenStageIndex >= 2 ? '✿' : '·'}</span><span>{gardenStageIndex >= 4 ? '🍄' : '·'}</span></div><small>{profile?.xp ?? 0} XP · siguiente etapa al {gardenEnd} XP</small><div className="mini-progress"><i style={{ width: `${gardenProgress}%` }} /></div></div></div>
    </aside>
    {mobileNav && <button className="sidebar-backdrop" onClick={() => setMobileNav(false)} aria-label="Cerrar menú" />}
    <main className="main-content">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu size={21} /></button><div className="breadcrumbs"><button onClick={() => navigate('inicio')}>Mi espacio</button><ArrowRight size={14} /><strong>{navItems.find((item) => item.id === view)?.label}</strong></div><div className="top-actions"><div className="notification-wrap"><button className="icon-button" onClick={() => setNotificationsOpen((open) => !open)} aria-label="Abrir notificaciones"><Bell size={18} /><i /></button>{notificationsOpen && <div className="notification-panel"><strong>Tu rincón de avisos</strong><p>{overdue ? `${overdue} tarea${overdue === 1 ? '' : 's'} necesita${overdue === 1 ? '' : 'n'} atención.` : 'Todo está tranquilo por aquí.'}</p><button onClick={() => { setNotificationsOpen(false); navigate(overdue ? 'tareas' : 'habitos'); }}>Ver detalles</button></div>}</div><button className="top-avatar" style={{ background: profile?.avatar_color ?? '#8FA58A' }} onClick={() => setShowProfileModal(true)} aria-label="Abrir mi perfil" /></div></header>
      {notice && <div className="toast"><CheckCircle2 size={17} />{notice}</div>}
      {gardenCelebration && <div className="garden-celebration"><Sparkles size={17} />{gardenCelebration}</div>}
      {loading ? <div className="loading-state"><div className="loader" /><p>Preparando tu pequeño mundo...</p></div> : view === 'inicio' ? <Dashboard tasks={tasks} habits={habits} completedToday={completedToday} dailyProgress={dailyProgress} overdue={overdue} greeting={greeting} firstName={firstName} onNavigate={navigate} onToggle={toggleTask} onNewTask={() => { setEditingTask(null); setShowTaskForm(true); }} /> : view === 'tareas' ? <TasksView tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} onEdit={(task) => { setEditingTask(task); setShowTaskForm(true); }} onNewTask={() => { setEditingTask(null); setShowTaskForm(true); }} /> : view === 'calendario' ? <CalendarView tasks={tasks} onToggle={toggleTask} /> : view === 'habitos' ? <HabitsView habits={habits} completions={habitCompletions} onToggle={toggleHabit} onAdd={addHabit} /> : view === 'estadisticas' ? <StatsView tasks={tasks} completedToday={completedToday} reflections={reflections} onAddReflection={() => { setEditingReflection(reflections.find((item) => item.week_key === getWeekKey()) ?? null); setShowReflectionModal(true); }} onEditReflection={(reflection) => { setEditingReflection(reflection); setShowReflectionModal(true); }} /> : <NotesView notes={notes} onAdd={() => { setEditingNote(null); setShowNoteForm(true); }} onEdit={(note) => { setEditingNote(note); setShowNoteForm(true); }} onDelete={setDeletingNote} />}
    </main>
    {showProfileModal && <ProfileModal profile={profile} onClose={() => setShowProfileModal(false)} onSave={saveProfile} />}
    {showReflectionModal && <ReflectionModal reflection={editingReflection} onClose={() => { setShowReflectionModal(false); setEditingReflection(null); }} onSave={saveReflection} />}
    {showTaskForm && <TaskModal task={editingTask} onClose={() => setShowTaskForm(false)} onSaved={(task, mode) => { setTasks((current) => mode === 'edit' ? current.map((item) => item.id === task.id ? task : item) : [task, ...current]); setShowTaskForm(false); setNotice(mode === 'edit' ? 'Tarea actualizada.' : 'Nueva tarea guardada en tu espacio.'); }} />}
    {showNoteForm && <NoteModal note={editingNote} onClose={() => { setShowNoteForm(false); setEditingNote(null); }} onSave={saveNote} />}
    {deletingNote && <ConfirmModal title="¿Eliminar esta nota?" description="Esta acción quitará la nota de tu espacio." onClose={() => setDeletingNote(null)} onConfirm={() => { void deleteNote(deletingNote); }} />}
  </div>;
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) { return <div className="page-intro"><div><div className="eyebrow"><Leaf size={14} />{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>; }

function Dashboard({ tasks, habits, completedToday, dailyProgress, overdue, greeting, firstName, onNavigate, onToggle, onNewTask }: { tasks: Task[]; habits: Habit[]; completedToday: number; dailyProgress: number; overdue: number; greeting: string; firstName: string; onNavigate: (view: View) => void; onToggle: (task: Task) => void; onNewTask: () => void }) {
  const openTasks = tasks.filter((task) => task.status !== 'completada');
  const sorted = [...openTasks].sort((a, b) => { const rank: Record<Priority, number> = { urgente: 0, alta: 1, media: 2, baja: 3 }; return rank[a.priority] - rank[b.priority] || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'); });
  const attention = sorted.slice(0, 4);
  const todayTasks = tasks.filter((task) => task.due_date === today).slice(0, 4);
  return <div className="page-wrap"><div className="hero-banner"><div><div className="eyebrow light"><Sparkles size={14} />{greeting}, {firstName}</div><h1>Un poquito cada día<br /><em>hace crecer tu mundo.</em></h1><p>Hoy es un buen momento para cuidar de tus planes, sin prisa.</p><button className="primary-button cream" onClick={onNewTask}><Plus size={17} />Nueva tarea</button></div><div className="hero-character"><div className="sun-glow" /><span>🦊</span><div className="character-caption">“¡Tenemos nuevas<br />aventuras por delante!”</div></div></div>
    <div className="stats-grid"><StatCard icon={<ListChecks />} value={openTasks.length} label="Tareas pendientes" tone="sage" /><StatCard icon={<CheckCircle2 />} value={completedToday} label="Completadas hoy" tone="butter" /><StatCard icon={<Clock3 />} value={overdue} label="Necesitan atención" tone="rose" /><StatCard icon={<Target />} value={`${dailyProgress}%`} label="Progreso del día" tone="forest" progress={dailyProgress} /></div>
    <div className="content-grid"><section className="panel attention-panel"><PanelHeading icon={<Sparkles />} title="Lo que necesita mi atención" action={<button className="text-button" onClick={() => onNavigate('tareas')}>Ver todas <ArrowRight size={14} /></button>} /><div className="attention-list">{attention.length ? attention.map((task) => <TaskRow key={task.id} task={task} onToggle={() => onToggle(task)} />) : <EmptyState text="Todo está tranquilo por aquí. Es un buen momento para descansar." />}</div></section><section className="panel agenda-panel"><PanelHeading icon={<CalendarDays />} title="Agenda de hoy" action={<button className="text-button" onClick={() => onNavigate('calendario')}>Abrir calendario <ArrowRight size={14} /></button>} /><div className="timeline">{todayTasks.length ? todayTasks.map((task) => <div className="timeline-item" key={task.id}><span className="time-label">{task.start_time?.slice(0, 5) ?? 'Hoy'}</span><div className={`timeline-dot ${task.status === 'completada' ? 'done' : ''}`} /><div className="timeline-card"><strong>{task.title}</strong><span>{task.estimated_minutes} min · {task.category}</span></div>{task.status === 'completada' && <Check size={15} />}</div>) : <EmptyState text="Tu agenda está despejada. Añade algo bonito para hoy." />}</div></section></div>
    <div className="lower-grid"><section className="panel habit-preview"><PanelHeading icon={<Sprout />} title="Pequeños hábitos" action={<button className="text-button" onClick={() => onNavigate('habitos')}>Ver hábitos <ArrowRight size={14} /></button>} /><div className="habit-chips">{habits.slice(0, 3).map((habit) => <div className={`habit-chip ${habit.completed_today ? 'done' : ''}`} key={habit.id}><span style={{ background: habit.color }}><Sprout size={15} /></span><div><strong>{habit.name}</strong><small>{habit.current_streak} días de racha</small></div>{habit.completed_today ? <CheckCircle2 size={17} /> : <span className="habit-empty" />}</div>)}</div></section><section className="panel motivation-card"><div className="motivation-icon"><Heart size={20} /></div><div><span className="eyebrow">Una pausa amable</span><h3>Tu ritmo también cuenta.</h3><p>No tienes que hacerlo todo hoy. Elige una cosa importante y empieza por ahí.</p></div><div className="leaf-decoration">✿</div></section></div>
  </div>;
}

function StatCard({ icon, value, label, tone, progress }: { icon: React.ReactNode; value: string | number; label: string; tone: string; progress?: number }) { return <div className={`stat-card ${tone}`}><div className="stat-icon">{icon}</div><div><strong>{value}</strong><span>{label}</span></div>{progress !== undefined && <div className="ring-progress" style={{ '--progress': `${progress * 3.6}deg` } as React.CSSProperties}><i>{progress}%</i></div>}</div>; }
function PanelHeading({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) { return <div className="panel-heading"><h2><span>{icon}</span>{title}</h2>{action}</div>; }
function EmptyState({ text }: { text: string }) { return <div className="empty-state"><Flower2 size={22} /><p>{text}</p></div>; }
function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) { return <div className="task-row"><button className={`check-task ${task.status === 'completada' ? 'checked' : ''}`} onClick={onToggle} aria-label="Completar tarea">{task.status === 'completada' && <Check size={13} />}</button><div className="task-info"><strong>{task.title}</strong><span><i className={`category-dot ${task.category === 'Trabajo' ? 'work' : task.category === 'Estudio' ? 'study' : 'personal'}`} />{task.category} · {task.due_date ? formatShortDate(task.due_date) : 'Sin fecha'} · {task.estimated_minutes} min</span></div><span className={`priority-tag ${priorityTone[task.priority]}`}>{priorityLabel[task.priority]}</span></div>; }

function TasksView({ tasks, onToggle, onDelete, onEdit, onNewTask }: { tasks: Task[]; onToggle: (task: Task) => void; onDelete: (id: string) => void; onEdit: (task: Task) => void; onNewTask: () => void }) {
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('Todas');
  const filtered = tasks.filter((task) => (filter === 'Todas' || task.category === filter) && task.title.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-wrap"><PageIntro eyebrow="Lista de tareas" title="Todo lo que quieres cuidar." description="Organiza tus pendientes con calma y elige qué merece tu atención primero." action={<button className="primary-button" onClick={onNewTask}><Plus size={17} />Nueva tarea</button>} /><div className="toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar una tarea..." /></div><div className="filter-select"><Filter size={16} /><select value={filter} onChange={(event) => setFilter(event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></div></div><section className="panel task-table"><div className="table-head"><span>Tarea</span><span>Categoría</span><span>Fecha</span><span>Prioridad</span><span>Acciones</span></div>{filtered.length ? filtered.map((task) => <div className="table-row" key={task.id}><div className="table-task"><button className={`check-task ${task.status === 'completada' ? 'checked' : ''}`} onClick={() => onToggle(task)}>{task.status === 'completada' && <Check size={13} />}</button><div><strong className={task.status === 'completada' ? 'strike' : ''}>{task.title}</strong><small>{task.description || `${task.estimated_minutes} minutos estimados`}</small></div></div><span className="table-category"><i className="category-dot personal" />{task.category}</span><span>{task.due_date ? formatShortDate(task.due_date) : 'Sin fecha'}</span><span className={`priority-tag ${priorityTone[task.priority]}`}>{priorityLabel[task.priority]}</span><div className="row-actions"><button onClick={() => onEdit(task)} aria-label="Editar tarea"><Pencil size={15} /></button><button onClick={() => onDelete(task.id)} aria-label="Eliminar tarea"><Trash2 size={15} /></button></div></div>) : <EmptyState text="No hay tareas que coincidan con tu búsqueda." />}</section></div>;
}

function CalendarView({ tasks, onToggle }: { tasks: Task[]; onToggle: (task: Task) => void }) { const [offset, setOffset] = useState(0); const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + offset); const year = base.getFullYear(); const month = base.getMonth(); const days = new Date(year, month + 1, 0).getDate(); const first = new Date(year, month, 1).getDay(); const monthName = base.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }); const cells = Array.from({ length: first === 0 ? 6 : first - 1 }, (_, index) => <div className="calendar-cell muted" key={`empty-${index}`} />); for (let day = 1; day <= days; day += 1) { const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const dayTasks = tasks.filter((task) => task.due_date === date); cells.push(<div className={`calendar-cell ${date === today ? 'today' : ''}`} key={date}><span>{day}</span>{dayTasks.slice(0, 3).map((task) => <button key={task.id} className={`calendar-task ${task.status === 'completada' ? 'done' : ''}`} onClick={() => onToggle(task)}>{task.title}</button>)}{dayTasks.length > 3 && <small>+{dayTasks.length - 3} más</small>}</div>); } return <div className="page-wrap"><PageIntro eyebrow="Calendario" title="Tu tiempo, con espacio para respirar." description="Mira tus tareas de un vistazo y deja que cada día tenga su propio ritmo." action={<button className="primary-button" onClick={() => window.alert('Usa Nueva tarea desde Mis tareas para añadir una actividad.') }><Plus size={17} />Añadir actividad</button>} /><section className="panel calendar-panel"><div className="calendar-toolbar"><button className="circle-button" onClick={() => setOffset((value) => value - 1)}><ChevronLeft size={18} /></button><h2>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</h2><button className="circle-button" onClick={() => setOffset((value) => value + 1)}><ChevronRight size={18} /></button><button className="today-button" onClick={() => setOffset(0)}>Hoy</button></div><div className="weekdays">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells}</div></section></div>; }

function HabitsView({ habits, completions, onToggle, onAdd }: { habits: Habit[]; completions: HabitCompletion[]; onToggle: (habit: Habit) => void; onAdd: () => void }) {
  const week = getCurrentWeekDates();
  return <div className="page-wrap"><PageIntro eyebrow="Rituales suaves" title="Hábitos que te hacen bien." description="La constancia no tiene que ser perfecta. Celebra cada vez que vuelves a ti." action={<button className="primary-button" onClick={onAdd}><Plus size={17} />Nuevo hábito</button>} /><div className="habit-hero panel"><div><div className="eyebrow"><Sprout size={14} />Esta semana</div><h2>Tu jardín interior está creciendo.</h2><p>Has cuidado tus hábitos con cariño. Sigue a tu propio ritmo.</p></div><div className="habit-bloom">🌿<span>✿</span>🌼</div></div><div className="habit-grid">{habits.map((habit) => <div className={`habit-card ${habit.completed_today ? 'completed' : ''}`} key={habit.id}><div className="habit-card-top"><span className="habit-icon" style={{ background: habit.color }}><Sprout size={20} /></span><button className={`habit-check ${habit.completed_today ? 'checked' : ''}`} onClick={() => onToggle(habit)}>{habit.completed_today && <Check size={15} />}</button></div><h3>{habit.name}</h3><span>{habit.frequency}</span><div className="streak"><Zap size={15} /><strong>{habit.current_streak}</strong> días de racha</div><div className="week-dots">{week.map((date) => <i className={completions.some((item) => item.habit_id === habit.id && item.completed_on === date) ? 'filled' : ''} key={date}>{weekdayLetter(date)}</i>)}</div></div>)}</div></div>;
}

function StatsView({ tasks, completedToday, reflections, onAddReflection, onEditReflection }: { tasks: Task[]; completedToday: number; reflections: Reflection[]; onAddReflection: () => void; onEditReflection: (reflection: Reflection) => void }) {
  const completedTasks = tasks.filter((task) => task.status === 'completada');
  const completed = completedTasks.length;
  const minutes = completedTasks.reduce((sum, task) => sum + task.estimated_minutes, 0);
  const weekDates = getCurrentWeekDates();
  const weekdayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const weekCounts = weekDates.map((date) => completedTasks.filter((task) => taskCompletedOn(task) === date).length);
  const max = Math.max(...weekCounts, 1);
  const categoryMinutes = ['Proyectos personales', 'Estudio', 'Salud y bienestar'].map((category) => completedTasks.filter((task) => task.category === category).reduce((sum, task) => sum + task.estimated_minutes, 0));
  const maxCategoryMinutes = Math.max(...categoryMinutes, 1);
  return <div className="page-wrap"><PageIntro eyebrow="Tu recorrido" title="Progreso sin presión." description="Las cifras son solo una forma de observarte, nunca una medida de tu valor." /><div className="stats-large-grid"><div className="panel big-stat"><span className="eyebrow">Tareas completadas</span><strong>{completed}</strong><p>{completedToday} hoy · sigue a tu ritmo</p><div className="bar-chart">{weekCounts.map((count, index) => <div key={weekDates[index]}><i style={{ height: `${Math.max(count ? 18 : 4, count / max * 100)}%` }} /><small>{weekdayLabels[index]}</small></div>)}</div></div><div className="panel big-stat"><span className="eyebrow">Tiempo cuidado</span><strong>{Math.floor(minutes / 60)}h <small>{minutes % 60}m</small></strong><p>Invertido en tus prioridades</p><div className="category-bars">{['Personal', 'Estudio', 'Bienestar'].map((label, index) => <div key={label}><span>{label}</span><i><b style={{ width: `${categoryMinutes[index] / maxCategoryMinutes * 100}%` }} /></i></div>)}</div></div></div><section className="reflection panel"><div className="reflection-icon"><Feather size={20} /></div><div><span className="eyebrow">Pausa de reflexión</span><h2>¿Qué te gustaría recordar de esta semana?</h2><p>Escribe una frase para reconocer lo que sí hiciste y elegir tu próximo pequeño paso.</p><button className="text-button" onClick={onAddReflection}>Añadir reflexión <ArrowRight size={14} /></button></div></section>{reflections.length > 0 && <section className="reflection-history"><div className="panel-heading"><h2><span><Feather size={17} /></span>Reflexiones anteriores</h2></div>{reflections.map((reflection) => <button className="reflection-history-row" key={reflection.id} onClick={() => onEditReflection(reflection)}><span>Semana del {formatShortDate(reflection.week_key)}</span><strong>{reflection.priority || reflection.achieved || 'Reflexión guardada'}</strong><Pencil size={14} /></button>)}</section>}</div>;
}

function NotesView({ notes, onAdd, onEdit, onDelete }: { notes: Note[]; onAdd: () => void; onEdit: (note: Note) => void; onDelete: (note: Note) => void }) { return <div className="page-wrap"><PageIntro eyebrow="Papelería personal" title="Ideas que merecen un rincón." description="Guarda pensamientos, recordatorios y pequeñas inspiraciones para volver a ellos cuando quieras." action={<button className="primary-button" onClick={onAdd}><Plus size={17} />Nueva nota</button>} /><div className="notes-grid">{notes.map((note) => <article className="note-card" style={{ background: note.color }} key={note.id}>{note.pinned && <Pin className="note-pin" size={15} />}<div className="note-actions"><button onClick={() => onEdit(note)} aria-label="Editar nota"><Pencil size={15} /></button><button onClick={() => onDelete(note)} aria-label="Eliminar nota"><Trash2 size={15} /></button></div><span>{note.category}</span><h3>{note.title}</h3><p>{note.body}</p><small>{formatShortDate(note.created_at.slice(0, 10))}</small></article>)}{!notes.length && <EmptyState text="Tu espacio de ideas está esperando su primera nota." />}</div></div>; }

function NoteModal({ note, onClose, onSave }: { note: Note | null; onClose: () => void; onSave: (note: Omit<Note, 'id' | 'created_at'>, existing: Note | null) => void }) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [category, setCategory] = useState(note?.category ?? 'Ideas');
  const [color, setColor] = useState(note?.color ?? '#F2E4A8');
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="task-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow"><StickyNote size={14} />{note ? 'Editar nota' : 'Nueva nota'}</span><h2>{note ? 'Ajusta tu idea.' : 'Guarda una idea.'}</h2></div><button className="close-button" onClick={onClose}><X size={18} /></button></div><label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label><label>Contenido<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} /></label><div className="form-grid"><label>Categoría<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Ideas</option><option>Recordatorio</option><option>Inspiración</option><option>Personal</option></select></label><label>Color<div className="note-color-options">{['#F2E4A8', '#DCE8D6', '#F3D5CE', '#C7D8DF', '#E6D5BD'].map((option) => <button type="button" key={option} aria-label={`Elegir color ${option}`} className={color === option ? 'selected' : ''} style={{ background: option }} onClick={() => setColor(option)} />)}</div></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="button" className="primary-button" disabled={!title.trim()} onClick={() => onSave({ title: title.trim(), body, category, color, pinned: note?.pinned ?? false }, note)}>Guardar nota</button></div></div></div>;
}

function ConfirmModal({ title, description, onClose, onConfirm }: { title: string; description: string; onClose: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="task-modal confirm-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow"><Trash2 size={14} />Confirmación</span><h2>{title}</h2></div><button className="close-button" onClick={onClose}><X size={18} /></button></div><p>{description}</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="button" className="danger-button" onClick={onConfirm}>Eliminar nota</button></div></div></div>;
}

function ProfileModal({ profile, onClose, onSave }: { profile: Profile | null; onClose: () => void; onSave: (displayName: string, avatarColor: string) => void }) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? 'Mara');
  const [avatarColor, setAvatarColor] = useState(profile?.avatar_color ?? '#8FA58A');
  const avatarColors = ['#E8C8C1', '#C5D3B7', '#F2E4A8', '#C7D8DF', '#DFC9B0', '#BFD2C4', '#E7B5A5', '#D6C7E1', '#C7D5E8', '#E5D6B8', '#B8C4B0', '#F0C9D3'];
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="task-modal profile-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow"><Heart size={14} />Tu perfil</span><h2>Hazlo tuyo.</h2></div><button className="close-button" onClick={onClose}><X size={18} /></button></div><label>Nombre<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label><label>Elige tu avatar<div className="avatar-options">{avatarColors.map((color) => <button type="button" aria-label="Elegir color de avatar" className={avatarColor === color ? 'selected' : ''} key={color} style={{ background: color }} onClick={() => setAvatarColor(color)} />)}</div></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="button" className="primary-button" onClick={() => onSave(displayName, avatarColor)}>Guardar perfil</button></div></div></div>;
}

function ReflectionModal({ reflection, onClose, onSave }: { reflection: Reflection | null; onClose: () => void; onSave: (reflection: Omit<Reflection, 'id'>, existing: Reflection | null) => void }) {
  const [values, setValues] = useState({ achieved: reflection?.achieved ?? '', difficult: reflection?.difficult ?? '', learned: reflection?.learned ?? '', improve: reflection?.improve ?? '', priority: reflection?.priority ?? '' });
  const update = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="task-modal reflection-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow"><Feather size={14} />Semana del {formatShortDate(getWeekKey())}</span><h2>Un momento para mirar atrás.</h2></div><button className="close-button" onClick={onClose}><X size={18} /></button></div><label>¿Qué logré esta semana?<textarea value={values.achieved} onChange={(event) => update('achieved', event.target.value)} rows={2} placeholder="Reconoce tus pequeños avances..." /></label><label>¿Qué fue lo más difícil?<textarea value={values.difficult} onChange={(event) => update('difficult', event.target.value)} rows={2} /></label><label>¿Qué aprendí?<textarea value={values.learned} onChange={(event) => update('learned', event.target.value)} rows={2} /></label><label>¿Qué quiero mejorar la próxima semana?<textarea value={values.improve} onChange={(event) => update('improve', event.target.value)} rows={2} /></label><label>¿Cuál será mi prioridad?<input value={values.priority} onChange={(event) => update('priority', event.target.value)} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="button" className="primary-button" onClick={() => onSave({ ...values, week_key: reflection?.week_key ?? getWeekKey() }, reflection)}>Guardar reflexión</button></div></div></div>;
}

function TaskModal({ task, onClose, onSaved }: { task: Task | null; onClose: () => void; onSaved: (task: Task, mode: 'new' | 'edit') => void }) { const [title, setTitle] = useState(task?.title ?? ''); const [description, setDescription] = useState(task?.description ?? ''); const [category, setCategory] = useState(task?.category ?? 'Otros'); const [priority, setPriority] = useState<Priority>(task?.priority ?? 'media'); const [dueDate, setDueDate] = useState(task?.due_date ?? today); const [minutes, setMinutes] = useState(String(task?.estimated_minutes ?? 30)); const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'pendiente'); const [saving, setSaving] = useState(false); async function save(event: FormEvent) { event.preventDefault(); if (!title.trim()) return; setSaving(true); const payload = { title: title.trim(), description, category, priority, due_date: dueDate || null, estimated_minutes: Number(minutes) || 30, status, completed_at: status === 'completada' ? new Date().toISOString() : null }; const response = task ? await supabase.from('cozy_tasks').update(payload).eq('id', task.id).select().maybeSingle() : await supabase.from('cozy_tasks').insert(payload).select().maybeSingle(); setSaving(false); if (response.error || !response.data) return; onSaved(response.data as Task, task ? 'edit' : 'new'); } return <div className="modal-backdrop" onMouseDown={onClose}><div className="task-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow"><Sparkles size={14} />{task ? 'Editar tarea' : 'Nueva aventura'}</span><h2>{task ? 'Ajusta los detalles' : '¿Qué quieres cuidar hoy?'}</h2></div><button className="close-button" onClick={onClose}><X size={18} /></button></div><form onSubmit={save}><label>Nombre de la tarea<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Por ejemplo, preparar la presentación" autoFocus /></label><label>Descripción <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Un detalle para ayudarte a empezar..." rows={3} /></label><div className="form-grid"><label>Categoría<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label><label>Prioridad<select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>{Object.keys(priorityLabel).map((item) => <option key={item} value={item}>{priorityLabel[item as Priority]}</option>)}</select></label><label>Fecha límite<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><label>Tiempo estimado<select value={minutes} onChange={(event) => setMinutes(event.target.value)}>{['15', '30', '45', '60', '90', '120'].map((item) => <option key={item} value={item}>{item} minutos</option>)}</select></label></div><label>Estado<select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}><option value="pendiente">Pendiente</option><option value="en progreso">En progreso</option><option value="completada">Completada</option></select></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Guardando...' : task ? 'Guardar cambios' : 'Añadir a mi espacio'}</button></div></form></div></div>; }

function localDate(date = new Date()) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
function taskCompletedOn(task: Task) { return task.completed_at ? localDate(new Date(task.completed_at)) : task.status === 'completada' ? task.due_date : null; }
function getWeekKey(date = new Date()) { const local = new Date(date.getFullYear(), date.getMonth(), date.getDate()); const day = local.getDay() || 7; local.setDate(local.getDate() - day + 1); return localDate(local); }
function getCurrentWeekDates() { const start = new Date(`${getWeekKey()}T12:00:00`); return Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return localDate(date); }); }
function weekdayLetter(value: string) { return ['D', 'L', 'M', 'X', 'J', 'V', 'S'][new Date(`${value}T12:00:00`).getDay()]; }
function xpForMinutes(minutes: number) { return minutes <= 30 ? 5 : minutes <= 60 ? 10 : 20; }
function getGardenStage(xp: number) { return gardenThresholds.reduce((stage, threshold, index) => xp >= threshold ? index : stage, 0); }
function formatShortDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }); }

export default App;
