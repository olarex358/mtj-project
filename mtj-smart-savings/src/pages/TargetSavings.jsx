import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/target.css';

export default function TargetSavings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ title: '', goal_amount: '', duration_months: '6' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [user]);

  async function load() {
    const { data } = await supabase.from('target_savings').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setGoals(data || []);
  }

  async function create(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: goal, error } = await supabase.from('target_savings')
        .insert({ ...form, user_id: user.id, goal_amount: Number(form.goal_amount), duration_months: Number(form.duration_months) })
        .select().single();
      if (error) throw error;

      await supabase.from('wallets').insert({
        user_id: user.id, type: 'target', target_id: goal.id,
        label: goal.title, target_amount: goal.goal_amount,
      });
      
      setForm({ title: '', goal_amount: '', duration_months: '6' });
      load();
      alert('✅ Goal created!');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <header className="target-header">
        <h1>🎯 Target Savings</h1>
        <p className="tagline">Save for what matters most.</p>
      </header>

      <form onSubmit={create} className="card-form">
        <h3 style={{color: 'var(--brand-dark)', marginBottom: '8px'}}>Create New Goal</h3>
        <label>Title <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Rent, Wedding" required /></label>
        <label>Target Amount (₦) <input type="number" value={form.goal_amount} onChange={e => setForm({...form, goal_amount: e.target.value})} required /></label>
        <label>Duration (months) <input type="number" value={form.duration_months} onChange={e => setForm({...form, duration_months: e.target.value})} min="1" required /></label>
        <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Goal'}</button>
      </form>

      <section style={{padding: '0 16px 24px'}}>
        <h3 style={{marginBottom: '12px', color: 'var(--brand-dark)'}}>My Goals</h3>
        {goals.length === 0 ? <p className="empty">No goals yet. Create one above!</p> : (
          <ul className="goal-list">
            {goals.map(g => (
              <li key={g.id} onClick={() => navigate(`/target/${g.id}`)} style={{cursor: 'pointer'}}>
                <strong>{g.title}</strong>
                <span>₦{Number(g.goal_amount).toLocaleString()} · {g.duration_months}mo</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Layout>
  );
}