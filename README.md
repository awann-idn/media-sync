# MediaSync

Ruang kerja kolaborasi tim multimedia: tugas transparan, keputusan terdokumentasi, evaluasi adil, dan konflik yang ditangani berjenjang.

Web MVP untuk tim produksi multimedia 5 orang. Semua copy UI berbahasa Indonesia.

## Modul

- **M1 Dashboard** — kesehatan proyek, on-time, partisipasi, hambatan aktif, deadline berikutnya, dependency flow, kontribusi per anggota, attention feed.
- **M2 Task Board** — Kanban, tabel, linimasa ringan, deadline ganda, state machine, deliverable berversi, riwayat status append-only, deteksi tugas berisiko.
- **M3 Decision Matrix** — 6 langkah keputusan, skor berbobot 7 kriteria, eliminasi ambang FEASIBILITY, consensus/majority/PM tie-break, style guide beku, change request lewat rapat.
- **M4 Evaluasi** — 6 indikator Likert, agregasi 80% sejawat + 20% diri, kategori otomatis, evaluasi anonim, intervention ladder dengan cause code.
- **M5 Rapat & Konflik** — agenda ≥24 jam, notulen, keputusan bernomor immutable, action item → tugas, konflik Level 1–4, Escalation Pack siap cetak.

## Stack

- Next.js 14 App Router + React 18 + TypeScript
- Tailwind CSS (token warna dan tipografi PRD)
- Prisma 6 + PostgreSQL
- Server Actions untuk mutasi, server queries untuk baca
- `packages/shared` untuk rules engine + Vitest

## Menjalankan

Prasyarat: bun, PostgreSQL.

```bash
bun install

# PostgreSQL lokal (contoh binary Windows)
# initdb -D .pgdata -U postgres -A trust -E UTF8
# pg_ctl -D .pgdata -o "-p 5433" -l .pgdata/logfile start
# createdb -p 5433 -U postgres mediasync
```

Buat `.env.local`:

```env
DATABASE_URL="postgresql://postgres@localhost:5433/mediasync?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
DEMO_AUTH=1
```

Siapkan database dan jalankan:

```bash
bun run db:generate
bun run db:push
bun run db:seed
bun run dev
```

Buka <http://localhost:3000>. Login demo memakai pemilih pengguna (cookie), tanpa password:

| Pengguna | Peran | Akses |
| --- | --- | --- |
| Rani | Project Manager | Member |
| Dimas | Audio/Video Editor | Member |
| Salsa | Content Designer | Member |
| Bayu | Graphic Designer | Member |
| Naya | Quality Control | Member |
| Pak Dosen | Quality Control | Observer |

`bun run db:seed` bersifat idempoten dan mengembalikan data demo awal: 11 tugas dengan task-4 terhambat, 3 ide keputusan, evaluasi PRE, rapat kickoff, dan satu konflik Level 1.

## Verifikasi

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

## Struktur

```
apps/nextjs/          aplikasi web (App Router)
packages/db/          Prisma schema, constraints, seed
packages/shared/      rules engine + label + tests
tooling/              konfigurasi Tailwind/ESLint/TypeScript
```

## Catatan demo

- Autentikasi demo berbasis cookie untuk presentasi lokal. Jalur Clerk/Auth.js disiapkan untuk produksi, tetapi belum diaktifkan.
- Escalation Pack berupa halaman HTML siap cetak (Ctrl/Cmd+P), bukan PDF biner.
- Notifikasi push/email belum termasuk di MVP web; peringatan tampil di dashboard.
