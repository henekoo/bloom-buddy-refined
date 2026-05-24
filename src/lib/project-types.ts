export const PROJECT_TYPES = [
  { value: "house_yard", label: "Talon piha", emoji: "🏡" },
  { value: "cabin_yard", label: "Mökin piha", emoji: "🛖" },
  { value: "forest", label: "Metsäpalsta", emoji: "🌲" },
  { value: "arboretum", label: "Arboretum", emoji: "🌳" },
  { value: "greenhouse", label: "Kasvihuone", emoji: "🪴" },
  { value: "game_field", label: "Riistapelto", emoji: "🌾" },
  { value: "perennial_bed", label: "Perennapenkki", emoji: "🌸" },
  { value: "nursery", label: "Taimitarha", emoji: "🌱" },
  { value: "other", label: "Muu", emoji: "📍" },
] as const;

export type ProjectTypeValue = (typeof PROJECT_TYPES)[number]["value"];

export function projectTypeMeta(value: string | null | undefined) {
  return PROJECT_TYPES.find((t) => t.value === value) ?? PROJECT_TYPES[PROJECT_TYPES.length - 1];
}
