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
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
}

interface ImagePreview {
  file: File;
  preview: string;
  id: string;
}

export function ImageUploadDialog({ open, onOpenChange, facilityId }: ImageUploadDialogProps) {
  const t = useTranslations('facilities.images');
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<ImagePreview[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPreviews: ImagePreview[] = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: `preview-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    }));

    setPreviews(prev => [...prev, ...newPreviews]);
    setError(null);
  };

  const removePreview = (id: string) => {
    setPreviews(prev => {
      const removed = prev.find(p => p.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return prev.filter(p => p.id !== id);
    });
  };

  const handleClose = () => {
    if (!uploading) {
      // Clean up preview URLs
      previews.forEach(preview => URL.revokeObjectURL(preview.preview));
      setPreviews([]);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onOpenChange(false);
    }
  };

  const handleUpload = async () => {
    if (previews.length === 0) {
      setError(t('validation.noFiles'));
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      previews.forEach(preview => {
        formData.append('files', preview.file);
      });

      const response = await fetch(`/api/facilities/${facilityId}/images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload images');
      }

      // Clean up preview URLs
      previews.forEach(preview => URL.revokeObjectURL(preview.preview));
      setPreviews([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      console.error('Error uploading images:', err);
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('uploadImages')}</DialogTitle>
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
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="image-upload-input"
              disabled={uploading}
            />
            <label
              htmlFor="image-upload-input"
              className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors"
            >
              <div className="text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground m-0">{t('selectImages')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('maxSize')}</p>
              </div>
            </label>
          </div>

          {previews.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">{t('preview')}</p>
              <div className="grid grid-cols-3 gap-3">
                {previews.map(preview => (
                  <div key={preview.id} className="relative group">
                    <div className="aspect-square relative rounded-lg overflow-hidden border">
                      <Image
                        src={preview.preview}
                        alt="Preview"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 33vw, 200px"
                      />
                      <button
                        type="button"
                        onClick={() => removePreview(preview.id)}
                        className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={uploading}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {preview.file.name}
                    </p>
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
