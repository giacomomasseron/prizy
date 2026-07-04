import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/apiClient';
import { useLogin } from './useAuth';

export default function LoginPage() {
    const navigate = useNavigate();
    const login = useLogin();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [message, setMessage] = useState<string | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setErrors({});
        setMessage(null);
        try {
            await login.mutateAsync({ email, password });
            navigate('/');
        } catch (err) {
            if (err instanceof ApiError) {
                setErrors(err.errors ?? {});
                setMessage(err.detail);
            }
        }
    }

    return (
        <div className="mx-auto mt-24 max-w-sm rounded-lg border border-border bg-panel p-6 shadow-sm">
            <h1 className="mb-4 text-xl font-semibold">Log in</h1>
            <form onSubmit={submit} className="space-y-3">
                <div>
                    <label htmlFor="email" className="block text-sm">Email</label>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded border border-border px-2 py-1" />
                    {errors.email?.map((m) => <p key={m} className="text-sm text-red">{m}</p>)}
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm">Password</label>
                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded border border-border px-2 py-1" />
                    {errors.password?.map((m) => <p key={m} className="text-sm text-red">{m}</p>)}
                </div>
                {message && <p className="text-sm text-red">{message}</p>}
                <button type="submit" disabled={login.isPending}
                    className="w-full rounded bg-accent py-1.5 text-white disabled:opacity-50">
                    Log in
                </button>
            </form>
        </div>
    );
}
