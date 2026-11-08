import { Leaf } from 'lucide-react';

export default function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-intro"><div><div className="eyebrow"><Leaf size={14} />{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
