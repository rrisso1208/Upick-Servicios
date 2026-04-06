-- Create City table
CREATE TABLE IF NOT EXISTS "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "City_name_key" ON "City"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "City_code_key" ON "City"("code");

-- Create indexes
CREATE INDEX IF NOT EXISTS "City_name_idx" ON "City"("name");
CREATE INDEX IF NOT EXISTS "City_isActive_idx" ON "City"("isActive");

-- Add cityId column to Place table
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "cityId" TEXT;

-- Create index for cityId
CREATE INDEX IF NOT EXISTS "Place_cityId_idx" ON "Place"("cityId");

-- Add foreign key constraint
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'City') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'Place_cityId_fkey'
        ) THEN
            ALTER TABLE "Place" ADD CONSTRAINT "Place_cityId_fkey"
                FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- Insert all Colombian cities (capital cities and major municipalities)
-- Using ON CONFLICT to avoid duplicates
INSERT INTO "City" ("id", "name", "code", "isActive", "createdAt", "updatedAt")
VALUES
    ('city_001', 'Bogotá', '11001', true, NOW(), NOW()),
    ('city_002', 'Medellín', '05001', true, NOW(), NOW()),
    ('city_003', 'Cali', '76001', true, NOW(), NOW()),
    ('city_004', 'Barranquilla', '08001', true, NOW(), NOW()),
    ('city_005', 'Cartagena', '13001', true, NOW(), NOW()),
    ('city_006', 'Cúcuta', '54001', true, NOW(), NOW()),
    ('city_007', 'Soledad', '08758', true, NOW(), NOW()),
    ('city_008', 'Ibagué', '73001', true, NOW(), NOW()),
    ('city_009', 'Bucaramanga', '68001', true, NOW(), NOW()),
    ('city_010', 'Santa Marta', '47001', true, NOW(), NOW()),
    ('city_011', 'Villavicencio', '50001', true, NOW(), NOW()),
    ('city_012', 'Pereira', '66001', true, NOW(), NOW()),
    ('city_013', 'Valledupar', '20001', true, NOW(), NOW()),
    ('city_014', 'Buenaventura', '76109', true, NOW(), NOW()),
    ('city_015', 'Pasto', '52001', true, NOW(), NOW()),
    ('city_016', 'Manizales', '17001', true, NOW(), NOW()),
    ('city_017', 'Montería', '23001', true, NOW(), NOW()),
    ('city_018', 'Neiva', '41001', true, NOW(), NOW()),
    ('city_019', 'Armenia', '63001', true, NOW(), NOW()),
    ('city_020', 'Sincelejo', '70001', true, NOW(), NOW()),
    ('city_021', 'Popayán', '19001', true, NOW(), NOW()),
    ('city_022', 'Riohacha', '44001', true, NOW(), NOW()),
    ('city_023', 'Tunja', '15001', true, NOW(), NOW()),
    ('city_024', 'Florencia', '18001', true, NOW(), NOW()),
    ('city_025', 'Quibdó', '27001', true, NOW(), NOW()),
    ('city_026', 'Arauca', '81001', true, NOW(), NOW()),
    ('city_027', 'Yopal', '85001', true, NOW(), NOW()),
    ('city_028', 'Mocoa', '86001', true, NOW(), NOW()),
    ('city_029', 'Leticia', '91001', true, NOW(), NOW()),
    ('city_030', 'Inírida', '94001', true, NOW(), NOW()),
    ('city_031', 'San José del Guaviare', '95001', true, NOW(), NOW()),
    ('city_032', 'Mitú', '97001', true, NOW(), NOW()),
    ('city_033', 'Puerto Carreño', '99001', true, NOW(), NOW()),
    ('city_034', 'Palmira', '76520', true, NOW(), NOW()),
    ('city_035', 'Bello', '05088', true, NOW(), NOW()),
    ('city_036', 'Itagüí', '05360', true, NOW(), NOW()),
    ('city_037', 'Soacha', '25754', true, NOW(), NOW()),
    ('city_038', 'Dosquebradas', '66170', true, NOW(), NOW()),
    ('city_039', 'Envigado', '05266', true, NOW(), NOW()),
    ('city_040', 'Tuluá', '76834', true, NOW(), NOW()),
    ('city_041', 'Barrancabermeja', '68081', true, NOW(), NOW()),
    ('city_042', 'Girardot', '25307', true, NOW(), NOW()),
    ('city_043', 'Facatativá', '25269', true, NOW(), NOW()),
    ('city_044', 'Chía', '25175', true, NOW(), NOW()),
    ('city_045', 'Zipaquirá', '25899', true, NOW(), NOW()),
    ('city_046', 'Mosquera', '25473', true, NOW(), NOW()),
    ('city_047', 'Madrid', '25386', true, NOW(), NOW()),
    ('city_048', 'Sabaneta', '05631', true, NOW(), NOW()),
    ('city_049', 'La Estrella', '05380', true, NOW(), NOW()),
    ('city_050', 'Copacabana', '05212', true, NOW(), NOW()),
    ('city_051', 'Girón', '68307', true, NOW(), NOW()),
    ('city_052', 'Floridablanca', '68276', true, NOW(), NOW()),
    ('city_053', 'Piedecuesta', '68547', true, NOW(), NOW()),
    ('city_054', 'Yumbo', '76890', true, NOW(), NOW()),
    ('city_055', 'Jamundí', '76364', true, NOW(), NOW()),
    ('city_056', 'Candelaria', '76130', true, NOW(), NOW()),
    ('city_057', 'Ginebra', '76306', true, NOW(), NOW()),
    ('city_058', 'Guadalajara de Buga', '76111', true, NOW(), NOW()),
    ('city_059', 'Cartago', '76122', true, NOW(), NOW()),
    ('city_060', 'La Unión', '76400', true, NOW(), NOW()),
    ('city_061', 'Roldanillo', '76622', true, NOW(), NOW()),
    ('city_062', 'Zarzal', '76895', true, NOW(), NOW()),
    ('city_063', 'El Cerrito', '76248', true, NOW(), NOW()),
    ('city_064', 'Restrepo', '76606', true, NOW(), NOW()),
    ('city_065', 'Guacarí', '76318', true, NOW(), NOW()),
    ('city_066', 'Yotoco', '76892', true, NOW(), NOW()),
    ('city_067', 'San Pedro', '76670', true, NOW(), NOW()),
    ('city_068', 'Trujillo', '76828', true, NOW(), NOW()),
    ('city_069', 'Riofrío', '76616', true, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

