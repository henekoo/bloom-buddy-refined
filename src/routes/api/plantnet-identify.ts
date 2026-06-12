import { createFileRoute } from "@tanstack/react-router";

const PLANTNET_API_KEY = "2b10zkMSHaTsFO4U2DeBcETOe";
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const VALID_ORGANS = new Set(["leaf", "flower", "fruit", "bark", "auto"]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/plantnet-identify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOrigin(request)) {
          return json({ message: "Forbidden" }, 403);
        }

        const formData = await request.formData().catch(() => null);
        if (!formData) {
          return json({ message: "Kuvaa ei voitu lukea." }, 400);
        }

        const images = formData.getAll("images").filter((value): value is File => value instanceof File);
        if (!images.length) {
          return json({ message: "Lisää ensin kuva." }, 400);
        }
        if (images.length > 5) {
          return json({ message: "Lähetä enintään 5 kuvaa kerralla." }, 400);
        }

        const totalSize = images.reduce((sum, image) => sum + image.size, 0);
        if (totalSize > MAX_TOTAL_BYTES) {
          return json({ message: "Kuvat ovat liian suuria tunnistukseen." }, 400);
        }

        const forwarded = new FormData();
        for (const image of images) {
          if (!["image/jpeg", "image/png"].includes(image.type)) {
            return json({ message: "PlantNet hyväksyy vain JPG- ja PNG-kuvat." }, 400);
          }
          forwarded.append("images", image, image.name || "plantnet-image.jpg");
        }

        const organs = formData.getAll("organs").map((value) => String(value));
        images.forEach((_, index) => {
          const organ = organs[index];
          forwarded.append("organs", VALID_ORGANS.has(organ) ? organ : "auto");
        });

        const url = new URL("https://my-api.plantnet.org/v2/identify/all");
        url.searchParams.set("api-key", PLANTNET_API_KEY);
        url.searchParams.set("lang", "fi");
        url.searchParams.set("nb-results", "5");
        url.searchParams.set("no-reject", "true");

        const plantnetResponse = await fetch(url, { method: "POST", body: forwarded });
        const data = await plantnetResponse.json().catch(() => null);

        if (!plantnetResponse.ok) {
          return json(
            { message: data?.message || "PlantNet-tunnistus epäonnistui." },
            plantnetResponse.status,
          );
        }

        return json(data ?? { results: [] });
      },
    },
  },
});