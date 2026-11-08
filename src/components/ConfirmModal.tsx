import { useEffect } from 'react';
import { Trash2, X } from 'lucide-react';

export default function ConfirmModal({ title, description, confirmLabel, onClose, onConfirm }: { title: string; description: string; confirmLabel: string; onClose: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return <div className="modal-backdrop" onMouseDown={onClose}><div className="task-modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow"><Trash2 size={14} />Confirmación</span><h2 id="confirm-title">{title}</h2></div><button className="close-button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div><p>{description}</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="button" className="danger-button" onClick={onConfirm}>{confirmLabel}</button></div></div></div>;
}
