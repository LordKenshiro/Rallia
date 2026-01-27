'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
}

interface FilePreview {
  file: File;
  id: string;
}

export function FileUploadDialog({ open, onOpenChange, facilityId }: FileUploadDialogProps) {
  const t = useTranslations('facilities.files');
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<FilePreview[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPreviews: FilePreview[] = Array.from(files).map(file => ({
      file,
      id: `preview-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    }));

    setPreviews(prev => [...prev, ...newPreviews]);
    setError(null);
  };

  const removePreview = (id: string) => {
    setPreviews(prev => prev.filter(p => p.id !== id));
  };

  const handleClose = () => {
    if (!uploading) {
      setPreviews([]);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onOpenChange(false);
    }
  };

  const getFileType = (file: File): 'image' | 'video' | 'document' | 'audio' | 'other' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (
      file.type.includes('pdf') ||
      file.type.includes('document') ||
      file.type.includes('text') ||
      file.name.endsWith('.doc') ||
      file.name.endsWith('.docx') ||
      file.name.endsWith('.txt')
    ) {
      return 'document';
    }
    return 'other';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (previews.length === 0) {
      setError(t('validation.noFiles'));
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const uploadedFiles = [];

      for (const preview of previews) {
        const file = preview.file;
        const fileType = getFileType(file);

        // Generate unique storage key (path within the bucket)
        const fileExt = file.name.split('.').pop() || 'bin';
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const storagePath = `${facilityId}/${timestamp}-${randomId}.${fileExt}`;
        // Full storage key includes bucket name for database reference
        const storageKey = `facility-files/${storagePath}`;

        // Convert File to Blob
        const arrayBuffer = await file.arrayBuffer();
        const fileData = new Blob([arrayBuffer], { type: file.type });

        // Upload to storage (use storagePath, not storageKey which includes bucket name)
        const { error: uploadError } = await supabase.storage
          .from('facility-files')
          .upload(storagePath, fileData, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from('facility-files').getPublicUrl(storagePath);

        // Insert into file table
        const { data: fileRecord, error: fileError } = await supabase
          .from('file')
          .insert({
            file_type: fileType,
            mime_type: file.type,
            file_size: file.size,
            original_name: file.name,
            storage_key: storageKey,
            url: urlData.publicUrl,
            uploaded_by: user.id,
          })
          .select()
          .single();

        if (fileError) {
          // Try to clean up uploaded file
          await supabase.storage.from('facility-files').remove([storagePath]);
          throw new Error(`Failed to save file record: ${fileError.message}`);
        }

        // Insert into facility_file junction table
        const { error: junctionError } = await supabase.from('facility_file').insert({
          facility_id: facilityId,
          file_id: fileRecord.id,
          display_order: uploadedFiles.length,
          is_primary: false,
        });

        if (junctionError) {
          // Clean up file record and storage
          await supabase.from('file').delete().eq('id', fileRecord.id);
          await supabase.storage.from('facility-files').remove([storagePath]);
          throw new Error(`Failed to link file: ${junctionError.message}`);
        }

        uploadedFiles.push(fileRecord);
      }

      setPreviews([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      console.error('Error uploading files:', err);
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('uploadFiles')}</DialogTitle>
          <DialogDescription>{t('uploadDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload-input"
              disabled={uploading}
            />
            <label
              htmlFor="file-upload-input"
              className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors"
            >
              <div className="text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground m-0">{t('selectFiles')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('maxSize')}</p>
              </div>
            </label>
          </div>

          {previews.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">{t('preview')}</p>
              <div className="space-y-2">
                {previews.map(preview => (
                  <div
                    key={preview.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="size-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate mb-0">{preview.file.name}</p>
                        <p className="text-xs text-muted-foreground mb-0">
                          {formatFileSize(preview.file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePreview(preview.id)}
                      className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors shrink-0"
                      disabled={uploading}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={uploading}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={uploading || previews.length === 0}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t('uploading')}
              </>
            ) : (
              <>
                <Upload className="mr-2 size-4" />
                {t('uploadButton')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
