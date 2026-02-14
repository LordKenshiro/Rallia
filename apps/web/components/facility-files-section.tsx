'use client';

import { FileUploadDialog } from '@/components/file-upload-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Music,
  Plus,
  Trash2,
  Video,
  Download,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface FacilityFile {
  id: string;
  file_id: string;
  display_order: number | null;
  is_primary: boolean | null;
  file: {
    id: string;
    file_type: 'image' | 'video' | 'document' | 'audio' | 'other';
    original_name: string;
    file_size: number;
    url: string;
    mime_type: string;
    storage_key: string;
  };
}

interface FacilityFilesSectionProps {
  facilityId: string;
  files: FacilityFile[];
  canEdit: boolean;
}

export function FacilityFilesSection({ facilityId, files, canEdit }: FacilityFilesSectionProps) {
  const t = useTranslations('facilities.files');
  const router = useRouter();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FacilityFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sortedFiles = [...files].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return ImageIcon;
      case 'video':
        return Video;
      case 'audio':
        return Music;
      case 'document':
        return FileText;
      default:
        return FileText;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDeleteClick = (file: FacilityFile) => {
    setSelectedFile(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedFile) return;

    setDeleting(true);
    try {
      const supabase = createClient();

      // Delete from facility_file junction table
      const { error: junctionError } = await supabase
        .from('facility_file')
        .delete()
        .eq('id', selectedFile.id);

      if (junctionError) {
        throw new Error(`Failed to unlink file: ${junctionError.message}`);
      }

      // Delete from storage
      // Extract path from storage_key (remove bucket prefix if present)
      const storageKey = selectedFile.file.storage_key || '';
      const filePath = storageKey.startsWith('facility-files/')
        ? storageKey.replace('facility-files/', '')
        : storageKey;
      const { error: storageError } = await supabase.storage
        .from('facility-files')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continue even if storage delete fails
      }

      // Delete from file table
      const { error: fileError } = await supabase
        .from('file')
        .delete()
        .eq('id', selectedFile.file.id);

      if (fileError) {
        throw new Error(`Failed to delete file record: ${fileError.message}`);
      }

      setDeleteDialogOpen(false);
      setSelectedFile(null);
      router.refresh();
    } catch (err) {
      console.error('Error deleting file:', err);
      alert(err instanceof Error ? err.message : t('deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {canEdit && (
        <FileUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          facilityId={facilityId}
        />
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteFile')}</DialogTitle>
            <DialogDescription>{t('deleteDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t('deleting')}
                </>
              ) : (
                t('delete')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t('title')}</CardTitle>
            <CardDescription>
              {files.length} {files.length === 1 ? t('file') : t('files')}
            </CardDescription>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              {t('uploadFiles')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="size-8 mx-auto mb-2 opacity-50" />
              <p className="mb-4">{t('emptyState.description')}</p>
              {canEdit && (
                <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  {t('emptyState.uploadButton')}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedFiles.map(file => {
                const Icon = getFileIcon(file.file.file_type);
                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-muted rounded-lg shrink-0">
                        <Icon className="size-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate mb-0">
                          {file.file.original_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {file.file.file_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.file.file_size)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(file.file.url, '_blank')}
                        className="size-8"
                        title={t('download')}
                      >
                        <Download className="size-4" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(file)}
                          disabled={deleting}
                          className="size-8 text-destructive hover:text-destructive"
                          title={t('delete')}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
