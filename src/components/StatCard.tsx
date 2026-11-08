export default function StatCard({ icon, value, label, tone, progress }: { icon: React.ReactNode; value: string | number; label: string; tone: string; progress?: number }) {
  return <div className={`stat-card ${tone}`}><div className="stat-icon">{icon}</div><div><strong>{value}</strong><span>{label}</span></div>{progress !== undefined && <div className="ring-progress" style={{ '--progress': `${progress * 3.6}deg` } as React.CSSProperties}><i>{progress}%</i></div>}</div>;
}
