import { AlertCircle, LoaderCircle, Search, X } from 'lucide-react';
import { useEffect } from 'react';

export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function IconButton({ label, children, ...props }) {
  return <button aria-label={label} title={label} className="icon-button" {...props}>{children}</button>;
}

export function SearchBox({ value, onChange, placeholder = 'Search records' }) {
  return (
    <label className="search-box">
      <Search size={17} aria-hidden="true" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && <div className="panel-heading"><h2>{title}</h2>{action}</div>}
      {children}
    </section>
  );
}

export function StateMessage({ loading, error, empty, onRetry }) {
  if (loading) return <div className="state-message"><LoaderCircle className="spin" size={22} />Loading records...</div>;
  if (error) return <div className="state-message state-error"><AlertCircle size={19} /><span>{error}</span>{onRetry && <Button variant="quiet" onClick={onRetry}>Retry</Button>}</div>;
  if (empty) return <div className="state-message">{empty}</div>;
  return null;
}

export function DataTable({ columns, rows, rowKey = 'id', empty = 'No records found.', loading, error, onRetry }) {
  if (loading || error || rows.length === 0) {
    return <StateMessage loading={loading} error={error} empty={rows.length === 0 ? empty : ''} onRetry={onRetry} />;
  }
  return (
    <div className="table-scroll">
      <table>
        <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row[rowKey]}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-heading"><h2 id="modal-title">{title}</h2><IconButton label="Close dialog" onClick={onClose}><X size={18} /></IconButton></header>
        {children}
      </section>
    </div>
  );
}

export function StatusBadge({ value }) {
  const status = String(value || 'unknown').toLowerCase();
  return <span className={`status-badge status-${status}`}>{String(value || 'Unknown').replaceAll('_', ' ')}</span>;
}

export function Field({ label, children, hint }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function Toast({ message, variant = 'success', onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return <div className={`toast ${variant === 'error' ? 'toast-error' : ''}`} role={variant === 'error' ? 'alert' : 'status'}>{message}<button className="toast-close" aria-label="Dismiss notification" onClick={onClose}><X size={15} /></button></div>;
}