import { useState } from 'react';
import { Eye, Pencil, Plus, UserRoundX } from 'lucide-react';
import { api, dataOf, jsonBody } from '../services/api.js';
import { Button, DataTable, Field, Modal, PageHeading, SearchBox, StateMessage, StatusBadge, Toast } from '../components/ui.jsx';
import { useResource } from '../hooks/useResource.js';
import { useNotice } from '../hooks/useNotice.js';
import { formatDate } from '../utils/format.js';

const emptyForm = { full_name: '', email: '', phone: '', address: '', city: '' };

export default function DonorsPage() {
  const { data, loading, error, reload } = useResource('/donors');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const { notice, notify, clearNotice } = useNotice();
  const donors = (data || []).filter((donor) => [donor.full_name, donor.email, donor.phone, donor.city].join(' ').toLowerCase().includes(search.toLowerCase()));

  function openCreate() {
    setForm(emptyForm);
    setFormError('');
    setDialog({ type: 'form', mode: 'create' });
  }

  function openEdit(donor) {
    setForm({ full_name: donor.full_name || '', email: donor.email || '', phone: donor.phone || '', address: donor.address || '', city: donor.city || '' });
    setFormError('');
    setDialog({ type: 'form', mode: 'edit', donor });
  }

  async function viewDonor(donor) {
    setFormError('');
    setDialog({ type: 'loading' });
    try {
      const details = dataOf(await api(`/donors/${donor.id}`));
      setDialog({ type: 'view', donor: details });
    } catch (requestError) {
      setDialog(null);
      notify(requestError.message, 'error');
    }
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim() || null]));
    try {
      if (dialog.mode === 'create') {
        await api('/donors', { method: 'POST', body: jsonBody(payload) });
        notify('Donor added.');
      } else {
        await api(`/donors/${dialog.donor.id}`, { method: 'PATCH', body: jsonBody(payload) });
        notify('Donor changes saved.');
      }
      setDialog(null);
      reload();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(donor) {
    if (!window.confirm(`Deactivate ${donor.full_name}? Their historical donations will remain.`)) return;
    try {
      await api(`/donors/${donor.id}`, { method: 'DELETE' });
      notify('Donor deactivated.');
      reload();
    } catch (requestError) {
      notify(requestError.message, 'error');
    }
  }

  return (
    <>
      <PageHeading eyebrow="PEOPLE WHO GIVE" title="Donors" action={<Button onClick={openCreate}><Plus size={16} /> Add donor</Button>} />
      <section className="panel">
        <div className="panel-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search name, email, phone or city" /><span className="toolbar-count">{donors.length} records</span></div>
        {loading || error ? <StateMessage loading={loading} error={error} onRetry={reload} /> : <DataTable rows={donors} empty="No donors match this search." columns={[
          { key: 'full_name', label: 'Donor', render: (row) => <><span className="cell-primary">{row.full_name}</span><span className="cell-secondary">{row.email || 'No email'}</span></> },
          { key: 'phone', label: 'Phone', render: (row) => row.phone || '—' },
          { key: 'city', label: 'City', render: (row) => row.city || '—' },
          { key: 'is_active', label: 'Status', render: (row) => <StatusBadge value={row.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
          { key: 'created_at', label: 'Added', render: (row) => formatDate(row.created_at) },
          { key: 'actions', label: '', render: (row) => <div className="cell-actions"><button className="table-action" onClick={() => viewDonor(row)} title="View donor"><Eye size={14} /></button><button className="table-action" onClick={() => openEdit(row)} title="Edit donor"><Pencil size={14} /></button>{row.is_active && <button className="table-action table-action-danger" onClick={() => deactivate(row)} title="Deactivate donor"><UserRoundX size={14} /></button>}</div> },
        ]} />}
      </section>

      {dialog?.type === 'form' && <Modal title={dialog.mode === 'create' ? 'Add donor' : 'Edit donor'} onClose={() => setDialog(null)}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Field label="Full name"><input autoFocus required maxLength={120} value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></Field>
            <Field label="Email"><input type="email" maxLength={255} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label="Phone"><input type="tel" maxLength={30} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <Field label="City"><input maxLength={100} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Field>
            <Field label="Address"><textarea maxLength={255} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
            {formError && <p className="form-error" role="alert">{formError}</p>}
          </div>
          <div className="form-actions"><Button type="button" variant="secondary" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save donor'}</Button></div>
        </form>
      </Modal>}
      {dialog?.type === 'view' && <Modal title="Donor details" onClose={() => setDialog(null)}><div className="details-grid"><Detail label="Full name" value={dialog.donor.full_name} /><Detail label="Status" value={<StatusBadge value={dialog.donor.is_active ? 'ACTIVE' : 'INACTIVE'} />} /><Detail label="Email" value={dialog.donor.email || 'Not provided'} /><Detail label="Phone" value={dialog.donor.phone || 'Not provided'} /><Detail label="City" value={dialog.donor.city || 'Not provided'} /><Detail label="Address" value={dialog.donor.address || 'Not provided'} /><Detail label="Created" value={formatDate(dialog.donor.created_at, true)} /></div><div className="form-actions"><Button variant="secondary" onClick={() => setDialog(null)}>Close</Button></div></Modal>}
      {dialog?.type === 'loading' && <Modal title="Donor details" onClose={() => setDialog(null)}><StateMessage loading /></Modal>}
      {notice && <Toast message={notice.message} variant={notice.variant} onClose={clearNotice} />}
    </>
  );
}

function Detail({ label, value }) { return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>; }