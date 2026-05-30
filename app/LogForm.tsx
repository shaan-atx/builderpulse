'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogForm() {
  const router = useRouter();
  const today  = new Date().toISOString().split('T')[0];

  const [date,   setDate]   = useState(today);
  const [tokens, setTokens] = useState('');
  const [source, setSource] = useState('claude.ai');
  const [note,   setNote]   = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');

    const res = await fetch('/api/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, tokens_estimated: Number(tokens), source, note: note || undefined }),
    });

    if (res.ok) {
      setTokens('');
      setNote('');
      setStatus('done');
      setTimeout(() => { setStatus('idle'); router.refresh(); }, 1500);
    } else {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }

  const inputCls = 'bg-[#0d1117] border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500';

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <input type="date"   value={date}   onChange={e => setDate(e.target.value)}   className={inputCls} />
      <input type="number" value={tokens} onChange={e => setTokens(e.target.value)} className={inputCls} placeholder="Tokens estimated" min={1} required />
      <select value={source} onChange={e => setSource(e.target.value)} className={inputCls}>
        <option value="claude.ai">claude.ai</option>
        <option value="chatgpt">ChatGPT</option>
        <option value="other">Other</option>
      </select>
      <input type="text" value={note} onChange={e => setNote(e.target.value)} className={inputCls} placeholder="Note (optional)" />
      <button
        type="submit"
        disabled={status === 'saving' || !tokens}
        className="sm:col-span-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
      >
        {status === 'saving' ? 'Saving…' : status === 'done' ? 'Saved!' : status === 'error' ? 'Error — try again' : 'Log session'}
      </button>
    </form>
  );
}
