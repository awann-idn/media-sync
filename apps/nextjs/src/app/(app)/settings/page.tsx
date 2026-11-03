import { prisma } from "@mediasync/db";

import { PageHeader } from "~/components/ui/page-header";
import { StatusBadge } from "~/components/ui/status-badge";
import { formatDate } from "~/lib/format";
import { initials } from "~/lib/utils";
import { requireUser } from "~/server/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const current = await requireUser();
  const [project, users] = await Promise.all([
    prisma.project.findFirst(),
    prisma.user.findMany({
      include: { role: true, secondaryRole: true },
      orderBy: [{ accessLevel: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Pengaturan"
        title="Proyek & anggota"
        description="Konfigurasi inti proyek, peran, dan aturan kolaborasi yang dipakai seluruh modul."
      />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="card-surface p-5">
          <h2 className="text-base font-semibold text-ink">Profil proyek</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Nama proyek
              </dt>
              <dd className="mt-1 font-medium text-ink">{project?.name ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Tujuan produk
              </dt>
              <dd className="mt-1 leading-6 text-ink">{project?.productGoal ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Profil audiens
              </dt>
              <dd className="mt-1 leading-6 text-ink">
                {project?.audienceProfile ?? "-"}
              </dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={project?.goalConfirmed ? "done" : "idle"}>
                Tujuan {project?.goalConfirmed ? "terkonfirmasi" : "belum"}
              </StatusBadge>
              <StatusBadge tone={project?.audienceConfirmed ? "done" : "idle"}>
                Audiens {project?.audienceConfirmed ? "terkonfirmasi" : "belum"}
              </StatusBadge>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Target selesai
              </dt>
              <dd className="mt-1 font-medium text-ink">
                {project ? formatDate(project.officialEnd) : "-"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="card-surface p-5">
          <h2 className="text-base font-semibold text-ink">Aturan inti</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-ink-muted">
            <li className="rounded-lg bg-forest-50 px-3 py-2">
              <strong className="text-ink">Diagnosa sebelum sanksi.</strong> Tanya
              kendala, sesuaikan beban, baru beri peringatan.
            </li>
            <li className="rounded-lg bg-forest-50 px-3 py-2">
              <strong className="text-ink">Referensi sebelum ide.</strong> Tujuan
              produk dan audiens dikunci sebelum menilai ide.
            </li>
            <li className="rounded-lg bg-forest-50 px-3 py-2">
              <strong className="text-ink">Keputusan mengikat.</strong> Desain
              dibekukan; perubahan hanya lewat rapat tercatat.
            </li>
          </ul>
          <p className="mt-4 text-xs text-ink-muted">
            Masuk sebagai {current.name} · {current.role.name}
          </p>
        </section>
      </div>

      <section className="card-surface mt-6 overflow-hidden">
        <div className="border-b border-cream-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">Anggota tim</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Maksimal dua anggota boleh merangkap peran. Backup mengikuti pasangan
            PM↔QC, CD↔PM, GD↔AVE.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Peran utama</th>
                <th>Peran cadangan</th>
                <th>Akses</th>
                <th>Persetujuan PM</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ backgroundColor: user.avatarColor }}
                      >
                        {initials(user.name)}
                      </span>
                      <div>
                        <p className="font-medium text-ink">{user.name}</p>
                        <p className="text-xs text-ink-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-ink">{user.role.name}</td>
                  <td className="text-ink-muted">
                    {user.secondaryRole?.name ?? "—"}
                  </td>
                  <td>
                    <StatusBadge tone={user.accessLevel === "MEMBER" ? "done" : "review"}>
                      {user.accessLevel === "MEMBER" ? "Anggota" : "Observer"}
                    </StatusBadge>
                  </td>
                  <td>
                    {user.pmApprovedByAll ? (
                      <StatusBadge tone="done" withDot={false}>
                        Terverifikasi
                      </StatusBadge>
                    ) : (
                      <span className="text-xs text-ink-muted">Belum</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
