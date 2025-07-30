CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA public;

-- Modify plate_notifications
ALTER TABLE IF EXISTS public.plate_notifications 
    ADD COLUMN IF NOT EXISTS priority integer DEFAULT 1;

-- Modify plate_reads
ALTER TABLE IF EXISTS public.plate_reads 
    ADD COLUMN IF NOT EXISTS camera_name character varying(25),
    ADD COLUMN IF NOT EXISTS image_path varchar(255),
    ADD COLUMN IF NOT EXISTS thumbnail_path varchar(255),
    ADD COLUMN IF NOT EXISTS bi_path varchar(100),
    ADD COLUMN IF NOT EXISTS plate_annotation varchar(255),
    ADD COLUMN IF NOT EXISTS crop_coordinates int[],
    ADD COLUMN IF NOT EXISTS ocr_annotation jsonb,
    ADD COLUMN IF NOT EXISTS confidence decimal,
    ADD COLUMN IF NOT EXISTS bi_zone varchar(30),
    ADD COLUMN IF NOT EXISTS validated boolean DEFAULT false;


-- Please for the love of god work...
-- Fix in reference to #57 and ipct reports about db config on new installs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'plates_pkey' 
        AND conrelid = 'public.plates'::regclass
    ) THEN
        ALTER TABLE public.plates ADD CONSTRAINT plates_pkey PRIMARY KEY (plate_number);
    END IF;
END $$;

-- Modify known_plates
ALTER TABLE IF EXISTS public.known_plates 
    ADD COLUMN IF NOT EXISTS ignore BOOLEAN DEFAULT FALSE;

-- Modify plates
ALTER TABLE IF EXISTS public.plates 
    ADD COLUMN IF NOT EXISTS occurrence_count INTEGER NOT NULL DEFAULT 0;

-- Create index if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_plates_occurrence_count') THEN
        CREATE INDEX idx_plates_occurrence_count ON plates(occurrence_count);
    END IF;
END $$;

-- Count incrementing function
CREATE OR REPLACE FUNCTION update_plate_occurrence_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT operation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO plates (plate_number, occurrence_count)
        VALUES (NEW.plate_number, 1)
        ON CONFLICT (plate_number)
        DO UPDATE SET occurrence_count = plates.occurrence_count + 1;
    
    -- Handle UPDATE operation (plate number correction)
    ELSIF TG_OP = 'UPDATE' AND OLD.plate_number != NEW.plate_number THEN
        -- Increment the new plate number count (or create if not exists)
        INSERT INTO plates (plate_number, occurrence_count)
        VALUES (NEW.plate_number, 1)
        ON CONFLICT (plate_number)
        DO UPDATE SET occurrence_count = plates.occurrence_count + 1;
        
        -- Only decrement the old plate if it still exists
        UPDATE plates 
        SET occurrence_count = occurrence_count - 1
        WHERE plate_number = OLD.plate_number;
        
        -- Clean up if occurrence count reaches zero
        DELETE FROM plates
        WHERE plate_number = OLD.plate_number
        AND occurrence_count <= 0;
    
    -- Handle DELETE operation
    ELSIF TG_OP = 'DELETE' THEN
        -- Only attempt to decrement if the plate still exists
        UPDATE plates 
        SET occurrence_count = occurrence_count - 1
        WHERE plate_number = OLD.plate_number;
        
        -- Clean up if occurrence count reaches zero
        DELETE FROM plates
        WHERE plate_number = OLD.plate_number
        AND occurrence_count <= 0;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Update trigger to also handle UPDATE operations
DO $$ 
BEGIN
    -- Drop the existing trigger if it exists
    DROP TRIGGER IF EXISTS plate_reads_count_trigger ON plate_reads;
    
    -- Create the updated trigger
    CREATE TRIGGER plate_reads_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON plate_reads
    FOR EACH ROW
    EXECUTE FUNCTION update_plate_occurrence_count();
END $$;

-- Clerical stuff
CREATE TABLE IF NOT EXISTS devmgmt (
    id SERIAL PRIMARY KEY,
    update1 BOOLEAN DEFAULT FALSE
);
INSERT INTO devmgmt (id, update1)
SELECT 1, false
WHERE NOT EXISTS (SELECT 1 FROM devmgmt);

ALTER TABLE IF EXISTS public.devmgmt
    ADD COLUMN IF NOT EXISTS training_last_record INTEGER DEFAULT 0;