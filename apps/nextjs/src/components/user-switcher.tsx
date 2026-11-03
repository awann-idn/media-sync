import { switchUser } from "~/server/actions/auth";
import type { SessionUser } from "~/server/auth";

interface SwitchableUser {
  id: string;
  name: string;
  role: { code: string; name: string };
  accessLevel: string;
}

export function UserSwitcher({
  current,
  users,
}: {
  current: SessionUser;
  users: SwitchableUser[];
}) {
  return (
    <form action={switchUser} className="flex items-center gap-2">
      <label htmlFor="user-switcher" className="sr-only">
        Ganti pengguna demo
      </label>
      <select
        id="user-switcher"
        name="userId"
        defaultValue={current.id}
        className="h-9 max-w-[190px] rounded-lg border border-cream-line bg-paper px-2 text-xs font-medium text-ink"
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} · {user.accessLevel === "OBSERVER" ? "Observer" : user.role.code}
          </option>
        ))}
      </select>
      <button type="submit" className="btn-secondary min-h-9 px-3 py-1.5 text-xs">
        Ganti
      </button>
    </form>
  );
}
