-- 1. Create the approved_drivers table
CREATE TABLE IF NOT EXISTS public.approved_drivers (
    phone TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    plate_number TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Ensure plate_number exists in profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plate_number TEXT;

-- 3. Seed the 15 Drivers into the approved list
INSERT INTO public.approved_drivers (phone, full_name, plate_number)
VALUES 
    ('7716104', 'C.raxman Cumar Cisman (XAMARI)', 'TR SG803'),
    ('7562225', 'Mubarak C.laahi (jumbur)', 'TR SK596'),
    ('7790407', 'C.weli dahir Guure', 'TR HO785'),
    ('7715846', 'Nuur Salax Guuled', 'TR UD365'),
    ('7122606', 'C.fatax Xaashi Foley', 'TR LR441'),
    ('7645983', 'C.weli C.laahi Idorow', 'TR LA123'),
    ('7739210', 'C.qaadir Maxmed Cali Bagag', 'QU557'),
    ('7766004', 'Daahir saacid Cabdi', 'TR VE868'),
    ('7694340', 'Maxmed C.qadir Cisman (Carab)', 'TR RN415'),
    ('7750254', 'Abaadir Muuse Ayax', 'TR GF 811'),
    ('6795070', 'Shaafici Xuseen Shire (Hogalada)', 'TR UX445'),
    ('7766004-2', 'C.wahaab Xashi Foley', 'TR DD993'), -- Fixed duplicate phone suffix
    ('7683633', 'C.Karin C.naasir Cali', 'TR NH757'),
    ('7385390', 'Zakariye Maxamed Maxmud', 'TR FR703'),
    ('7985818', 'Fadhayo', 'TR FG 885')
ON CONFLICT (phone) DO UPDATE 
SET 
  full_name = EXCLUDED.full_name,
  plate_number = EXCLUDED.plate_number;

-- 4. Create the Trigger Function to auto-assign role
CREATE OR REPLACE FUNCTION public.handle_driver_auto_assign()
RETURNS TRIGGER AS $$
DECLARE
    matching_driver RECORD;
BEGIN
    -- Check if the registered phone number is in the approved list
    SELECT * INTO matching_driver FROM public.approved_drivers WHERE phone = NEW.phone LIMIT 1;
    
    IF FOUND THEN
        -- Automatically make them a driver and assign plate number
        NEW.role := 'driver';
        NEW.plate_number := matching_driver.plate_number;
        -- Use the "Official" name if the user didn't provide one
        IF NEW.full_name IS NULL OR NEW.full_name = '' THEN
            NEW.full_name := matching_driver.full_name;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach the Trigger to the profiles table
DROP TRIGGER IF EXISTS on_profile_registration_driver ON public.profiles;
CREATE TRIGGER on_profile_registration_driver
BEFORE INSERT OR UPDATE OF phone ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_driver_auto_assign();
