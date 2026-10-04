/**
 * Storage Helper für Supabase Storage mit Mandanten-Isolation und Private Bucket Support
 * Unterstützt signierte URLs (GeBüV / revDSG-Schutz) und Rückwärtskompatibilität.
 */

const STORAGE_BUCKET = 'anhange';

/**
 * Erzeugt einen mandantenisolierten Speicherpfad
 * @param {string|null} tenantId - UUID des Mandanten
 * @param {string} fileName - Dateiname inklusive Endung
 * @param {string} [subfolder='uploads'] - Unterordner (z.B. 'dokumente', 'fotos', 'offerten')
 * @returns {string} Relativer Pfad im Storage-Bucket
 */
export function getTenantStoragePath(tenantId, fileName, subfolder = 'uploads') {
  const safeTenant = tenantId || 'common';
  const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${cleanName}`;
  return `${safeTenant}/${subfolder}/${uniqueName}`;
}

/**
 * Extrahiert den relativen Speicherpfad aus einer Supabase-Storage-URL oder gibt den Pfad direkt zurück
 * @param {string} urlOrPath - Storage-URL oder relativer Pfad
 * @returns {string} Relativer Pfad im Bucket
 */
export function extractStoragePath(urlOrPath) {
  if (!urlOrPath) return '';
  
  // Wenn es eine vollständige Supabase-URL ist
  const publicMarker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const signMarker = `/storage/v1/object/sign/${STORAGE_BUCKET}/`;
  const authMarker = `/storage/v1/object/authenticated/${STORAGE_BUCKET}/`;

  if (urlOrPath.includes(publicMarker)) {
    return decodeURIComponent(urlOrPath.split(publicMarker)[1].split('?')[0]);
  }
  if (urlOrPath.includes(signMarker)) {
    return decodeURIComponent(urlOrPath.split(signMarker)[1].split('?')[0]);
  }
  if (urlOrPath.includes(authMarker)) {
    return decodeURIComponent(urlOrPath.split(authMarker)[1].split('?')[0]);
  }

  // Bereits relativer Pfad
  return urlOrPath;
}

/**
 * Ruft eine sichere Zugriffs-URL für eine Datei ab (Signierte URL für private Buckets)
 * @param {object} supabase - Supabase Client Instanz
 * @param {string} urlOrPath - URL oder relativer Pfad
 * @param {number} [expiresIn=3600] - Gültigkeit in Sekunden (Standard: 1 Stunde)
 * @returns {Promise<string>} Sichere URL
 */
export async function getFileAccessUrl(supabase, urlOrPath, expiresIn = 3600) {
  if (!urlOrPath) return '';
  if (!supabase?.storage) return urlOrPath;

  const path = extractStoragePath(urlOrPath);
  if (!path) return urlOrPath;

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, expiresIn);

    if (error || !data?.signedUrl) {
      // Fallback zu Public URL falls Bucket noch nicht auf privat umgestellt wurde
      const { data: pubData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);
      return pubData?.publicUrl || urlOrPath;
    }

    return data.signedUrl;
  } catch {
    return urlOrPath;
  }
}
