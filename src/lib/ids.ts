/** Tag/id-safe form of a Cloudinary public id. Used for clip ids and the per-source tag. */
export const cleanId = (publicId: string) => publicId.replace(/[^a-zA-Z0-9_-]/g, "_");
