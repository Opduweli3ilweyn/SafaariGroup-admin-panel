-- 1. Update Tickets Table
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS origin_id UUID REFERENCES public.locations(id);
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS destination_id UUID REFERENCES public.locations(id);
ALTER TABLE public.tickets ALTER COLUMN route_id DROP NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN seat_number DROP NOT NULL;

-- 2. Update Cargo Shipments Table
ALTER TABLE public.cargo_shipments ADD COLUMN IF NOT EXISTS origin_id UUID REFERENCES public.locations(id);
ALTER TABLE public.cargo_shipments ADD COLUMN IF NOT EXISTS destination_id UUID REFERENCES public.locations(id);
ALTER TABLE public.cargo_shipments ALTER COLUMN route_id DROP NOT NULL;

-- 3. Ensure Price tracking is robust
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS price_paid NUMERIC;
ALTER TABLE public.cargo_shipments ADD COLUMN IF NOT EXISTS price_paid NUMERIC;
