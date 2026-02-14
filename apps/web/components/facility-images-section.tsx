'use client';

import { ImageUploadDialog } from '@/components/image-upload-dialog';
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
  ArrowDown,
  ArrowUp,
  Edit2,
  Image as ImageIcon,
  Loader2,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface FacilityImage {
  id: string;
  url: string;
  thumbnail_url: string | null;
  display_order: number;
  is_primary: boolean;
  description: string | null;
}

interface FacilityImagesSectionProps {
  facilityId: string;
  images: FacilityImage[];
  canEdit: boolean;
}

export function FacilityImagesSection({ facilityId, images, canEdit }: FacilityImagesSectionProps) {
  const t = useTranslations('facilities.images');
  const router = useRouter();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<FacilityImage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);

  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);

  const handleDeleteClick = (image: FacilityImage) => {
    setSelectedImage(image);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedImage) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/facilities/${facilityId}/images?imageId=${selectedImage.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete image');
      }

      setDeleteDialogOpen(false);
      setSelectedImage(null);
      router.refresh();
    } catch (err) {
      console.error('Error deleting image:', err);
      alert(err instanceof Error ? err.message : t('deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const handleSetPrimary = async (image: FacilityImage) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/facilities/${facilityId}/images`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: image.id, is_primary: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set primary image');
      }

      router.refresh();
    } catch (err) {
      console.error('Error setting primary image:', err);
      alert(err instanceof Error ? err.message : t('updateError'));
    } finally {
      setUpdating(false);
    }
  };

  const handleMove = async (image: FacilityImage, direction: 'up' | 'down') => {
    const currentIndex = sortedImages.findIndex(img => img.id === image.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sortedImages.length) return;

    const targetImage = sortedImages[newIndex];
    setUpdating(true);

    try {
      // Swap display orders
      await Promise.all([
        fetch(`/api/facilities/${facilityId}/images`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageId: image.id, display_order: targetImage.display_order }),
        }),
        fetch(`/api/facilities/${facilityId}/images`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageId: targetImage.id, display_order: image.display_order }),
        }),
      ]);

      router.refresh();
    } catch (err) {
      console.error('Error moving image:', err);
      alert(err instanceof Error ? err.message : t('updateError'));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      {canEdit && (
        <>
          <ImageUploadDialog
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
            facilityId={facilityId}
          />
        </>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteImage')}</DialogTitle>
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
              {images.length} {images.length === 1 ? t('image') : t('images')}
            </CardDescription>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              {t('uploadImages')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="size-8 mx-auto mb-2 opacity-50" />
              <p className="mb-4">{t('emptyState.description')}</p>
              {canEdit && (
                <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  {t('emptyState.uploadButton')}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedImages.map((image, index) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square relative rounded-lg overflow-hidden border">
                    <Image
                      src={image.thumbnail_url || image.url}
                      alt={image.description || `Facility image ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    {image.is_primary && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="default" className="flex items-center gap-1">
                          <Star className="size-3 fill-current" />
                          {t('primary')}
                        </Badge>
                      </div>
                    )}
                    {canEdit && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => handleSetPrimary(image)}
                          disabled={updating || image.is_primary}
                          className="size-8"
                          title={t('setPrimary')}
                        >
                          <Star className={`size-4 ${image.is_primary ? 'fill-current' : ''}`} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => handleMove(image, 'up')}
                          disabled={updating || index === 0}
                          className="size-8"
                          title={t('moveUp')}
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => handleMove(image, 'down')}
                          disabled={updating || index === sortedImages.length - 1}
                          className="size-8"
                          title={t('moveDown')}
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteClick(image)}
                          disabled={updating}
                          className="size-8"
                          title={t('delete')}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {image.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {image.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
