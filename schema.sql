--
-- PostgreSQL database dump
--

-- Dumped from database version 13.16 (Debian 13.16-1.pgdg120+1)
-- Dumped by pg_dump version 13.16 (Debian 13.16-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: fuzzystrmatch; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA public;


--
-- Name: EXTENSION fuzzystrmatch; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION fuzzystrmatch IS 'determine similarities and distance between strings';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: known_plates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.known_plates (
    plate_number character varying(10) NOT NULL,
    name character varying(255),
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ignore BOOLEAN DEFAULT FALSE
);


ALTER TABLE public.known_plates OWNER TO postgres;

--
-- Name: plate_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plate_notifications (
    id integer NOT NULL,
    plate_number text NOT NULL,
    enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    priority integer DEFAULT 1
);


ALTER TABLE public.plate_notifications OWNER TO postgres;

--
-- Name: plate_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plate_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.plate_notifications_id_seq OWNER TO postgres;

--
-- Name: plate_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plate_notifications_id_seq OWNED BY public.plate_notifications.id;


--
-- Name: plate_reads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plate_reads (
    id integer NOT NULL,
    plate_number character varying(10) NOT NULL,
    image_data text,
    image_path VARCHAR(255),
    thumbnail_path VARCHAR(255),
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    camera_name character varying(30),
    bi_path varchar(100),
    plate_annotation varchar(255),
    crop_coordinates int[],
    ocr_annotation jsonb,
    confidence decimal,
    bi_zone varchar(30),
    validated boolean DEFAULT false
);


ALTER TABLE public.plate_reads OWNER TO postgres;

--
-- Name: plate_reads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plate_reads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.plate_reads_id_seq OWNER TO postgres;

--
-- Name: plate_reads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plate_reads_id_seq OWNED BY public.plate_reads.id;


--
-- Name: plate_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plate_tags (
    plate_number character varying(10) NOT NULL,
    tag_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.plate_tags OWNER TO postgres;

--
-- Name: plates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plates (
    plate_number character varying(10) NOT NULL,
    first_seen_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    flagged boolean DEFAULT false NOT NULL,
    occurrence_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.plates OWNER TO postgres;


CREATE INDEX idx_plates_occurrence_count ON public.plates(occurrence_count);

--
-- Name: tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    color character varying(20) DEFAULT '#808080'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.tags OWNER TO postgres;

CREATE TABLE public.devmgmt (
    id SERIAL PRIMARY KEY,
    update1 BOOLEAN DEFAULT FALSE,
    training_last_record INTEGER DEFAULT 0
);

ALTER TABLE public.devmgmt OWNER TO postgres;

INSERT INTO devmgmt (id, update1)
SELECT 1, false
WHERE NOT EXISTS (SELECT 1 FROM devmgmt);



--
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tags_id_seq OWNER TO postgres;

--
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;


--
-- Name: plate_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plate_notifications ALTER COLUMN id SET DEFAULT nextval('public.plate_notifications_id_seq'::regclass);


--
-- Name: plate_reads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plate_reads ALTER COLUMN id SET DEFAULT nextval('public.plate_reads_id_seq'::regclass);


--
-- Name: tags id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);


--
-- Name: known_plates known_plates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.known_plates
    ADD CONSTRAINT known_plates_pkey PRIMARY KEY (plate_number);


--
-- Name: plate_notifications plate_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plate_notifications
    ADD CONSTRAINT plate_notifications_pkey PRIMARY KEY (id);


--
-- Name: plate_notifications plate_notifications_plate_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plate_notifications
    ADD CONSTRAINT plate_notifications_plate_number_key UNIQUE (plate_number);


--
-- Name: plate_reads plate_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plate_reads
    ADD CONSTRAINT plate_reads_pkey PRIMARY KEY (id);


--
-- Name: plate_tags plate_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plate_tags
    ADD CONSTRAINT plate_tags_pkey PRIMARY KEY (plate_number, tag_id);


--
-- Name: plates plates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plates
    ADD CONSTRAINT plates_pkey PRIMARY KEY (plate_number);


--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: idx_known_plates_plate_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_known_plates_plate_number ON public.known_plates USING btree (plate_number);


--
-- Name: idx_plate_notifications_enabled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_plate_notifications_enabled ON public.plate_notifications USING btree (enabled) WHERE (enabled = true);


--
-- Name: idx_plate_notifications_plate_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_plate_notifications_plate_number ON public.plate_notifications USING btree (plate_number);


--
-- Name: idx_plate_reads_plate_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_plate_reads_plate_number ON public.plate_reads USING btree (plate_number);


--
-- Name: idx_plate_reads_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_plate_reads_timestamp ON public.plate_reads USING btree ("timestamp");


--
-- Name: idx_plate_tags_plate_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_plate_tags_plate_number ON public.plate_tags USING btree (plate_number);


--
-- Name: idx_plates_flagged; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_plates_flagged ON public.plates USING btree (plate_number) WHERE (flagged = true);


--
-- Name: idx_plates_plate_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_plates_plate_number ON public.plates USING btree (plate_number);


--
-- Name: plate_tags plate_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plate_tags
    ADD CONSTRAINT plate_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;

CREATE FUNCTION public.update_plate_occurrence_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;

ALTER FUNCTION public.update_plate_occurrence_count() OWNER TO postgres;

CREATE TRIGGER plate_reads_count_trigger AFTER INSERT OR UPDATE OR DELETE ON public.plate_reads FOR EACH ROW EXECUTE FUNCTION public.update_plate_occurrence_count();
