-- 1. Add branch_id to profiles (Admins)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES locations(id);

-- 2. Add branch_id to tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES locations(id);

-- 3. Add branch_id to cargo_shipments
ALTER TABLE cargo_shipments ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES locations(id);

-- 4. (Optional) Provide a comment for clarity
COMMENT ON COLUMN profiles.branch_id IS 'Associated branch/office for the admin. NULL means Super Admin.';
COMMENT ON COLUMN tickets.branch_id IS 'The branch that registered this ticket.';
COMMENT ON COLUMN cargo_shipments.branch_id IS 'The branch that registered this shipment.';
