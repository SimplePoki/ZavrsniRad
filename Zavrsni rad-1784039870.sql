DROP TABLE IF EXISTS umirovljenik CASCADE;
DROP TABLE IF EXISTS korisnik CASCADE;
DROP TABLE IF EXISTS akcije CASCADE;
DROP TABLE IF EXISTS posjeti CASCADE;
DROP TABLE IF EXISTS smjene CASCADE;
DROP TABLE IF EXISTS evidencije CASCADE;

CREATE TABLE IF NOT EXISTS umirovljenik (
	id serial NOT NULL UNIQUE,
	ime varchar(255) NOT NULL,
	prezime varchar(255) NOT NULL,
	kat integer NOT NULL,
	soba integer NOT NULL,
	aktivan boolean NOT NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NOT NULL DEFAULT now(),
	PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS posjeti (
	id serial NOT NULL UNIQUE,
	umirovljenik_id integer NOT NULL,
	ime varchar(255) NOT NULL,
	prezime varchar(255) NOT NULL,
	datum date NOT NULL,
	upisao_id integer NOT NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NOT NULL DEFAULT now(),
	PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS korisnik (
	id serial NOT NULL UNIQUE,
	ime varchar(255) NOT NULL,
	prezime varchar(255) NOT NULL,
	lozinka varchar(255) NOT NULL,
	email varchar(255) NOT NULL UNIQUE,
	uloga integer NOT NULL,
	aktivan boolean NOT NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NOT NULL DEFAULT now(),
	PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS smjene (
	id serial NOT NULL UNIQUE,
	korisnik_id integer NOT NULL,
	datum date NOT NULL,
	smjena integer NOT NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NOT NULL DEFAULT now(),
	PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS evidencije (
	id serial NOT NULL UNIQUE,
	umirovljenik_id integer NOT NULL,
	akcija_id integer NOT NULL,
	izvrsio_id integer NOT NULL,
	vrijednost_num integer NOT NULL,
	vrijednost_string varchar(255) NOT NULL,
	opis varchar(255) NOT NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NOT NULL DEFAULT now(),
	PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "akcije" (
	id serial NOT NULL UNIQUE,
	tip integer NOT NULL,
	naziv varchar(255) NOT NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NOT NULL DEFAULT now(),
	PRIMARY KEY ("id")
);
ALTER TABLE "posjeti" ADD CONSTRAINT "posjeti_fk1" FOREIGN KEY ("umirovljenik_id") REFERENCES "umirovljenik"("id");
ALTER TABLE "posjeti" ADD CONSTRAINT "posjeti_fk5" FOREIGN KEY ("upisao_id") REFERENCES "korisnik"("id");
ALTER TABLE "smjene" ADD CONSTRAINT "smjene_fk1" FOREIGN KEY ("korisnik_id") REFERENCES "korisnik"("id");
ALTER TABLE "evidencije" ADD CONSTRAINT "evidencije_fk1" FOREIGN KEY ("umirovljenik_id") REFERENCES "umirovljenik"("id");
ALTER TABLE "evidencije" ADD CONSTRAINT "evidencije_fk2" FOREIGN KEY ("akcija_id") REFERENCES "akcije"("id");
ALTER TABLE "evidencije" ADD CONSTRAINT "evidencije_fk3" FOREIGN KEY ("izvrsio_id") REFERENCES "korisnik"("id");
COMMENT ON TABLE "umirovljenik" IS 'Ova tablica služi za evidenciju umirovljenika, u kojoj sobi se nalazi, njegovo ime, prezime, te jedinstven id.';
COMMENT ON COLUMN "umirovljenik"."aktivan" IS 'Je li umirovljenik u domu?';


CREATE OR REPLACE FUNCTION updated()
RETURNS TRIGGER AS $$
BEGIN
	IF NEW IS DISTINCT FROM OLD THEN
    	NEW.updated_at = now();
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER umirovljenik_updated
BEFORE UPDATE ON umirovljenik
FOR EACH ROW EXECUTE FUNCTION updated();

CREATE TRIGGER posjeti_updated
BEFORE UPDATE ON posjeti
FOR EACH ROW EXECUTE FUNCTION updated();

CREATE TRIGGER korisnik_updated
BEFORE UPDATE ON korisnik
FOR EACH ROW EXECUTE FUNCTION updated();

CREATE TRIGGER smjene_updated
BEFORE UPDATE ON smjene
FOR EACH ROW EXECUTE FUNCTION updated();

CREATE TRIGGER evidencije_updated
BEFORE UPDATE ON evidencije
FOR EACH ROW EXECUTE FUNCTION updated();

CREATE TRIGGER akcije_updated
BEFORE UPDATE ON akcije
FOR EACH ROW EXECUTE FUNCTION updated();

