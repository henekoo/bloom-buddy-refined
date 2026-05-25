import { supabase } from "@/integrations/supabase/client";

const MAX_SIZE = 10 * 1024 * 1024;

export type UploadProgress = (done: number, total: number) => void;

export async function uploadObservationImages(
  userId: string,
  files: File[],
  onProgress?: UploadProgress,
): Promise<string[]> {
  const urls: string[] = [];
  let done = 0;
  onProgress?.(0, files.length);
  for (const file of files) {
    if (file.size > MAX_SIZE) {
      throw new Error(`${file.name} on liian iso (max 10 MB)`);
    }
    if (file.type && !file.type.startsWith("image/")) {
      throw new Error(`${file.name}: ei tuettu tiedostotyyppi`);
    }
    const extFromName = file.name.split(".").pop()?.toLowerCase();
    const extFromType = file.type?.split("/").pop()?.toLowerCase();
    const ext = (extFromName && extFromName.length <= 5 ? extFromName : extFromType) || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("observations").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });
    if (error) throw new Error(`Kuvan lataus epäonnistui: ${error.message}`);
    const { data } = supabase.storage.from("observations").getPublicUrl(path);
    urls.push(data.publicUrl);
    done += 1;
    onProgress?.(done, files.length);
  }
  return urls;
}

export async function uploadProjectCover(userId: string, file: File): Promise<string> {
  if (file.size > MAX_SIZE) throw new Error(`${file.name} on liian iso (max 10 MB)`);
  if (file.type && !file.type.startsWith("image/")) throw new Error("Ei tuettu tiedostotyyppi");
  const extFromName = file.name.split(".").pop()?.toLowerCase();
  const extFromType = file.type?.split("/").pop()?.toLowerCase();
  const ext = (extFromName && extFromName.length <= 5 ? extFromName : extFromType) || "jpg";
  const path = `${userId}/covers/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("observations").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw new Error(`Kansikuvan lataus epäonnistui: ${error.message}`);
  return supabase.storage.from("observations").getPublicUrl(path).data.publicUrl;
}
