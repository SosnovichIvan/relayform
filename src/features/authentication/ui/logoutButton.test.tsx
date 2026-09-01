import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { LogoutButton } from './logoutButton';
const push = vi.fn(); const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
it('logs out and returns to login', async () => { vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline'))); render(<LogoutButton />); fireEvent.click(screen.getByRole('button', { name: 'Выйти' })); await waitFor(() => expect(push).toHaveBeenCalledWith('/login')); expect(refresh).toHaveBeenCalled(); });
