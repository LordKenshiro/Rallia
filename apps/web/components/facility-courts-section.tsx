'use client';

import { AddCourtDialog } from '@/components/add-court-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { Building2, ChevronRight, Lightbulb, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface Court {
  id: string;
  name: string | null;
  court_number: number | null;
  surface_type: string | null;
  indoor: boolean | null;
  lighting: boolean | null;
  availability_status: string | null;
  is_active: boolean | null;
}

interface FacilityCourtsSectionProps {
  facilityId: string;
  courts: Court[];
  canEdit: boolean;
}

export function FacilityCourtsSection({ facilityId, courts, canEdit }: FacilityCourtsSectionProps) {
  const t = useTranslations('facilities');
  const tCourts = useTranslations('courts');
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      {canEdit && (
        <AddCourtDialog open={dialogOpen} onOpenChange={setDialogOpen} facilityId={facilityId} />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t('detail.courtsSection')}</CardTitle>
            <CardDescription>
              {courts.length} {courts.length === 1 ? 'court' : 'courts'} at this facility
            </CardDescription>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              {tCourts('addCourt')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {courts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="size-8 mx-auto mb-2 opacity-50" />
              <p className="mb-4">{tCourts('emptyState.description')}</p>
              {canEdit && (
                <Button variant="outline" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  {tCourts('emptyState.addButton')}
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {courts.map(court => (
                <Link
                  key={court.id}
                  href={`/dashboard/facilities/${facilityId}/courts/${court.id}`}
                  className="flex items-center justify-between py-2.5 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div
                      className={`size-2.5 rounded-full shrink-0 ${
                        court.availability_status === 'available'
                          ? 'bg-green-500'
                          : court.availability_status === 'maintenance'
                            ? 'bg-yellow-500'
                            : 'bg-gray-400'
                      }`}
                    />
                    <span className="font-semibold text-sm shrink-0">
                      {court.name || `Court ${court.court_number}`}
                    </span>
                    {court.court_number && court.name && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        #{court.court_number}
                      </span>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                      {court.surface_type && (
                        <span>{tCourts(`surface.${court.surface_type}`)}</span>
                      )}
                      {court.indoor !== undefined && court.indoor !== null && (
                        <span>
                          • {court.indoor ? tCourts('type.indoor') : tCourts('type.outdoor')}
                        </span>
                      )}
                      {court.lighting && (
                        <span className="flex items-center gap-1">
                          <Lightbulb className="size-2.5" />
                          Lighting
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={court.availability_status === 'available' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {tCourts(`status.${court.availability_status}`)}
                    </Badge>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
