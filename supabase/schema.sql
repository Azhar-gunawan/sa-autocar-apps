-- Skema database SA AUTOCAR (versi 1)
-- Jalankan di SQL Editor Supabase

-- Tabel kategori mobil dan harga
create table car_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Tabel booking cuci mobil
create table bookings (
  id uuid primary key default gen_random_uuid(),
  booking_date date not null,
  booking_time time not null,
  customer_name text not null,
  car_name text not null,
  plate_number text,
  car_type_id uuid references car_types(id),
  price integer not null,
  notes text,
  status text not null default 'booking' check (status in ('booking', 'selesai', 'batal')),
  user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indeks untuk kueri kalender per bulan (kebutuhan non-fungsional performa)
create index idx_bookings_date on bookings(booking_date);
create index idx_bookings_date_status on bookings(booking_date, status);

-- Tabel langganan push (tahap notifikasi, versi 1.2)
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- Data awal kategori (harga disalin ke booking saat dibuat, tidak berubah jika harga kategori diubah)
insert into car_types (name, price, active) values
  ('Mobil Biasa', 170000, true),
  ('Mobil Besar', 200000, true);

-- Row Level Security: satu pemilik (admin), akses penuh tanpa login di versi 1
alter table car_types enable row level security;
alter table bookings enable row level security;
alter table push_subscriptions enable row level security;

create policy "Allow all access to car_types" on car_types
  for all using (true) with check (true);

create policy "Allow all access to bookings" on bookings
  for all using (true) with check (true);

create policy "Allow all access to push_subscriptions" on push_subscriptions
  for all using (true) with check (true);
