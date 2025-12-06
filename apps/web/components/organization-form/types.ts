import { Enums, Tables } from '@/types';

export type OrganizationNature = Enums<'organization_nature_enum'>;
export type OrganizationType = Enums<'organization_type_enum'> | '';
export type Country = Enums<'country_enum'> | '';
export type FacilityType = Enums<'facility_type_enum'> | '';
export type SurfaceType = Enums<'surface_type_enum'> | '';
export type ContactType = Enums<'facility_contact_type_enum'>;

// Use generated types
export type Sport = Pick<Tables<'sports'>, 'id' | 'name' | 'slug'>;

// ExistingImage now represents a file from the files table joined via facility_files
export interface ExistingImage {
  id: string; // facility_files.id (junction table id)
  fileId: string; // files.id (actual file id)
  url: string;
  thumbnail_url: string | null;
  display_order: number;
  is_primary: boolean;
}

export interface NewImage {
  file: File;
  preview: string;
  tempId: string;
}

// For create mode: simple File-based images
export interface CreateFacilityImage {
  file: File;
  preview: string;
}

// For update mode: union type
export type UpdateFacilityImage = ExistingImage | NewImage;

export function isExistingImage(image: UpdateFacilityImage): image is ExistingImage {
  return image != null && 'fileId' in image && !('file' in image);
}

export function isNewImage(image: UpdateFacilityImage): image is NewImage {
  return image != null && 'file' in image && 'preview' in image;
}

export interface FacilityContact {
  id: string;
  phone: string;
  email: string;
  website: string;
  contactType: ContactType;
  isPrimary: boolean;
  sportId: string | null;
}

export interface CourtRow {
  id: string;
  surfaceType: SurfaceType | '';
  lighting: boolean;
  indoor: boolean;
  quantity: number;
  sportIds: string[];
}

export interface OrganizationData {
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

export interface AdminOrganizationFormProps {
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
export interface CreateFacility {
  id: string;
  images: CreateFacilityImage[];
  name: string;
  facilityType: FacilityType;
  membershipRequired: boolean;
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
export interface UpdateFacility {
  id: string;
  images: UpdateFacilityImage[];
  name: string;
  facilityType: FacilityType;
  membershipRequired: boolean;
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

export type Facility = CreateFacility | UpdateFacility;
