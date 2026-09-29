import { useState } from 'react';
import { Pencil, Plus, UserRoundCheck, UserRoundX } from 'lucide-react';
import { api, jsonBody } from '../services/api.js';
import { Button, DataTable, Field, Modal, PageHeading, SearchBox, StateMessage, StatusBadge, Toast } from '../components/ui.jsx';
import { useResource } from '../hooks/useResource.js';
import { useNotice } from '../hooks/useNotice.js';
import { formatDate, titleCase } from '../utils/format.js';

const blank = { full_name: '', phone: '', address: '', city: '', category: 'OTHER', status: 'ACTIVE' };
const categories = ['EDUCATION', 'MEDICAL', 'FOOD', 'EMERGENCY', 'OTHER'];

export default function BeneficiariesPage() {
  const { data, loading, error, reload } = useResource('/beneficiaries');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const { notice, notify, clearNotice } = useNotice();
  const rows = (data || []).filter((item) => `${item.full_name} ${item.phone || ''} ${item.city || ''} ${item.category}`.toLowerCase().includes(search.toLowerCase()));

  function openForm(item) {
    setForm(item ? { full_name: item.full_name, phone: item.phone || '', address: item.address || '', city: item.city || '', category: item.category, status: item.status } : blank);
    setFormError('');
    setDialog({ item });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = { ...form, full_name: form.full_name.trim(), phone: form.phone.trim() || null, address: form.address.trim() || null, city: form.city.trim() || null };
    try {
      if (dialog.item) {
        await api(`/beneficiaries/${dialog.item.id}`, { method: 'PATCH', body: jsonBody(payload) });
        notify('Beneficiary changes saved.');
      } else {
        await api('/beneficiaries', { method: 'POST', body: jsonBody(payload) });
        notify('Beneficiary added.');
      }
      setDialog(null);
      reload();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item) {
    const nextStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (nextStatus === 'INACTIVE' && !window.confirm(`Deactivate ${item.full_name}?`)) return;
    try {
      await api(`/beneficiaries/${item.id}`, { method: 'PATCH', body: jsonBody({ status: nextStatus }) });
      notify(`Beneficiary ${nextStatus.toLowerCase()}.`);
      reload();
    } catch (requestError) {
      notify(requestError.message, 'error');
    }
  }

  return (
    <>
      <PageHeading eyebrow="PEOPLE AND HOUSEHOLDS SUPPORTED" title="Beneficiaries" action={<Button onClick={() => openForm(null)}><Plus size={16} /> Add beneficiary</Button>} />
      <section className="panel">
        <div className="panel-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search name, phone, city or category" /><span className="toolbar-count">{rows.length} records</span></div>
        {loading || error ? <StateMessage loading={loading} error={error} onRetry={reload} /> : <DataTable rows={rows} empty="No beneficiaries match this search." columns={[
          { key: 'full_name', label: 'Beneficiary', render: (row) => <><span className="cell-primary">{row.full_name}</span><span className="cell-secondary">{row.phone || 'No phone'}</span></> },
          { key: 'category', label: 'Category', render: (row) => titleCase(row.category) },
          { key: 'city', label: 'City', render: (row) => row.city || '—' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
          { key: 'created_at', label: 'Added', render: (row) => formatDate(row.created_at) },
          { key: 'actions', label: '', render: (row) => <div className="cell-actions"><button className="table-action" title="Edit beneficiary" onClick={() => openForm(row)}><Pencil size={14} /></button><button className={`table-action ${row.status === 'ACTIVE' ? 'table-action-danger' : ''}`} title={row.status === 'ACTIVE' ? 'Deactivate beneficiary' : 'Activate beneficiary'} onClick={() => toggleStatus(row)}>{row.status === 'ACTIVE' ? <UserRoundX size={14} /> : <UserRoundCheck size={14} />}</button></div> },
        ]} />}
      </section>
      {dialog && <Modal title={dialog.item ? 'Edit beneficiary' : 'Add beneficiary'} onClose={() => setDialog(null)}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Field label="Full name"><input autoFocus required maxLength={120} value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></Field>
            <Field label="Category"><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category} value={category}>{titleCase(category)}</option>)}</select></Field>
            <Field label="Phone"><input type="tel" maxLength={30} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <Field label="City"><input maxLength={100} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Field>
            <Field label="Address"><textarea maxLength={255} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
            {dialog.item && <Field label="Status"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></Field>}
            {formError && <p className="form-error" role="alert">{formError}</p>}
          </div>
          <div className="form-actions"><Button type="button" variant="secondary" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save beneficiary'}</Button></div>
        </form>
      </Modal>}
      {notice && <Toast message={notice.message} variant={notice.variant} onClose={clearNotice} />}
    </>
  );
}