import { useState } from 'react';
import { Eye, EyeOff, HeartHandshake } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Field } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-aside">
        <div className="login-brand"><span className="brand-mark"><HeartHandshake size={19} /></span><span>kindred<span className="brand-period">.</span></span></div>
        <div className="login-story">
          <p className="eyebrow">DONATION OFFICE</p>
          <h1>Good work, accounted for.</h1>
          <p>One clear view of the people, programs, and resources behind every act of giving.</p>
        </div>
        <div className="login-footnote">A considered way to manage giving.</div>
      </section>
      <section className="login-main">
        <div className="login-card">
          <p className="eyebrow">WELCOME BACK</p>
          <h2>Sign in to Kindred</h2>
          <p>Use your organization account to continue.</p>
          <form className="login-form" onSubmit={submit}>
            <Field label="Email address">
              <input autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@organization.org" required maxLength={255} />
            </Field>
            <Field label="Password">
              <div className="password-wrap">
                <input autoComplete="current-password" type={visible ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required />
                <button type="button" className="password-toggle" title={visible ? 'Hide password' : 'Show password'} aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </Field>
            {error && <div className="login-error" role="alert">{error}</div>}
            <Button type="submit" className="login-submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
          </form>
          <div className="login-foot-mobile">Kindred Donation Office</div>
        </div>
      </section>
    </main>
  );
}