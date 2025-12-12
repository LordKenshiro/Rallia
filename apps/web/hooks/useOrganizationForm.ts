'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  OrganizationData,
  OrganizationNature,
  Country,
  FacilityType,
  Facility,
  CreateFacility,
  UpdateFacility,
  CreateFacilityImage,
  UpdateFacilityImage,
  NewImage,
  ExistingImage,
  FacilityContact,
  CourtRow,
  SurfaceType,
  Sport,
  isExistingImage,
  isNewImage,
} from '@/components/organization-form/types';

interface UseOrganizationFormProps {
  organizationSlug?: string;
  initialData?: {
    organization: OrganizationData & {
      id: string;
      slug: string;
      postal_code?: string;
      description?: string;
    };
    facilities: any[];
  };
}

export function useOrganizationForm({ organizationSlug, initialData }: UseOrganizationFormProps) {
  const isUpdateMode = !!initialData;

  // ============ STATE ============
  const [sports, setSports] = useState<Sport[]>([]);
  const [loadingSports, setLoadingSports] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdOrganization, setCreatedOrganization] = useState<{
    slug: string;
    name: string;
  } | null>(null);

  const [orgSlug, setOrgSlug] = useState(organizationSlug || '');

  // Track original facility IDs from database (to distinguish from client-generated ones)
  const [originalFacilityIds] = useState<Set<string>>(() => {
    if (isUpdateMode && initialData) {
      return new Set(initialData.facilities.map((f: any) => f.id).filter(Boolean));
    }
    return new Set();
  });

  // Organization form data
  const [orgData, setOrgData] = useState<OrganizationData>(() => {
    if (isUpdateMode && initialData) {
      return {
        name: initialData.organization.name,
        nature: initialData.organization.nature,
        email: initialData.organization.email || '',
        phone: initialData.organization.phone || '',
        address: initialData.organization.address || '',
        city: initialData.organization.city || '',
        country: initialData.organization.country || '',
        postalCode: initialData.organization.postal_code || '',
        website: initialData.organization.website || '',
        type: initialData.organization.type || undefined,
        description: initialData.organization.description || undefined,
      };
    }
    return {
      name: '',
      nature: 'public' as OrganizationNature,
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '' as Country,
      postalCode: '',
      website: '',
    };
  });

  // Facilities array - initialize based on mode
  const [facilities, setFacilities] = useState<Facility[]>(() => {
    if (isUpdateMode && initialData) {
      return initialData.facilities.map((facility: any) => {
        // Convert existing images from facility_files joined with files
        const images: UpdateFacilityImage[] =
          facility.facility_file?.map((ff: any) => ({
            id: ff.id, // facility_files junction table id
            fileId: ff.files?.id || ff.file_id, // files table id
            url: ff.files?.url || '',
            thumbnail_url: ff.files?.thumbnail_url || null,
            display_order: ff.display_order || 0,
            is_primary: ff.is_primary || false,
          })) || [];

        // Convert contacts
        const contacts: FacilityContact[] =
          facility.facility_contact?.map((contact: any) => ({
            id: contact.id || crypto.randomUUID(),
            phone: contact.phone || '',
            email: contact.email || '',
            website: contact.website || '',
            contactType: contact.contact_type,
            isPrimary: contact.is_primary,
            sportId: contact.sport_id || null,
          })) || [];

        // Convert courts to court rows (group by surface type, lighting, indoor, sports)
        const courtRowsMap = new Map<string, CourtRow>();
        facility.courts?.forEach((court: any) => {
          const sportIds =
            court.court_sport
              ?.map((cs: any) => cs.sport_id)
              .sort()
              .join(',') || '';
          const key = `${court.surface_type || ''}-${court.lighting}-${court.indoor}-${sportIds}`;
          if (courtRowsMap.has(key)) {
            const existing = courtRowsMap.get(key)!;
            existing.quantity += 1;
          } else {
            courtRowsMap.set(key, {
              id: crypto.randomUUID(),
              surfaceType: (court.surface_type as SurfaceType) || '',
              lighting: court.lighting,
              indoor: court.indoor,
              quantity: 1,
              sportIds: court.court_sport?.map((cs: any) => cs.sport_id) || [],
            });
          }
        });

        return {
          id: facility.id || crypto.randomUUID(),
          images,
          name: facility.name,
          facilityType: (facility.facility_type as FacilityType) || '',
          membershipRequired: facility.membership_required || false,
          address: facility.address || '',
          city: facility.city || '',
          country: (facility.country as Country) || '',
          postalCode: facility.postal_code || '',
          latitude: facility.latitude?.toString() || '',
          longitude: facility.longitude?.toString() || '',
          selectedSports: facility.facility_sport?.map((fs: any) => fs.sport_id) || [],
          contacts:
            contacts.length > 0
              ? contacts
              : [
                  {
                    id: crypto.randomUUID(),
                    phone: '',
                    email: '',
                    website: '',
                    contactType: 'reservation',
                    isPrimary: true,
                    sportId: null,
                  },
                ],
          courtRows: Array.from(courtRowsMap.values()),
        };
      });
    }
    // Create mode: default empty facility
    return [
      {
        id: crypto.randomUUID(),
        images: [],
        name: '',
        facilityType: '' as FacilityType,
        membershipRequired: false,
        address: '',
        city: '',
        country: '' as Country,
        postalCode: '',
        latitude: '',
        longitude: '',
        selectedSports: [],
        contacts: [
          {
            id: crypto.randomUUID(),
            phone: '',
            email: '',
            website: '',
            contactType: 'reservation',
            isPrimary: true,
            sportId: null,
          },
        ],
        courtRows: [],
      },
    ];
  });

  // ============ EFFECTS ============
  // Fetch sports on mount
  useEffect(() => {
    const fetchSports = async () => {
      try {
        const response = await fetch('/api/sports');
        if (response.ok) {
          const data = await response.json();
          const fetchedSports = data.sports || [];
          setSports(fetchedSports);
        }
      } catch (error) {
        console.error('Error fetching sports:', error);
      } finally {
        setLoadingSports(false);
      }
    };

    fetchSports();
  }, []);

  // ============ HELPERS ============
  const generateSlug = useCallback((name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }, []);

  // ============ ORGANIZATION HANDLERS ============
  const handleOrgChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setOrgData(prev => ({ ...prev, [name]: value }));
      setErrorMessage(null);
    },
    []
  );

  // ============ FACILITY HANDLERS ============
  const handleFacilityChange = useCallback(
    (facilityId: string, field: keyof Facility, value: any) => {
      setFacilities(prev => {
        return prev.map(facility =>
          facility.id === facilityId ? { ...facility, [field]: value } : facility
        );
      });
    },
    []
  );

  const handleImageUpload = useCallback(
    (facilityId: string, files: FileList | null) => {
      if (!files) return;

      if (isUpdateMode) {
        // Update mode: create NewImage objects
        const newImages: NewImage[] = Array.from(files).map(file => ({
          file,
          preview: URL.createObjectURL(file),
          tempId: `new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        }));

        setFacilities(prev => {
          return prev.map(facility => {
            if (facility.id === facilityId) {
              const updateFacility = facility as UpdateFacility;
              return {
                ...updateFacility,
                images: [...updateFacility.images, ...newImages],
              };
            }
            return facility;
          });
        });
      } else {
        // Create mode: simple File-based images
        const newImages: CreateFacilityImage[] = Array.from(files).map(file => ({
          file,
          preview: URL.createObjectURL(file),
        }));

        setFacilities(prev => {
          return prev.map(facility => {
            if (facility.id === facilityId) {
              const createFacility = facility as CreateFacility;
              return {
                ...createFacility,
                images: [...createFacility.images, ...newImages],
              };
            }
            return facility;
          });
        });
      }
    },
    [isUpdateMode]
  );

  const removeImage = useCallback(
    (facilityId: string, imageIdentifier: string) => {
      setFacilities(prev => {
        return prev.map(facility => {
          if (facility.id === facilityId) {
            if (isUpdateMode) {
              // Update mode: handle both existing and new images
              const updateFacility = facility as UpdateFacility;
              const image = updateFacility.images.find(img => {
                if (isExistingImage(img)) {
                  return img.id === imageIdentifier;
                } else if (isNewImage(img)) {
                  return img.tempId === imageIdentifier;
                }
                return false;
              });

              // Revoke object URL if it's a new image
              if (image && isNewImage(image)) {
                URL.revokeObjectURL(image.preview);
              }

              return {
                ...updateFacility,
                images: updateFacility.images.filter(img => {
                  if (isExistingImage(img)) {
                    return img.id !== imageIdentifier;
                  } else if (isNewImage(img)) {
                    return img.tempId !== imageIdentifier;
                  }
                  return false;
                }),
              };
            } else {
              // Create mode: simple preview-based removal
              const createFacility = facility as CreateFacility;
              const image = createFacility.images.find(img => img.preview === imageIdentifier);
              if (image) {
                URL.revokeObjectURL(image.preview);
              }
              return {
                ...createFacility,
                images: createFacility.images.filter(img => img.preview !== imageIdentifier),
              };
            }
          }
          return facility;
        });
      });
    },
    [isUpdateMode]
  );

  const addFacility = useCallback(() => {
    const newFacility: Facility = {
      id: crypto.randomUUID(),
      images: [],
      name: '',
      facilityType: '' as FacilityType,
      membershipRequired: false,
      address: '',
      city: '',
      country: '' as Country,
      postalCode: '',
      latitude: '',
      longitude: '',
      selectedSports: [],
      contacts: [
        {
          id: crypto.randomUUID(),
          phone: '',
          email: '',
          website: '',
          contactType: 'reservation',
          isPrimary: true,
          sportId: null,
        },
      ],
      courtRows: [],
    };
    setFacilities(prev => [...prev, newFacility]);
  }, []);

  const removeFacility = useCallback(
    (facilityId: string) => {
      setFacilities(prev => {
        const facility = prev.find(f => f.id === facilityId);
        if (facility) {
          // Clean up image previews
          facility.images.forEach(img => {
            if (isUpdateMode && isNewImage(img as UpdateFacilityImage)) {
              URL.revokeObjectURL((img as NewImage).preview);
            } else if (!isUpdateMode) {
              URL.revokeObjectURL((img as CreateFacilityImage).preview);
            }
          });
        }
        return prev.filter(f => f.id !== facilityId);
      });
    },
    [isUpdateMode]
  );

  const handleUseOrgAddressToggle = useCallback(
    (facilityId: string, checked: boolean) => {
      setFacilities(prev => {
        return prev.map(facility =>
          facility.id === facilityId && checked
            ? {
                ...facility,
                address: orgData.address,
                city: orgData.city,
                country: orgData.country,
                postalCode: orgData.postalCode,
              }
            : facility
        );
      });
    },
    [orgData.address, orgData.city, orgData.country, orgData.postalCode]
  );

  const handleUseOrgContactToggle = useCallback(
    (facilityId: string, checked: boolean) => {
      setFacilities(prev => {
        return prev.map(facility => {
          if (facility.id === facilityId && facility.contacts.length > 0) {
            if (checked) {
              // Update the first contact with org contact info
              return {
                ...facility,
                contacts: facility.contacts.map((contact, index) =>
                  index === 0
                    ? {
                        ...contact,
                        email: orgData.email || '',
                        phone: orgData.phone,
                        website: orgData.website,
                      }
                    : contact
                ),
              };
            } else {
              // Reset the first contact fields when unchecked
              return {
                ...facility,
                contacts: facility.contacts.map((contact, index) =>
                  index === 0
                    ? {
                        ...contact,
                        email: '',
                        phone: '',
                        website: '',
                      }
                    : contact
                ),
              };
            }
          }
          return facility;
        });
      });
    },
    [orgData.email, orgData.phone, orgData.website]
  );

  // ============ CONTACT HANDLERS ============
  const addContact = useCallback((facilityId: string) => {
    setFacilities(prev => {
      return prev.map(facility =>
        facility.id === facilityId
          ? {
              ...facility,
              contacts: [
                ...facility.contacts,
                {
                  id: crypto.randomUUID(),
                  phone: '',
                  email: '',
                  website: '',
                  contactType: 'reservation' as const,
                  isPrimary: false,
                  sportId: null,
                },
              ],
            }
          : facility
      );
    });
  }, []);

  const removeContact = useCallback((facilityId: string, contactId: string) => {
    setFacilities(prev => {
      return prev.map(facility => {
        if (facility.id === facilityId) {
          const contactToRemove = facility.contacts.find(c => c.id === contactId);
          const wasPrimary = contactToRemove?.isPrimary || false;

          const updatedContacts = facility.contacts.filter(c => c.id !== contactId);

          // If the removed contact was primary and there are remaining contacts,
          // set the first remaining contact as primary
          if (wasPrimary && updatedContacts.length > 0) {
            updatedContacts[0].isPrimary = true;
          }

          return {
            ...facility,
            contacts: updatedContacts,
          };
        }
        return facility;
      });
    });
  }, []);

  const updateContact = useCallback(
    (facilityId: string, contactId: string, field: keyof FacilityContact, value: any) => {
      setFacilities(prev => {
        return prev.map(facility => {
          if (facility.id === facilityId) {
            const updatedContacts = facility.contacts.map(contact =>
              contact.id === contactId ? { ...contact, [field]: value } : contact
            );

            // If setting isPrimary to true, ensure all other contacts are false
            if (field === 'isPrimary' && value === true) {
              return {
                ...facility,
                contacts: updatedContacts.map(contact =>
                  contact.id === contactId ? contact : { ...contact, isPrimary: false }
                ),
              };
            }

            return {
              ...facility,
              contacts: updatedContacts,
            };
          }
          return facility;
        });
      });
    },
    []
  );

  // ============ COURT HANDLERS ============
  const addCourtRow = useCallback((facilityId: string) => {
    setFacilities(prev => {
      return prev.map(facility =>
        facility.id === facilityId
          ? {
              ...facility,
              courtRows: [
                ...facility.courtRows,
                {
                  id: crypto.randomUUID(),
                  surfaceType: '' as const,
                  lighting: false,
                  indoor: false,
                  quantity: 1,
                  sportIds: [],
                },
              ],
            }
          : facility
      );
    });
  }, []);

  const removeCourtRow = useCallback((facilityId: string, rowId: string) => {
    setFacilities(prev => {
      return prev.map(facility =>
        facility.id === facilityId
          ? {
              ...facility,
              courtRows: facility.courtRows.filter(row => row.id !== rowId),
            }
          : facility
      );
    });
  }, []);

  const updateCourtRow = useCallback(
    (facilityId: string, rowId: string, field: keyof CourtRow, value: any) => {
      setFacilities(prev => {
        return prev.map(facility => {
          if (facility.id === facilityId) {
            return {
              ...facility,
              courtRows: facility.courtRows.map(row =>
                row.id === rowId ? { ...row, [field]: value } : row
              ),
            };
          }
          return facility;
        });
      });
    },
    []
  );

  // ============ IMAGE HELPERS ============
  const getImageSrc = useCallback(
    (image: Facility['images'][number]): string => {
      if (isUpdateMode) {
        const updateImage = image as UpdateFacilityImage;
        if (isExistingImage(updateImage)) {
          return updateImage.thumbnail_url ?? updateImage.url;
        } else if (isNewImage(updateImage)) {
          return updateImage.preview;
        }
      } else {
        return (image as CreateFacilityImage).preview;
      }
      return '';
    },
    [isUpdateMode]
  );

  const getImageIdentifier = useCallback(
    (image: Facility['images'][number]): string => {
      if (isUpdateMode) {
        const updateImage = image as UpdateFacilityImage;
        if (isExistingImage(updateImage)) {
          return updateImage.id;
        } else if (isNewImage(updateImage)) {
          return updateImage.tempId;
        }
      } else {
        return (image as CreateFacilityImage).preview;
      }
      return '';
    },
    [isUpdateMode]
  );

  // ============ FORM ACTIONS ============
  const resetForm = useCallback(() => {
    setOrgData({
      name: '',
      nature: 'public' as OrganizationNature,
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '' as Country,
      postalCode: '',
      website: '',
    });
    setFacilities([
      {
        id: crypto.randomUUID(),
        images: [],
        name: '',
        facilityType: '' as FacilityType,
        membershipRequired: false,
        address: '',
        city: '',
        country: '' as Country,
        postalCode: '',
        latitude: '',
        longitude: '',
        selectedSports: [],
        contacts: [
          {
            id: crypto.randomUUID(),
            phone: '',
            email: '',
            website: '',
            contactType: 'reservation',
            isPrimary: true,
            sportId: null,
          },
        ],
        courtRows: [],
      },
    ]);
    setErrorMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ============ RETURN ============
  return {
    // Mode
    isUpdateMode,

    // State
    sports,
    loadingSports,
    isSubmitting,
    errorMessage,
    showSuccessModal,
    createdOrganization,
    orgSlug,
    orgData,
    facilities,
    originalFacilityIds,

    // State setters
    setIsSubmitting,
    setErrorMessage,
    setShowSuccessModal,
    setCreatedOrganization,

    // Helpers
    generateSlug,

    // Organization handlers
    handleOrgChange,

    // Facility handlers
    handleFacilityChange,
    handleImageUpload,
    removeImage,
    addFacility,
    removeFacility,
    handleUseOrgAddressToggle,
    handleUseOrgContactToggle,

    // Contact handlers
    addContact,
    removeContact,
    updateContact,

    // Court handlers
    addCourtRow,
    removeCourtRow,
    updateCourtRow,

    // Image helpers
    getImageSrc,
    getImageIdentifier,

    // Form actions
    resetForm,
  };
}

// Export the return type for the context
export type OrganizationFormContextValue = ReturnType<typeof useOrganizationForm>;
