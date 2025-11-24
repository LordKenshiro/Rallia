import { isAdmin } from "@/lib/supabase/check-admin";
import { createClient } from "@/lib/supabase/server";
import { Enums, Tables } from "@/types";
import { NextRequest, NextResponse } from "next/server";

type OrganizationNature = Enums<"organization_nature_enum">;
type OrganizationType = Enums<"organization_type_enum"> | null;
type Country = Enums<"country_enum"> | null;
type ContactType = Enums<"facility_contact_type_enum">;
type SurfaceType = Enums<"surface_type_enum">;
type AvailabilityStatus = Enums<"availability_enum">;

// Contact data structure (form format with camelCase)
type FacilityContactData = {
  id?: string; // Existing contact ID if updating
  phone: string;
  email: string;
  website: string;
  contactType: ContactType;
  isPrimary: boolean;
  sportId: string | null;
};

// Court row data structure (represents a group of courts)
type CourtRowData = {
  id?: string; // Existing court row ID (for tracking)
  surfaceType: SurfaceType;
  lighting: boolean;
  indoor: boolean;
  quantity: number;
  sportIds: string[];
};

interface FacilityData {
  id?: string; // Existing facility ID if updating
  name: string;
  address: string;
  city: string;
  country: Country;
  postalCode: string;
  latitude: string;
  longitude: string;
  selectedSports: string[];
  images?: any[]; // Image metadata (files sent separately or existing images)
  imageCount?: number; // Number of new images to expect
  existingImageIds?: string[]; // IDs of images to keep
  contacts: FacilityContactData[];
  courtRows: CourtRowData[];
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureUniqueSlug(
  supabase: any,
  baseSlug: string,
  table: string,
  excludeId?: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    let query = supabase.from(table).select("id").eq("slug", slug);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data: existing } = await query.single();

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

async function uploadFacilityImages(
  supabase: any,
  facilityId: string,
  facilityIndex: number,
  imageCount: number,
  formData: FormData
): Promise<any[]> {
  if (imageCount === 0) return [];

  const imageEntries = [];
  const maxSize = 10 * 1024 * 1024; // 10MB
  const UPLOAD_TIMEOUT = 60000; // 60 seconds

  for (let imageIndex = 0; imageIndex < imageCount; imageIndex++) {
    const imageKey = `facility_${facilityIndex}_image_${imageIndex}`;
    const imageFile = formData.get(imageKey) as File;

    if (!imageFile) continue;

    // Validate file type
    if (!imageFile.type.startsWith("image/")) {
      throw new Error(`File ${imageFile.name} is not an image`);
    }

    // Validate file size
    if (imageFile.size > maxSize) {
      throw new Error(`Image ${imageFile.name} exceeds maximum size of 10MB`);
    }

    // Generate unique storage key
    const fileExt = imageFile.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const fileName = `${facilityId}/${timestamp}-${randomId}.${fileExt}`;
    const storageKey = `facility-images/${fileName}`;

    // Convert File to Blob
    let fileData: Blob;
    try {
      const arrayBuffer = await imageFile.arrayBuffer();
      fileData = new Blob([arrayBuffer], { type: imageFile.type });
    } catch {
      fileData = imageFile;
    }

    // Upload with timeout
    const uploadPromise = supabase.storage
      .from("facility-images")
      .upload(storageKey, fileData, {
        contentType: imageFile.type,
        upsert: false,
      });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Upload timeout after 60 seconds")),
        UPLOAD_TIMEOUT
      )
    );

    try {
      const result = await Promise.race([uploadPromise, timeoutPromise]);
      const uploadError = (result as any).error;

      if (uploadError) {
        if (
          uploadError.message?.includes("Bucket not found") ||
          uploadError.message?.includes("not found")
        ) {
          throw new Error(
            'Storage bucket "facility-images" not found. Please create it in Supabase Storage.'
          );
        }
        if (
          uploadError.message?.includes("permission") ||
          uploadError.message?.includes("unauthorized") ||
          uploadError.message?.includes("forbidden") ||
          uploadError.statusCode === 403 ||
          uploadError.statusCode === 401
        ) {
          throw new Error(
            `Storage permission denied. Please check bucket policies and RLS settings for "facility-images" bucket. Error: ${
              uploadError.message || JSON.stringify(uploadError)
            }`
          );
        }
        throw new Error(
          `Failed to upload image ${imageFile.name}: ${
            uploadError.message || JSON.stringify(uploadError)
          }`
        );
      }
    } catch (error: any) {
      if (error.message?.includes("timeout")) {
        throw new Error(
          `Upload timeout: The image upload took longer than 60 seconds. File size: ${(
            imageFile.size /
            1024 /
            1024
          ).toFixed(2)}MB`
        );
      }
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("facility-images")
      .getPublicUrl(storageKey);

    imageEntries.push({
      facility_id: facilityId,
      storage_key: storageKey,
      url: urlData.publicUrl,
      file_size: imageFile.size,
      mime_type: imageFile.type,
      display_order: imageIndex,
      is_primary: imageIndex === 0,
    });
  }

  // Insert facility_images records
  if (imageEntries.length > 0) {
    const { error: imagesError } = await supabase
      .from("facility_images")
      .insert(imageEntries);

    if (imagesError) {
      throw new Error(`Failed to create image records: ${imagesError.message}`);
    }
  }

  return imageEntries;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(user.id);
    if (!userIsAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get existing organization
    const { data: existingOrg, error: orgFetchError } = await supabase
      .from("organizations")
      .select("id, slug, name")
      .eq("slug", slug)
      .single();

    if (orgFetchError || !existingOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const organizationJson = formData.get("organization");
    const facilitiesJson = formData.get("facilities");

    if (!organizationJson || !facilitiesJson) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      );
    }

    const organization = JSON.parse(organizationJson as string);
    const facilities: FacilityData[] = JSON.parse(facilitiesJson as string);

    // Validate organization
    if (!organization.name || !organization.email || !organization.nature) {
      return NextResponse.json(
        { error: "Missing required organization fields" },
        { status: 400 }
      );
    }

    // Update organization slug if name changed
    let orgSlug = existingOrg.slug;
    if (organization.name !== existingOrg.name) {
      orgSlug = await ensureUniqueSlug(
        supabase,
        generateSlug(organization.name),
        "organizations",
        existingOrg.id
      );
    }

    // Update organization
    const { data: updatedOrg, error: orgError } = await supabase
      .from("organizations")
      .update({
        name: organization.name,
        nature: organization.nature as OrganizationNature,
        email: organization.email,
        phone: organization.phone || null,
        slug: orgSlug,
        address: organization.address || null,
        city: organization.city || null,
        country: organization.country as Country,
        postal_code: organization.postalCode || null,
        type: (organization.type as OrganizationType) || null,
        description: organization.description || null,
        website: organization.website || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingOrg.id)
      .select()
      .single();

    if (orgError) {
      console.error("[Admin Org Update] Organization update error:", orgError);
      return NextResponse.json(
        { error: orgError.message || "Failed to update organization" },
        { status: 500 }
      );
    }

    // Get existing facilities
    const { data: existingFacilities } = await supabase
      .from("facilities")
      .select("id")
      .eq("organization_id", existingOrg.id);

    const existingFacilityIds = new Set(
      existingFacilities?.map((f) => f.id) || []
    );
    const submittedFacilityIds = new Set(
      facilities.filter((f) => f.id).map((f) => f.id!)
    );

    // Delete facilities that are no longer in the submission
    const facilitiesToDelete = Array.from(existingFacilityIds).filter(
      (id) => !submittedFacilityIds.has(id)
    );

    for (const facilityId of facilitiesToDelete) {
      // Delete related data first
      const { data: courts } = await supabase
        .from("courts")
        .select("id")
        .eq("facility_id", facilityId);

      if (courts && courts.length > 0) {
        const courtIds = courts.map((c: any) => c.id);
        await supabase.from("court_sports").delete().in("court_id", courtIds);
        await supabase.from("courts").delete().in("id", courtIds);
      }

      await supabase
        .from("facility_sports")
        .delete()
        .eq("facility_id", facilityId);
      await supabase
        .from("facility_contacts")
        .delete()
        .eq("facility_id", facilityId);

      // Delete images
      const { data: images } = await supabase
        .from("facility_images")
        .select("storage_key")
        .eq("facility_id", facilityId);

      if (images && images.length > 0) {
        const storageKeys = images.map((img: any) => img.storage_key);
        await supabase.storage.from("facility-images").remove(storageKeys);
        await supabase
          .from("facility_images")
          .delete()
          .eq("facility_id", facilityId);
      }

      await supabase.from("facilities").delete().eq("id", facilityId);
    }

    // Process each facility (create or update)
    for (
      let facilityIndex = 0;
      facilityIndex < facilities.length;
      facilityIndex++
    ) {
      const facilityData = facilities[facilityIndex];

      // Validate facility
      if (!facilityData.name || facilityData.selectedSports.length === 0) {
        continue; // Skip invalid facilities
      }

      // Prepare location if lat/long provided
      let location = null;
      if (facilityData.latitude && facilityData.longitude) {
        const lat = parseFloat(facilityData.latitude);
        const lon = parseFloat(facilityData.longitude);
        if (!isNaN(lat) && !isNaN(lon)) {
          location = `POINT(${lon} ${lat})`;
        }
      }

      let facility: Tables<"facilities">;
      if (facilityData.id) {
        // Update existing facility
        const facilitySlug = await ensureUniqueSlug(
          supabase,
          generateSlug(facilityData.name),
          "facilities",
          facilityData.id
        );

        const { data: updatedFacility, error: facilityError } = await supabase
          .from("facilities")
          .update({
            name: facilityData.name,
            slug: facilitySlug,
            address: facilityData.address || null,
            city: facilityData.city || null,
            country: facilityData.country,
            postal_code: facilityData.postalCode || null,
            location: location,
            latitude: facilityData.latitude
              ? parseFloat(facilityData.latitude)
              : null,
            longitude: facilityData.longitude
              ? parseFloat(facilityData.longitude)
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", facilityData.id)
          .select()
          .single();

        if (facilityError || !updatedFacility) {
          throw new Error(
            `Failed to update facility: ${
              facilityError?.message || "Unknown error"
            }`
          );
        }
        facility = updatedFacility;

        // Delete images not in existingImageIds
        if (facilityData.existingImageIds) {
          const { data: allImages } = await supabase
            .from("facility_images")
            .select("id, storage_key")
            .eq("facility_id", facility.id);

          const imagesToDelete =
            allImages?.filter(
              (img) => !facilityData.existingImageIds!.includes(img.id)
            ) || [];

          if (imagesToDelete.length > 0) {
            const storageKeys = imagesToDelete.map((img) => img.storage_key);
            await supabase.storage.from("facility-images").remove(storageKeys);
            await supabase
              .from("facility_images")
              .delete()
              .in(
                "id",
                imagesToDelete.map((img) => img.id)
              );
          }
        } else {
          // Delete all images if no existingImageIds provided
          const { data: allImages } = await supabase
            .from("facility_images")
            .select("id, storage_key")
            .eq("facility_id", facility.id);

          if (allImages && allImages.length > 0) {
            const storageKeys = allImages.map((img) => img.storage_key);
            await supabase.storage.from("facility-images").remove(storageKeys);
            await supabase
              .from("facility_images")
              .delete()
              .eq("facility_id", facility.id);
          }
        }

        // Delete and recreate facility_sports
        await supabase
          .from("facility_sports")
          .delete()
          .eq("facility_id", facility.id);
        if (facilityData.selectedSports.length > 0) {
          const facilitySports = facilityData.selectedSports.map((sportId) => ({
            facility_id: facility.id,
            sport_id: sportId,
          }));
          await supabase.from("facility_sports").insert(facilitySports);
        }

        // Update contacts
        const { data: existingContacts } = await supabase
          .from("facility_contacts")
          .select("id")
          .eq("facility_id", facility.id);

        const existingContactIds = new Set(
          existingContacts?.map((c) => c.id) || []
        );
        const submittedContactIds = new Set(
          facilityData.contacts.filter((c) => c.id).map((c) => c.id!)
        );

        // Delete removed contacts
        const contactsToDelete = Array.from(existingContactIds).filter(
          (id) => !submittedContactIds.has(id)
        );
        if (contactsToDelete.length > 0) {
          await supabase
            .from("facility_contacts")
            .delete()
            .in("id", contactsToDelete);
        }

        // Update or insert contacts
        for (const contact of facilityData.contacts) {
          const contactData = {
            facility_id: facility.id,
            phone: contact.phone || null,
            email: contact.email || null,
            website: contact.website || null,
            contact_type: contact.contactType as ContactType,
            is_primary: contact.isPrimary,
            sport_id: contact.sportId || null,
          };

          if (contact.id) {
            await supabase
              .from("facility_contacts")
              .update(contactData)
              .eq("id", contact.id);
          } else {
            await supabase.from("facility_contacts").insert(contactData);
          }
        }

        // Delete all courts and recreate
        const { data: existingCourts } = await supabase
          .from("courts")
          .select("id")
          .eq("facility_id", facility.id);

        if (existingCourts && existingCourts.length > 0) {
          const courtIds = existingCourts.map((c) => c.id);
          await supabase.from("court_sports").delete().in("court_id", courtIds);
          await supabase.from("courts").delete().in("id", courtIds);
        }
      } else {
        // Create new facility
        const facilitySlug = await ensureUniqueSlug(
          supabase,
          generateSlug(facilityData.name),
          "facilities"
        );

        const { data: newFacility, error: facilityError } = await supabase
          .from("facilities")
          .insert({
            organization_id: existingOrg.id,
            name: facilityData.name,
            slug: facilitySlug,
            address: facilityData.address || null,
            city: facilityData.city || null,
            country: facilityData.country,
            postal_code: facilityData.postalCode || null,
            location: location,
            latitude: facilityData.latitude
              ? parseFloat(facilityData.latitude)
              : null,
            longitude: facilityData.longitude
              ? parseFloat(facilityData.longitude)
              : null,
          })
          .select()
          .single();

        if (facilityError || !newFacility) {
          throw new Error(
            `Failed to create facility: ${
              facilityError?.message || "Unknown error"
            }`
          );
        }
        facility = newFacility;

        // Create facility_sports links
        if (facilityData.selectedSports.length > 0) {
          const facilitySports = facilityData.selectedSports.map((sportId) => ({
            facility_id: facility.id,
            sport_id: sportId,
          }));
          await supabase.from("facility_sports").insert(facilitySports);
        }

        // Create facility contacts
        if (facilityData.contacts.length > 0) {
          const contacts = facilityData.contacts.map((contact) => ({
            facility_id: facility.id,
            phone: contact.phone || null,
            email: contact.email || null,
            website: contact.website || null,
            contact_type: contact.contactType,
            is_primary: contact.isPrimary,
            sport_id: contact.sportId || null,
          }));
          await supabase.from("facility_contacts").insert(contacts);
        }
      }

      // Upload new images
      const imageCount = facilityData.imageCount || 0;
      if (imageCount > 0) {
        await uploadFacilityImages(
          supabase,
          facility.id,
          facilityIndex,
          imageCount,
          formData
        );
      }

      // Create courts from court rows
      for (const courtRow of facilityData.courtRows) {
        if (
          !courtRow.surfaceType ||
          courtRow.quantity < 1 ||
          courtRow.sportIds.length === 0
        ) {
          continue;
        }

        const courts = [];
        for (let i = 0; i < courtRow.quantity; i++) {
          courts.push({
            facility_id: facility.id,
            surface_type: courtRow.surfaceType as SurfaceType,
            lighting: courtRow.lighting,
            indoor: courtRow.indoor,
            lines_marked_for_multiple_sports: courtRow.sportIds.length > 1,
            availability_status: "available" as AvailabilityStatus,
            is_active: true,
          });
        }

        if (courts.length > 0) {
          const { data: createdCourts, error: courtsError } = await supabase
            .from("courts")
            .insert(courts)
            .select("id");

          if (courtsError) {
            throw new Error(`Failed to create courts: ${courtsError.message}`);
          }

          // Create court_sports junction table records
          if (createdCourts && createdCourts.length > 0) {
            const courtSports = [];
            for (const court of createdCourts) {
              for (const sportId of courtRow.sportIds) {
                courtSports.push({
                  court_id: court.id,
                  sport_id: sportId,
                });
              }
            }

            if (courtSports.length > 0) {
              const { error: courtSportsError } = await supabase
                .from("court_sports")
                .insert(courtSports);

              if (courtSportsError) {
                throw new Error(
                  `Failed to link court sports: ${courtSportsError.message}`
                );
              }
            }
          }
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        organization: updatedOrg,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Org Update] Unexpected error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while updating the organization",
      },
      { status: 500 }
    );
  }
}
