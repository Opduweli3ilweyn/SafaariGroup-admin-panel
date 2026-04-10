-- Create cargo_rates table to store route-specific prices for cargo categories
CREATE TABLE IF NOT EXISTS public.cargo_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.cargo_categories(id) ON DELETE CASCADE,
    origin_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    destination_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    price_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, origin_id, destination_id)
);

-- Enable RLS
ALTER TABLE public.cargo_rates ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for authenticated users
-- Note: Adjust policy if you need stricter control
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cargo_rates' AND policyname = 'Enable all for authenticated users'
    ) THEN
        CREATE POLICY "Enable all for authenticated users" ON public.cargo_rates
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;
