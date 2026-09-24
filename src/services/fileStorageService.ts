import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import { FileSourceType, StudyFileRecord, StudyNoteRecord } from '../types/study';

export { type FileSourceType, type StudyFileRecord, type StudyNoteRecord };

const STORAGE_BUCKET = 'study-files';

/**
 * Sanitizes a file name for secure cloud storage keys
 */
export function sanitizeStorageFileName(rawName: string): string {
  return rawName
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'document';
}

/**
 * Validates an external URL for security and document suitability
 */
export function validateExternalUrl(rawUrl: string): { valid: boolean; error?: string; cleanUrl?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, error: 'URL cannot be empty.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (e) {
    return { valid: false, error: 'Please enter a valid URL (e.g., https://example.com/document.pdf)' };
  }

  // Enforce http / https protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTP and HTTPS URLs are supported.' };
  }

  // Prevent local/internal IP access for security
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('169.254.') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local')
  ) {
    return { valid: false, error: 'Internal and local network URLs are restricted.' };
  }

  return { valid: true, cleanUrl: parsed.toString() };
}

/**
 * Uploads an authenticated user's study file (PDF, DOCX, PPTX, TXT) into
 * the private Supabase Storage bucket under:
 * study-files/{user_id}/{file_id}/{sanitized_file_name}
 *
 * Records metadata in public.study_files
 */
export async function uploadStudyFile(
  userId: string,
  file: File,
  studySetId?: string
): Promise<StudyFileRecord> {
  const supabase = getSupabase();
  const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const cleanName = sanitizeStorageFileName(file.name);
  const storagePath = `${userId}/${fileId}/${cleanName}`;
  const now = new Date().toISOString();

  let uploadedPath: string | null = null;

  if (isSupabaseConfigured() && supabase) {
    // 1. Upload to Supabase Storage in user's isolated folder
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (!error && data?.path) {
        uploadedPath = data.path;
      } else if (error) {
        console.warn('Supabase storage upload notice:', error.message);
      }
    } catch (err) {
      console.warn('Storage upload network fallback:', err);
    }

    // 2. Insert metadata record into public.study_files
    try {
      const { data: record, error: dbError } = await supabase
        .from('study_files')
        .insert({
          id: fileId,
          user_id: userId,
          study_set_id: studySetId || null,
          file_name: file.name,
          file_type: file.type || file.name.split('.').pop()?.toUpperCase() || 'DOCUMENT',
          file_size: file.size,
          storage_path: uploadedPath || storagePath,
          source_type: 'upload',
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (!dbError && record) {
        return {
          id: record.id,
          userId: record.user_id,
          studySetId: record.study_set_id,
          fileName: record.file_name,
          fileType: record.file_type,
          fileSize: Number(record.file_size || file.size),
          storagePath: record.storage_path,
          sourceType: 'upload',
          createdAt: record.created_at,
          updatedAt: record.updated_at,
        };
      }
    } catch (dbErr) {
      console.warn('Failed to insert study_files metadata:', dbErr);
    }
  }

  // Graceful local record return
  return {
    id: fileId,
    userId,
    studySetId: studySetId || null,
    fileName: file.name,
    fileType: file.type || file.name.split('.').pop()?.toUpperCase() || 'DOCUMENT',
    fileSize: file.size,
    storagePath: uploadedPath || storagePath,
    sourceType: 'upload',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a metadata record for an external PDF or Document URL
 */
export async function createExternalUrlRecord(
  userId: string,
  url: string,
  title: string,
  studySetId?: string
): Promise<StudyFileRecord> {
  const supabase = getSupabase();
  const fileId = `ext_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: record } = await supabase
        .from('study_files')
        .insert({
          id: fileId,
          user_id: userId,
          study_set_id: studySetId || null,
          file_name: title || 'External Document',
          file_type: 'URL',
          file_size: 0,
          storage_path: null,
          source_type: 'external_url',
          source_url: url,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (record) {
        return {
          id: record.id,
          userId: record.user_id,
          studySetId: record.study_set_id,
          fileName: record.file_name,
          fileType: 'URL',
          fileSize: 0,
          sourceType: 'external_url',
          sourceUrl: url,
          createdAt: record.created_at,
          updatedAt: record.updated_at,
        };
      }
    } catch (err) {
      console.warn('External URL record fallback:', err);
    }
  }

  return {
    id: fileId,
    userId,
    studySetId: studySetId || null,
    fileName: title || 'External Document',
    fileType: 'URL',
    fileSize: 0,
    sourceType: 'external_url',
    sourceUrl: url,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Saves manually created notes directly in the database (study_notes table)
 * and records metadata in study_files without creating unnecessary raw disk files.
 */
export async function createStudyNoteRecord(
  userId: string,
  title: string,
  content: string,
  studySetId?: string
): Promise<StudyNoteRecord> {
  const supabase = getSupabase();
  const noteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  if (isSupabaseConfigured() && supabase) {
    try {
      // 1. Insert into public.study_notes
      const { data: noteRow } = await supabase
        .from('study_notes')
        .insert({
          id: noteId,
          user_id: userId,
          study_set_id: studySetId || null,
          title: title || 'Personal Notes',
          content,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      // 2. Insert metadata record in public.study_files
      await supabase
        .from('study_files')
        .insert({
          id: `file_${noteId}`,
          user_id: userId,
          study_set_id: studySetId || null,
          file_name: title || 'Personal Notes',
          file_type: 'NOTES',
          file_size: content.length,
          storage_path: null,
          source_type: 'manual_notes',
          created_at: now,
          updated_at: now,
        });

      if (noteRow) {
        return {
          id: noteRow.id,
          userId: noteRow.user_id,
          studySetId: noteRow.study_set_id,
          title: noteRow.title,
          content: noteRow.content,
          createdAt: noteRow.created_at,
          updatedAt: noteRow.updated_at,
        };
      }
    } catch (err) {
      console.warn('Study note creation fallback:', err);
    }
  }

  return {
    id: noteId,
    userId,
    studySetId: studySetId || null,
    title: title || 'Personal Notes',
    content,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Generates a secure, short-lived signed URL for an uploaded file in private Supabase Storage.
 * Avoids permanent public exposure of study documents.
 * Default expiration: 1 hour (3600 seconds)
 */
export async function getSignedFileUrl(
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  if (!storagePath) return null;
  const supabase = getSupabase();
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.warn('Could not generate signed URL:', err);
    return null;
  }
}

/**
 * Retrieves all file metadata records belonging to the authenticated user
 */
export async function fetchUserFiles(userId: string): Promise<StudyFileRecord[]> {
  const supabase = getSupabase();
  if (!isSupabaseConfigured() || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('study_files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        studySetId: r.study_set_id,
        fileName: r.file_name,
        fileType: r.file_type,
        fileSize: Number(r.file_size || 0),
        storagePath: r.storage_path,
        sourceType: r.source_type,
        sourceUrl: r.source_url,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    }
  } catch (err) {
    console.warn('Error fetching user files:', err);
  }
  return [];
}

/**
 * Retrieves all files associated with a specific study set
 */
export async function fetchFilesForStudySet(studySetId: string): Promise<StudyFileRecord[]> {
  const supabase = getSupabase();
  if (!isSupabaseConfigured() || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('study_files')
      .select('*')
      .eq('study_set_id', studySetId);

    if (!error && Array.isArray(data)) {
      return data.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        studySetId: r.study_set_id,
        fileName: r.file_name,
        fileType: r.file_type,
        fileSize: Number(r.file_size || 0),
        storagePath: r.storage_path,
        sourceType: r.source_type,
        sourceUrl: r.source_url,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    }
  } catch (err) {
    console.warn('Error fetching files for study set:', err);
  }
  return [];
}

/**
 * Safely deletes a specific file from private storage and its database record,
 * strictly scoped to the authenticated user ID.
 */
export async function deleteStudyFile(userId: string, fileId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!isSupabaseConfigured() || !supabase) return false;

  try {
    // 1. Get file record to verify ownership and path
    const { data: fileRow } = await supabase
      .from('study_files')
      .select('id, storage_path')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (!fileRow) return false;

    // 2. Remove from Supabase Storage if it has a physical storage path
    if (fileRow.storage_path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([fileRow.storage_path]);
    }

    // 3. Delete metadata record
    const { error: deleteErr } = await supabase
      .from('study_files')
      .delete()
      .eq('id', fileId)
      .eq('user_id', userId);

    return !deleteErr;
  } catch (err) {
    console.warn('Error deleting study file:', err);
    return false;
  }
}

/**
 * Safely deletes all uploaded files and notes associated with a specific study set
 * belonging strictly to the authenticated user.
 * Prevents accidental deletion of another user's files.
 */
export async function deleteFilesForStudySet(
  userId: string,
  studySetId: string
): Promise<void> {
  const supabase = getSupabase();
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    // 1. Fetch file paths belonging strictly to this study set and user
    const { data: files } = await supabase
      .from('study_files')
      .select('id, storage_path')
      .eq('user_id', userId)
      .eq('study_set_id', studySetId);

    if (files && files.length > 0) {
      const storagePaths = files
        .map((f: any) => f.storage_path)
        .filter((p: string | null): p is string => Boolean(p));

      // 2. Delete storage files
      if (storagePaths.length > 0) {
        await supabase.storage.from(STORAGE_BUCKET).remove(storagePaths);
      }

      // 3. Delete metadata records
      await supabase
        .from('study_files')
        .delete()
        .eq('user_id', userId)
        .eq('study_set_id', studySetId);
    }

    // 4. Delete associated study_notes records
    await supabase
      .from('study_notes')
      .delete()
      .eq('user_id', userId)
      .eq('study_set_id', studySetId);
  } catch (err) {
    console.warn('Error deleting files for study set:', err);
  }
}
