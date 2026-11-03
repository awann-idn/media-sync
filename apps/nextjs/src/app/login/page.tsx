import { prisma } from "@mediasync/db";

import { switchUser } from "~/server/actions/auth";
import { initials } from "~/lib/utils";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const [project, users] = await Promise.all([
    prisma.project.findFirst(),
    prisma.user.findMany({
      include: { role: true, secondaryRole: true },
      orderBy: [{ accessLevel: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="relative overflow-hidden bg-forest px-6 py-10 text-cream-card sm:px-10 lg:min-h-screen lg:px-14 lg:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-cream-card/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full border border-cream-card/10"
        />
        <div className="relative flex h-full flex-col">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cream-card text-sm font-bold text-forest">
              MS
            </span>
            <div>
              <p className="font-heading text-lg font-bold">MediaSync</p>
              <p className="text-xs text-cream-card/70">
                Kolaborasi tim multimedia
              </p>
            </div>
          </div>

          <div className="mt-14 max-w-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sage">
              Ruang kerja produksi
            </p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
              Kerja tim yang terlihat, adil, dan terdokumentasi.
            </h1>
            <p className="mt-4 text-sm leading-6 text-cream-card/80">
              MediaSync menyatukan pembagian tugas, keputusan visual, evaluasi
              kontribusi, dan catatan rapat dalam satu tempat. Fokus pada
              diagnosa sebelum sanksi, referensi sebelum ide.
            </p>
          </div>

          <ul className="mt-10 space-y-3 text-sm text-cream-card/85">
            {[
              "Tugas dan ketergantungan yang transparan",
              "Keputusan visual yang dibekukan dan bisa diaudit",
              "Evaluasi kontribusi dengan jalur dukungan bertingkat",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sage" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-12 text-xs text-cream-card/60">
            Mode demo · Data contoh untuk {project?.name ?? "proyek multimedia"}
          </div>
        </div>
      </section>

      <section className="px-6 py-10 sm:px-10 lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div className="mx-auto w-full max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest">
            Akses demo
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">
            Pilih pengguna untuk masuk
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Autentikasi Clerk disiapkan untuk produksi. Untuk demo hari ini,
            pilih salah satu anggota tim di bawah. Observer hanya dapat membaca.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {users.map((user) => (
              <form key={user.id} action={switchUser}>
                <input type="hidden" name="userId" value={user.id} />
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-card border border-cream-line bg-paper p-3 text-left transition-colors hover:border-forest hover:bg-forest-50 focus-visible:ring-2 focus-visible:ring-forest"
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: user.avatarColor }}
                  >
                    {initials(user.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {user.name}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">
                      {user.accessLevel === "OBSERVER"
                        ? "Observer · hanya baca"
                        : user.role.name}
                    </span>
                  </span>
                </button>
              </form>
            ))}
          </div>

          <p className="mt-6 rounded-lg border border-sage bg-forest-50 px-3 py-2 text-xs leading-5 text-ink-muted">
            Data seed mencakup 11 tugas, 3 ide desain, evaluasi pra-produksi,
            satu rapat kickoff, dan satu konflik terbuka.
          </p>
        </div>
      </section>
    </div>
  );
}
