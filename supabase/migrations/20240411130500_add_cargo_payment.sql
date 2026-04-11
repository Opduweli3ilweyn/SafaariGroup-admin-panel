ALTER TABLE cargo_shipments 
ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'pay_at_origin',
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'paid';

-- Optional: update existing records to 'paid' if they don't have these fields
UPDATE cargo_shipments SET payment_type = 'pay_at_origin', payment_status = 'paid' WHERE payment_type IS NULL;
