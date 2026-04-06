-- ═══════════════════════════════════════════════════════════
-- POLÍTICAS DE SEGURIDAD PARA BUCKET: upick-images
-- ═══════════════════════════════════════════════════════════

-- 1. POLÍTICA: Permitir a todos VER/DESCARGAR imágenes (SELECT)
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'upick-images');

-- 2. POLÍTICA: Solo usuarios autenticados pueden SUBIR imágenes (INSERT)
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'upick-images');

-- 3. POLÍTICA: Solo el dueño o admin puede ACTUALIZAR imágenes (UPDATE)
CREATE POLICY "Owners can update their images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'upick-images')
WITH CHECK (bucket_id = 'upick-images');

-- 4. POLÍTICA: Solo el dueño o admin puede ELIMINAR imágenes (DELETE)
CREATE POLICY "Owners can delete their images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'upick-images');

-- ═══════════════════════════════════════════════════════════
-- VERIFICACIÓN (Opcional)
-- ═══════════════════════════════════════════════════════════

-- Ver las políticas creadas:
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';


