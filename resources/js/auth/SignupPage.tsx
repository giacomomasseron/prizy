import { useState } from 'react';
import { ApiError } from '../lib/apiClient';
import { sessionPost } from './useAuth';

export default function SignupPage() {
    const [form, setForm] = useState({ workspace_name: '', slug: '', name: '', email: '', password: '' });
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [done, setDone] = useState(false);

    function set(k: keyof typeof form) {
        return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setErrors({});
        try {
            await sessionPost('/workspaces', form);
            setDone(true);
        } catch (err) {
            if (err instanceof ApiError) setErrors(err.errors ?? {});
        }
    }

    if (done) {
        return <p className="mt-24 text-center">Workspace created. Visit <code>{form.slug}</code>.localhost to log in.</p>;
    }

    return (
        <div className="mx-auto mt-16 max-w-sm rounded-lg border border-border bg-panel p-6 shadow-sm">
            <h1 className="mb-4 text-xl font-semibold">Create a workspace</h1>
            <form onSubmit={submit} className="space-y-3">
                {(['workspace_name', 'slug', 'name', 'email', 'password'] as const).map((field) => (
                    <div key={field}>
                        <label htmlFor={field} className="block text-sm capitalize">{field.replace('_', ' ')}</label>
                        <input id={field} type={field === 'password' ? 'password' : 'text'} value={form[field]}
                            onChange={set(field)} className="w-full rounded border px-2 py-1" />
                        {errors[field]?.map((m) => <p key={m} className="text-sm text-red">{m}</p>)}
                    </div>
                ))}
                <button type="submit" className="w-full rounded bg-accent py-1.5 text-white">Create</button>
            </form>
        </div>
    );
}
