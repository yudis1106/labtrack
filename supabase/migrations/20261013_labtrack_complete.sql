-- LabTrack advanced features
-- IMPORTANT: file ini hanya rancangan migration untuk branch feature/labtrack-complete.
-- Jangan jalankan sebelum branch siap diterapkan ke production.

alter table public.alat
  add column if not exists aktif boolean not null default true;

alter table public.pinjaman
  add column if not exists kode_transaksi text,
  add column if not exists kondisi_pengembalian text,
  add column if not exists catatan_pengembalian text;

-- Isi kode transaksi untuk data lama.
update public.pinjaman
set kode_transaksi = 'LT-' ||
  extract(year from coalesce(tanggal_pinjam, created_at::date))::int::text || '-' ||
  lpad(id::text, 5, '0')
where kode_transaksi is null;

create unique index if not exists pinjaman_kode_transaksi_unique
  on public.pinjaman (kode_transaksi)
  where kode_transaksi is not null;

-- Kode transaksi otomatis mengikuti ID pinjaman.
create or replace function public.labtrack_set_kode_transaksi()
returns trigger
language plpgsql
as $$
begin
  if new.kode_transaksi is null or btrim(new.kode_transaksi) = '' then
    new.kode_transaksi := 'LT-' ||
      extract(year from coalesce(new.tanggal_pinjam, current_date))::int::text || '-' ||
      lpad(new.id::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_labtrack_set_kode_transaksi on public.pinjaman;
create trigger trg_labtrack_set_kode_transaksi
before insert on public.pinjaman
for each row
execute function public.labtrack_set_kode_transaksi();

alter table public.pinjaman
  drop constraint if exists pinjaman_kondisi_pengembalian_check;

alter table public.pinjaman
  add constraint pinjaman_kondisi_pengembalian_check
  check (
    kondisi_pengembalian is null or kondisi_pengembalian in (
      'Baik', 'Rusak Ringan', 'Rusak', 'Perlu Diperiksa'
    )
  );
