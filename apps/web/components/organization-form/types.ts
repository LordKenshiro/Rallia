import { Enums, Tables } from '@/types';

export type OrganizationNature = Enums<'organization_nature_enum'>;
export type OrganizationType = Enums<'organization_type_enum'> | '';
export type Country = Enums<'country_enum'> | '';
export type FacilityType = Enums<'facility_type_enum'> | '';
export type SurfaceType = Enums<'surface_type_enum'> | '';
export type ContactType = Enums<'facility_contact_type_enum'>;

// Use generated types
export type Sport = Pick<Tables<'sport'>, 'id' | 'name' | 'slug'>;
export type DataProvider = Pick<Tables<'data_provider'>, 'id' | 'name' | 'provider_type'>;

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
  dataProviderId?: string | null;
  isActive?: boolean;
}

// Initial data from database (before form transformation)
export interface InitialFacilityData {
  id: string;
  name: string;
  facility_file?: Array<{
    id: string;
    file_id: string;
    display_order?: number | null;
    is_primary?: boolean | null;
    files?: {
      id: string;
      url: string;
      thumbnail_url: string | null;
    } | null;
  }>;
  facility_contact?: Array<{
    id: string;
    phone: string | null;
    email: string | null;
    website: string | null;
    contact_type: string;
    is_primary: boolean | null;
    sport_id: string | null;
  }>;
  courts?: Array<{
    id: string;
    surface_type: string | null;
    lighting: boolean | null;
    indoor: boolean | null;
    court_sport?: Array<{
      sport_id: string;
    }>;
  }>;
  facility_sport?: Array<{
    sport_id: string;
  }>;
  facility_type?: string | null;
  membership_required?: boolean;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  timezone?: string | null;
  data_provider_id?: string | null;
  external_provider_id?: string | null;
  is_active?: boolean;
}

export interface AdminOrganizationFormProps {
  organizationSlug?: string;
  initialData?: {
    organization: OrganizationData & {
      id: string;
      slug: string;
      postal_code?: string;
      description?: string;
      data_provider_id?: string | null;
      is_active?: boolean;
    };
    facilities: InitialFacilityData[];
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
  description: string;
  timezone: string;
  dataProviderId: string | null;
  externalProviderId: string;
  isActive: boolean;
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
  description: string;
  timezone: string;
  dataProviderId: string | null;
  externalProviderId: string;
  isActive: boolean;
}

export type Facility = CreateFacility | UpdateFacility;
