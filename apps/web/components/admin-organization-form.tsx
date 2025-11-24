"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Enums, Tables } from "@/types";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";

type OrganizationNature = Enums<"organization_nature_enum">;
type OrganizationType = Enums<"organization_type_enum"> | "";
type Country = Enums<"country_enum"> | "";
type FacilityType = Enums<"facility_type_enum"> | "";
type SurfaceType = Enums<"surface_type_enum"> | "";
type ContactType = Enums<"facility_contact_type_enum">;

// Use generated types
type Sport = Pick<Tables<"sports">, "id" | "name" | "slug">;
type ExistingImage = Pick<
  Tables<"facility_images">,
  "id" | "url" | "thumbnail_url" | "description"
>;

interface NewImage {
  file: File;
  preview: string;
  tempId: string;
}

// For create mode: simple File-based images
interface CreateFacilityImage {
  file: File;
  preview: string;
}

// For update mode: union type
type UpdateFacilityImage = ExistingImage | NewImage;

function isExistingImage(image: UpdateFacilityImage): image is ExistingImage {
  return image != null && "id" in image && !("file" in image);
}

function isNewImage(image: UpdateFacilityImage): image is NewImage {
  return image != null && "file" in image && "preview" in image;
}

interface FacilityContact {
  id: string;
  phone: string;
  email: string;
  website: string;
  contactType: ContactType;
  isPrimary: boolean;
  sportId: string | null;
}

interface CourtRow {
  id: string;
  surfaceType: SurfaceType | "";
  lighting: boolean;
  indoor: boolean;
  quantity: number;
  sportIds: string[];
}

interface OrganizationData {
  name: string;
  nature: OrganizationNature;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: Country;
  postalCode: string;
  website: string;
  type?: OrganizationType;
  description?: string;
}

interface AdminOrganizationFormProps {
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

// Create mode: simple image type
interface CreateFacility {
  id: string;
  images: CreateFacilityImage[];
  name: string;
  address: string;
  city: string;
  country: Country;
  postalCode: string;
  latitude: string;
  longitude: string;
  selectedSports: string[];
  contacts: FacilityContact[];
  courtRows: CourtRow[];
}

// Update mode: union image type
interface UpdateFacility {
  id: string;
  images: UpdateFacilityImage[];
  name: string;
  address: string;
  city: string;
  country: Country;
  postalCode: string;
  latitude: string;
  longitude: string;
  selectedSports: string[];
  contacts: FacilityContact[];
  courtRows: CourtRow[];
}

type Facility = CreateFacility | UpdateFacility;

export function AdminOrganizationForm({
  organizationSlug,
  initialData,
}: AdminOrganizationFormProps) {
  const isUpdateMode = !!initialData;
  const t = useTranslations(
    isUpdateMode ? "admin.organizations.update" : "admin.organizations.create"
  );
  const router = useRouter();

  const [sports, setSports] = useState<Sport[]>([]);
  const [loadingSports, setLoadingSports] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdOrganization, setCreatedOrganization] = useState<{
    slug: string;
    name: string;
  } | null>(null);

  const [orgSlug, setOrgSlug] = useState(organizationSlug || "");

  // Organization form data
  const [orgData, setOrgData] = useState<OrganizationData>(() => {
    if (isUpdateMode && initialData) {
      return {
        name: initialData.organization.name,
        nature: initialData.organization.nature,
        email: initialData.organization.email,
        phone: initialData.organization.phone || "",
        address: initialData.organization.address || "",
        city: initialData.organization.city || "",
        country: initialData.organization.country || "",
        postalCode: initialData.organization.postal_code || "",
        website: initialData.organization.website || "",
        type: initialData.organization.type || undefined,
        description: initialData.organization.description || undefined,
      };
    }
    return {
      name: "",
      nature: "public" as OrganizationNature,
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "" as Country,
      postalCode: "",
      website: "",
    };
  });

  // Facilities array - initialize based on mode
  const [facilities, setFacilities] = useState<Facility[]>(() => {
    if (isUpdateMode && initialData) {
      return initialData.facilities.map((facility: any) => {
        // Convert existing images
        const images: UpdateFacilityImage[] =
          facility.facility_images?.map((img: any) => ({
            id: img.id,
            url: img.url,
            thumbnail_url: img.thumbnail_url,
            description: img.description,
          })) || [];

        // Convert contacts
        const contacts: FacilityContact[] =
          facility.facility_contacts?.map((contact: any) => ({
            id: contact.id || crypto.randomUUID(),
            phone: contact.phone || "",
            email: contact.email || "",
            website: contact.website || "",
            contactType: contact.contact_type as ContactType,
            isPrimary: contact.is_primary,
            sportId: contact.sport_id || null,
          })) || [];

        // Convert courts to court rows (group by surface type, lighting, indoor, sports)
        const courtRowsMap = new Map<string, CourtRow>();
        facility.courts?.forEach((court: any) => {
          const sportIds =
            court.court_sports
              ?.map((cs: any) => cs.sport_id)
              .sort()
              .join(",") || "";
          const key = `${court.surface_type || ""}-${court.lighting}-${
            court.indoor
          }-${sportIds}`;
          if (courtRowsMap.has(key)) {
            const existing = courtRowsMap.get(key)!;
            existing.quantity += 1;
          } else {
            courtRowsMap.set(key, {
              id: crypto.randomUUID(),
              surfaceType: (court.surface_type as SurfaceType) || "",
              lighting: court.lighting,
              indoor: court.indoor,
              quantity: 1,
              sportIds: court.court_sports?.map((cs: any) => cs.sport_id) || [],
            });
          }
        });

        return {
          id: facility.id || crypto.randomUUID(),
          images,
          name: facility.name,
          address: facility.address || "",
          city: facility.city || "",
          country: (facility.country as Country) || "",
          postalCode: facility.postal_code || "",
          latitude: facility.latitude?.toString() || "",
          longitude: facility.longitude?.toString() || "",
          selectedSports:
            facility.facility_sports?.map((fs: any) => fs.sport_id) || [],
          contacts:
            contacts.length > 0
              ? contacts
              : [
                  {
                    id: crypto.randomUUID(),
                    phone: "",
                    email: "",
                    website: "",
                    contactType: "general",
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
        name: "",
        address: "",
        city: "",
        country: "" as Country,
        postalCode: "",
        latitude: "",
        longitude: "",
        selectedSports: [],
        contacts: [
          {
            id: crypto.randomUUID(),
            phone: "",
            email: "",
            website: "",
            contactType: "general",
            isPrimary: true,
            sportId: null,
          },
        ],
        courtRows: [],
      },
    ];
  });

  // Fetch sports on mount
  useEffect(() => {
    const fetchSports = async () => {
      try {
        const response = await fetch("/api/sports");
        if (response.ok) {
          const data = await response.json();
          const fetchedSports = data.sports || [];
          setSports(fetchedSports);
        }
      } catch (error) {
        console.error("Error fetching sports:", error);
      } finally {
        setLoadingSports(false);
      }
    };

    fetchSports();
  }, []);

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleOrgChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setOrgData((prev) => ({ ...prev, [name]: value }));
    setErrorMessage(null);
  };

  const handleFacilityChange = (
    facilityId: string,
    field: keyof Facility,
    value: any
  ) => {
    setFacilities((prev) => {
      return prev.map((facility) =>
        facility.id === facilityId ? { ...facility, [field]: value } : facility
      );
    });
  };

  const handleImageUpload = (facilityId: string, files: FileList | null) => {
    if (!files) return;

    if (isUpdateMode) {
      // Update mode: create NewImage objects
      const newImages: NewImage[] = Array.from(files).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        tempId: `new-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`,
      }));

      setFacilities((prev) => {
        return prev.map((facility) => {
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
      const newImages: CreateFacilityImage[] = Array.from(files).map(
        (file) => ({
          file,
          preview: URL.createObjectURL(file),
        })
      );

      setFacilities((prev) => {
        return prev.map((facility) => {
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
  };

  const removeImage = (facilityId: string, imageIdentifier: string) => {
    setFacilities((prev) => {
      return prev.map((facility) => {
        if (facility.id === facilityId) {
          if (isUpdateMode) {
            // Update mode: handle both existing and new images
            const updateFacility = facility as UpdateFacility;
            const image = updateFacility.images.find((img) => {
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
              images: updateFacility.images.filter((img) => {
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
            const image = createFacility.images.find(
              (img) => img.preview === imageIdentifier
            );
            if (image) {
              URL.revokeObjectURL(image.preview);
            }
            return {
              ...createFacility,
              images: createFacility.images.filter(
                (img) => img.preview !== imageIdentifier
              ),
            };
          }
        }
        return facility;
      });
    });
  };

  const addFacility = () => {
    const newFacility: Facility = {
      id: crypto.randomUUID(),
      images: [],
      name: "",
      address: "",
      city: "",
      country: "" as Country,
      postalCode: "",
      latitude: "",
      longitude: "",
      selectedSports: [],
      contacts: [
        {
          id: crypto.randomUUID(),
          phone: "",
          email: "",
          website: "",
          contactType: "general",
          isPrimary: true,
          sportId: null,
        },
      ],
      courtRows: [],
    };
    setFacilities((prev) => [...prev, newFacility]);
  };

  const removeFacility = (facilityId: string) => {
    setFacilities((prev) => {
      const facility = prev.find((f) => f.id === facilityId);
      if (facility) {
        // Clean up image previews
        facility.images.forEach((img) => {
          if (isUpdateMode && isNewImage(img as UpdateFacilityImage)) {
            URL.revokeObjectURL((img as NewImage).preview);
          } else if (!isUpdateMode) {
            URL.revokeObjectURL((img as CreateFacilityImage).preview);
          }
        });
      }
      return prev.filter((f) => f.id !== facilityId);
    });
  };

  const addContact = (facilityId: string) => {
    setFacilities((prev) => {
      return prev.map((facility) =>
        facility.id === facilityId
          ? {
              ...facility,
              contacts: [
                ...facility.contacts,
                {
                  id: crypto.randomUUID(),
                  phone: "",
                  email: "",
                  website: "",
                  contactType: "general",
                  isPrimary: false,
                  sportId: null,
                },
              ],
            }
          : facility
      );
    });
  };

  const removeContact = (facilityId: string, contactId: string) => {
    setFacilities((prev) => {
      return prev.map((facility) => {
        if (facility.id === facilityId) {
          const contactToRemove = facility.contacts.find(
            (c) => c.id === contactId
          );
          const wasPrimary = contactToRemove?.isPrimary || false;

          const updatedContacts = facility.contacts.filter(
            (c) => c.id !== contactId
          );

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
  };

  const handleUseOrgAddressToggle = (facilityId: string, checked: boolean) => {
    setFacilities((prev) => {
      return prev.map((facility) =>
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
  };

  const handleUseOrgContactToggle = (facilityId: string, checked: boolean) => {
    setFacilities((prev) => {
      return prev.map((facility) => {
        if (
          facility.id === facilityId &&
          checked &&
          facility.contacts.length > 0
        ) {
          // Update the first contact with org contact info
          return {
            ...facility,
            contacts: facility.contacts.map((contact, index) =>
              index === 0
                ? {
                    ...contact,
                    email: orgData.email,
                    phone: orgData.phone,
                    website: orgData.website,
                  }
                : contact
            ),
          };
        }
        return facility;
      });
    });
  };

  const updateContact = (
    facilityId: string,
    contactId: string,
    field: keyof FacilityContact,
    value: any
  ) => {
    setFacilities((prev) => {
      return prev.map((facility) => {
        if (facility.id === facilityId) {
          const updatedContacts = facility.contacts.map((contact) =>
            contact.id === contactId ? { ...contact, [field]: value } : contact
          );

          // If setting isPrimary to true, ensure all other contacts are false
          if (field === "isPrimary" && value === true) {
            return {
              ...facility,
              contacts: updatedContacts.map((contact) =>
                contact.id === contactId
                  ? contact
                  : { ...contact, isPrimary: false }
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
  };

  const addCourtRow = (facilityId: string) => {
    setFacilities((prev) => {
      return prev.map((facility) =>
        facility.id === facilityId
          ? {
              ...facility,
              courtRows: [
                ...facility.courtRows,
                {
                  id: crypto.randomUUID(),
                  surfaceType: "",
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
  };

  const removeCourtRow = (facilityId: string, rowId: string) => {
    setFacilities((prev) => {
      return prev.map((facility) =>
        facility.id === facilityId
          ? {
              ...facility,
              courtRows: facility.courtRows.filter((row) => row.id !== rowId),
            }
          : facility
      );
    });
  };

  const updateCourtRow = (
    facilityId: string,
    rowId: string,
    field: keyof CourtRow,
    value: any
  ) => {
    setFacilities((prev) => {
      return prev.map((facility) => {
        if (facility.id === facilityId) {
          return {
            ...facility,
            courtRows: facility.courtRows.map((row) =>
              row.id === rowId ? { ...row, [field]: value } : row
            ),
          };
        }
        return facility;
      });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Validate required fields
      if (!orgData.name || !orgData.email || !orgData.nature) {
        throw new Error(t("validation.requiredFields"));
      }

      // Validate at least one facility
      if (facilities.length === 0) {
        throw new Error(t("validation.atLeastOneFacility"));
      }

      // Validate facilities
      for (let i = 0; i < facilities.length; i++) {
        const facility = facilities[i];
        if (!facility.name) {
          throw new Error(
            t("validation.facilityNameRequired", { index: i + 1 })
          );
        }
        if (facility.selectedSports.length === 0) {
          throw new Error(
            t("validation.facilitySportsRequired", { index: i + 1 })
          );
        }
      }

      // Prepare form data with images
      const formData = new FormData();

      // Organization data
      formData.append(
        "organization",
        JSON.stringify({
          ...orgData,
          slug: isUpdateMode ? orgSlug : generateSlug(orgData.name),
        })
      );

      // Facilities data
      const facilitiesData = facilities.map((facility) => {
        if (isUpdateMode) {
          // Update mode: separate existing and new images
          const updateFacility = facility as UpdateFacility;
          const existingImageIds = updateFacility.images
            .filter((img): img is ExistingImage => isExistingImage(img))
            .map((img) => img.id);

          const newImageCount = updateFacility.images.filter(
            (img): img is NewImage => isNewImage(img)
          ).length;

          return {
            ...updateFacility,
            images: [], // Remove image objects
            imageCount: newImageCount,
            existingImageIds: existingImageIds,
          };
        } else {
          // Create mode: simple image count
          const createFacility = facility as CreateFacility;
          return {
            ...createFacility,
            images: createFacility.images.map(() => ({})), // Keep structure but remove file references
            imageCount: createFacility.images.length,
          };
        }
      });
      formData.append("facilities", JSON.stringify(facilitiesData));

      // Add images
      facilities.forEach((facility, facilityIndex) => {
        if (isUpdateMode) {
          const updateFacility = facility as UpdateFacility;
          updateFacility.images.forEach((image, imageIndex) => {
            // Update mode: only add new images
            if (isNewImage(image)) {
              formData.append(
                `facility_${facilityIndex}_image_${imageIndex}`,
                image.file
              );
            }
          });
        } else {
          const createFacility = facility as CreateFacility;
          createFacility.images.forEach((image, imageIndex) => {
            // Create mode: add all images
            formData.append(
              `facility_${facilityIndex}_image_${imageIndex}`,
              image.file
            );
          });
        }
      });

      const endpoint = isUpdateMode
        ? `/api/admin/organizations/${orgSlug}`
        : "/api/admin/organizations/create";
      const method = isUpdateMode ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            (isUpdateMode ? t("error.updateFailed") : t("error.createFailed"))
        );
      }

      const result = await response.json();

      if (isUpdateMode) {
        // Update mode: redirect to organization page
        router.push(`/admin/organizations/${orgSlug}`);
        router.refresh();
      } else {
        // Create mode: show success modal
        setCreatedOrganization({
          slug: result.organization.slug,
          name: result.organization.name,
        });
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error(
        `Organization ${isUpdateMode ? "update" : "creation"} error:`,
        error
      );
      setErrorMessage(
        error instanceof Error ? error.message : t("error.createFailed")
      );
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to get image source for rendering
  const getImageSrc = (image: Facility["images"][number]): string => {
    if (isUpdateMode) {
      const updateImage = image as UpdateFacilityImage;
      if (isExistingImage(updateImage)) {
        return updateImage.thumbnail_url || updateImage.url;
      } else if (isNewImage(updateImage)) {
        return updateImage.preview;
      }
    } else {
      return (image as CreateFacilityImage).preview;
    }
    return "";
  };

  // Helper function to get image identifier for removal
  const getImageIdentifier = (image: Facility["images"][number]): string => {
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
    return "";
  };

  return (
    <Card className="w-full border">
      <CardHeader>
        <CardTitle className="text-2xl">{t("formTitle")}</CardTitle>
        <CardDescription>{t("formDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {errorMessage && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          {/* Organization Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {t("sections.organization")}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="org-name" className="text-sm font-medium">
                  {t("fields.orgName")}{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  id="org-name"
                  name="name"
                  value={orgData.name}
                  onChange={handleOrgChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="org-nature" className="text-sm font-medium">
                  {t("fields.orgNature")}{" "}
                  <span className="text-destructive">*</span>
                </label>
                <select
                  id="org-nature"
                  name="nature"
                  value={orgData.nature}
                  onChange={handleOrgChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="public">{t("natures.public")}</option>
                  <option value="private">{t("natures.private")}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="org-email" className="text-sm font-medium">
                  {t("fields.email")}{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  id="org-email"
                  name="email"
                  type="email"
                  value={orgData.email}
                  onChange={handleOrgChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="org-phone" className="text-sm font-medium">
                  {t("fields.phone")}
                </label>
                <Input
                  id="org-phone"
                  name="phone"
                  type="tel"
                  value={orgData.phone}
                  onChange={handleOrgChange}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="org-website" className="text-sm font-medium">
                  {t("fields.website")}
                </label>
                <Input
                  id="org-website"
                  name="website"
                  type="url"
                  value={orgData.website}
                  onChange={handleOrgChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label htmlFor="org-address" className="text-sm font-medium">
                  {t("fields.address")}
                </label>
                <Input
                  id="org-address"
                  name="address"
                  value={orgData.address}
                  onChange={handleOrgChange}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="org-city" className="text-sm font-medium">
                  {t("fields.city")}
                </label>
                <Input
                  id="org-city"
                  name="city"
                  value={orgData.city}
                  onChange={handleOrgChange}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="org-country" className="text-sm font-medium">
                  {t("fields.country")}
                </label>
                <select
                  id="org-country"
                  name="country"
                  value={orgData.country}
                  onChange={handleOrgChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t("fields.selectCountry")}</option>
                  <option value="Canada">Canada</option>
                  <option value="United States">United States</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="org-postalCode" className="text-sm font-medium">
                  {t("fields.postalCode")}
                </label>
                <Input
                  id="org-postalCode"
                  name="postalCode"
                  value={orgData.postalCode}
                  onChange={handleOrgChange}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Facilities Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {t("sections.facilities")}
              </h3>
            </div>

            {facilities.map((facility, facilityIndex) => (
              <Card key={facility.id} className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {t("sections.facility")} {facilityIndex + 1}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFacility(facility.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Facility Images */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold">
                      {t("sections.facilityImages")}
                    </h4>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) =>
                          handleImageUpload(facility.id, e.target.files)
                        }
                        className="hidden"
                        id={`facility-${facility.id}-images`}
                      />
                      <label
                        htmlFor={`facility-${facility.id}-images`}
                        className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
                      >
                        <div className="text-center">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {t("actions.uploadImages")}
                          </p>
                        </div>
                      </label>
                      {facility.images.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {facility.images.map((image, imageIndex) => {
                            const imageSrc = getImageSrc(image);
                            const imageIdentifier = getImageIdentifier(image);
                            return (
                              <div
                                key={imageIdentifier}
                                className="relative group"
                              >
                                {isUpdateMode &&
                                isExistingImage(
                                  image as UpdateFacilityImage
                                ) ? (
                                  <Image
                                    src={imageSrc}
                                    alt={`Image ${imageIndex + 1}`}
                                    width={96}
                                    height={96}
                                    className="w-full h-24 object-cover rounded border"
                                  />
                                ) : (
                                  <img
                                    src={imageSrc}
                                    alt={`Preview ${imageIndex + 1}`}
                                    className="w-full h-24 object-cover rounded border"
                                  />
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeImage(facility.id, imageIdentifier)
                                  }
                                  className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Facility Basic Info */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-semibold">
                        {t("sections.facilityInfo")}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {t("fields.facilityName")}{" "}
                            <span className="text-destructive">*</span>
                          </label>
                          <Input
                            value={facility.name}
                            onChange={(e) =>
                              handleFacilityChange(
                                facility.id,
                                "name",
                                e.target.value
                              )
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {t("fields.latitude")}
                          </label>
                          <Input
                            type="number"
                            step="any"
                            value={facility.latitude}
                            onChange={(e) =>
                              handleFacilityChange(
                                facility.id,
                                "latitude",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {t("fields.longitude")}
                          </label>
                          <Input
                            type="number"
                            step="any"
                            value={facility.longitude}
                            onChange={(e) =>
                              handleFacilityChange(
                                facility.id,
                                "longitude",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                    {facilities.length === 1 && facilityIndex === 0 && (
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            orgData.address !== "" &&
                            facility.address === orgData.address &&
                            facility.city === orgData.city &&
                            facility.country === orgData.country &&
                            facility.postalCode === orgData.postalCode
                          }
                          onChange={(e) => {
                            handleUseOrgAddressToggle(
                              facility.id,
                              e.target.checked
                            );
                          }}
                          className="rounded border-input"
                        />
                        <span className="text-sm font-medium">
                          {t("actions.useOrgAddress")}
                        </span>
                      </label>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          {t("fields.address")}
                        </label>
                        <Input
                          value={facility.address}
                          onChange={(e) =>
                            handleFacilityChange(
                              facility.id,
                              "address",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          {t("fields.city")}
                        </label>
                        <Input
                          value={facility.city}
                          onChange={(e) =>
                            handleFacilityChange(
                              facility.id,
                              "city",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          {t("fields.country")}
                        </label>
                        <select
                          value={facility.country}
                          onChange={(e) =>
                            handleFacilityChange(
                              facility.id,
                              "country",
                              e.target.value as Country
                            )
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">{t("fields.selectCountry")}</option>
                          <option value="Canada">Canada</option>
                          <option value="United States">United States</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          {t("fields.postalCode")}
                        </label>
                        <Input
                          value={facility.postalCode}
                          onChange={(e) =>
                            handleFacilityChange(
                              facility.id,
                              "postalCode",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Facility Contacts */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-semibold">
                        {t("sections.contacts")}
                      </h4>
                    </div>

                    {facility.contacts.map((contact, contactIndex) => (
                      <Card key={contact.id} className="border">
                        <CardContent className="pt-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-semibold">
                              {t("sections.contact")} {contactIndex + 1}
                            </h5>
                            {facility.contacts.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  removeContact(facility.id, contact.id)
                                }
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>

                          {contactIndex === 0 &&
                            facilityIndex === 0 &&
                            facilities.length === 1 && (
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={
                                    (orgData.email !== "" ||
                                      orgData.phone !== "" ||
                                      orgData.website !== "") &&
                                    contact.email === orgData.email &&
                                    contact.phone === orgData.phone &&
                                    contact.website === orgData.website
                                  }
                                  onChange={(e) => {
                                    handleUseOrgContactToggle(
                                      facility.id,
                                      e.target.checked
                                    );
                                  }}
                                  className="rounded border-input"
                                />
                                <span className="text-sm font-medium">
                                  {t("actions.useOrgContact")}
                                </span>
                              </label>
                            )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                {t("fields.contactType")}{" "}
                                <span className="text-destructive">*</span>
                              </label>
                              <select
                                value={contact.contactType}
                                onChange={(e) =>
                                  updateContact(
                                    facility.id,
                                    contact.id,
                                    "contactType",
                                    e.target.value
                                  )
                                }
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                              >
                                <option value="general">
                                  {t("contactTypes.general")}
                                </option>
                                <option value="reservation">
                                  {t("contactTypes.reservation")}
                                </option>
                                <option value="maintenance">
                                  {t("contactTypes.maintenance")}
                                </option>
                                <option value="other">
                                  {t("contactTypes.other")}
                                </option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                {t("fields.phone")}
                              </label>
                              <Input
                                type="tel"
                                value={contact.phone}
                                onChange={(e) =>
                                  updateContact(
                                    facility.id,
                                    contact.id,
                                    "phone",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                {t("fields.email")}
                              </label>
                              <Input
                                type="email"
                                value={contact.email}
                                onChange={(e) =>
                                  updateContact(
                                    facility.id,
                                    contact.id,
                                    "email",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                {t("fields.website")}
                              </label>
                              <Input
                                type="url"
                                value={contact.website}
                                onChange={(e) =>
                                  updateContact(
                                    facility.id,
                                    contact.id,
                                    "website",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={contact.isPrimary}
                              onChange={(e) =>
                                updateContact(
                                  facility.id,
                                  contact.id,
                                  "isPrimary",
                                  e.target.checked
                                )
                              }
                              className="rounded border-input"
                            />
                            <label className="text-sm">
                              {t("fields.isPrimary")}
                            </label>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <div className="flex items-center justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addContact(facility.id);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("actions.addContact")}
                      </Button>
                    </div>
                  </div>

                  {/* Sports Selection */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold">
                      {t("sections.sports")}
                    </h4>
                    {loadingSports ? (
                      <p className="text-sm text-muted-foreground">
                        {t("loading.sports")}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {sports.map((sport) => {
                          const isSelected = facility.selectedSports.includes(
                            sport.id
                          );
                          return (
                            <label
                              key={sport.id}
                              className="cursor-pointer"
                              htmlFor={`sport-${facility.id}-${sport.id}`}
                            >
                              <input
                                type="checkbox"
                                id={`sport-${facility.id}-${sport.id}`}
                                checked={isSelected}
                                onChange={(e) => {
                                  const updated = e.target.checked
                                    ? [...facility.selectedSports, sport.id]
                                    : facility.selectedSports.filter(
                                        (id) => id !== sport.id
                                      );
                                  handleFacilityChange(
                                    facility.id,
                                    "selectedSports",
                                    updated
                                  );
                                }}
                                className="hidden"
                              />
                              <Badge
                                variant={isSelected ? "default" : "outline"}
                                className={cn(
                                  "px-4 py-2 text-sm font-medium transition-all cursor-pointer hover:scale-105",
                                  isSelected
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                    : "hover:bg-accent hover:text-accent-foreground"
                                )}
                              >
                                {sport.name
                                  .split(" ")
                                  .map(
                                    (word) =>
                                      word.charAt(0).toUpperCase() +
                                      word.slice(1).toLowerCase()
                                  )
                                  .join(" ")}
                              </Badge>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Court Rows */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-semibold">
                        {t("sections.courts")}
                      </h4>
                    </div>

                    {facility.courtRows.map((courtRow, rowIndex) => (
                      <Card key={courtRow.id} className="border">
                        <CardContent className="pt-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-semibold">
                              {t("sections.courtRow")} {rowIndex + 1}
                            </h5>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                removeCourtRow(facility.id, courtRow.id)
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                {t("fields.surfaceType")}{" "}
                                <span className="text-destructive">*</span>
                              </label>
                              <select
                                value={courtRow.surfaceType}
                                onChange={(e) =>
                                  updateCourtRow(
                                    facility.id,
                                    courtRow.id,
                                    "surfaceType",
                                    e.target.value
                                  )
                                }
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                              >
                                <option value="">
                                  {t("fields.selectSurfaceType")}
                                </option>
                                <option value="hard">
                                  {t("surfaceTypes.hard")}
                                </option>
                                <option value="clay">
                                  {t("surfaceTypes.clay")}
                                </option>
                                <option value="grass">
                                  {t("surfaceTypes.grass")}
                                </option>
                                <option value="synthetic">
                                  {t("surfaceTypes.synthetic")}
                                </option>
                                <option value="carpet">
                                  {t("surfaceTypes.carpet")}
                                </option>
                                <option value="asphalt">
                                  {t("surfaceTypes.asphalt")}
                                </option>
                                <option value="concrete">
                                  {t("surfaceTypes.concrete")}
                                </option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                {t("fields.quantity")}{" "}
                                <span className="text-destructive">*</span>
                              </label>
                              <Input
                                type="number"
                                min="1"
                                value={courtRow.quantity}
                                onChange={(e) =>
                                  updateCourtRow(
                                    facility.id,
                                    courtRow.id,
                                    "quantity",
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                {t("fields.sports")}
                              </label>
                              <select
                                multiple
                                value={courtRow.sportIds}
                                onChange={(e) => {
                                  const selected = Array.from(
                                    e.target.selectedOptions,
                                    (option) => option.value
                                  );
                                  updateCourtRow(
                                    facility.id,
                                    courtRow.id,
                                    "sportIds",
                                    selected
                                  );
                                }}
                                className="flex h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                size={3}
                              >
                                {facility.selectedSports.map((sportId) => {
                                  const sport = sports.find(
                                    (s) => s.id === sportId
                                  );
                                  return sport ? (
                                    <option key={sport.id} value={sport.id}>
                                      {sport.name
                                        .split(" ")
                                        .map(
                                          (word) =>
                                            word.charAt(0).toUpperCase() +
                                            word.slice(1).toLowerCase()
                                        )
                                        .join(" ")}
                                    </option>
                                  ) : null;
                                })}
                              </select>
                              <p className="text-xs text-muted-foreground">
                                {t("hints.holdCtrlToSelect")}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                {t("fields.options")}
                              </label>
                              <div className="space-y-2">
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={courtRow.lighting}
                                    onChange={(e) =>
                                      updateCourtRow(
                                        facility.id,
                                        courtRow.id,
                                        "lighting",
                                        e.target.checked
                                      )
                                    }
                                    className="rounded border-input"
                                  />
                                  <span className="text-sm">
                                    {t("fields.lighting")}
                                  </span>
                                </label>
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={courtRow.indoor}
                                    onChange={(e) =>
                                      updateCourtRow(
                                        facility.id,
                                        courtRow.id,
                                        "indoor",
                                        e.target.checked
                                      )
                                    }
                                    className="rounded border-input"
                                  />
                                  <span className="text-sm">
                                    {t("fields.indoor")}
                                  </span>
                                </label>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <div className="flex items-center justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addCourtRow(facility.id);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("actions.addCourtRow")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFacility}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("actions.addFacility")}
              </Button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUpdateMode ? t("actions.updating") : t("actions.creating")}
                </>
              ) : isUpdateMode ? (
                t("actions.update")
              ) : (
                t("actions.create")
              )}
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Success Modal - Only shown in create mode */}
      {!isUpdateMode && (
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="">
            <DialogHeader>
              <DialogTitle>{t("success.title")}</DialogTitle>
              <DialogDescription>{t("success.description")}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push("/admin/organizations");
                }}
                className="w-full sm:w-auto"
              >
                {t("success.backToList")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccessModal(false);
                  // Reset form to create another
                  setOrgData({
                    name: "",
                    nature: "public" as OrganizationNature,
                    email: "",
                    phone: "",
                    address: "",
                    city: "",
                    country: "" as Country,
                    postalCode: "",
                    website: "",
                  });
                  setFacilities([
                    {
                      id: crypto.randomUUID(),
                      images: [],
                      name: "",
                      address: "",
                      city: "",
                      country: "" as Country,
                      postalCode: "",
                      latitude: "",
                      longitude: "",
                      selectedSports: [],
                      contacts: [
                        {
                          id: crypto.randomUUID(),
                          phone: "",
                          email: "",
                          website: "",
                          contactType: "general",
                          isPrimary: true,
                          sportId: null,
                        },
                      ],
                      courtRows: [],
                    },
                  ]);
                  setErrorMessage(null);
                  // Scroll to top
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="w-full sm:w-auto"
              >
                {t("success.createAnother")}
              </Button>
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  if (createdOrganization) {
                    router.push(
                      `/admin/organizations/${createdOrganization.slug}`
                    );
                    router.refresh();
                  }
                }}
                className="w-full sm:w-auto"
              >
                {t("success.viewOrganization")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
