// public/js/infinite-scroll.js
document.addEventListener("DOMContentLoaded", () => {
  const paginationNav = document.getElementById("paginationNav");
  if (paginationNav) {
    // Hide traditional pagination
    paginationNav.style.display = "none";
  }

  const container = document.getElementById("platesContainer");
  if (!container) return;

  let page = 1;
  let loading = false;
  let hasMore = true;

  // Generates the same card as in main.mustache
  function renderPlateCard(p) {
    const image =
      p.images && p.images.length > 0
        ? p.images[0]
        : "/images/default-plate.jpg";

    const allergens =
      p.allergens && p.allergens.length > 0 ? p.allergens.join(", ") : "---";

    const durationText = p.duration ? `${p.duration} min` : "---";

    return `
      <div class="col-12 col-md-6 col-lg-4 mb-4">
        <a href="/plates/${p._id}" class="text-decoration-none">
          <div class="plate-card">
            <img src="${image}" alt="${p.title}" />
            <div class="plate-card-body">
              <div class="plate-type">${p.type}</div>
              <h5 class="plate-title">${p.title}</h5>
              <div class="plate-price">${p.price} €</div>
              <p class="plate-description">${p.description || ""}</p>
              <div class="plate-duration">Tiempo de preparación: ${durationText}</div>
              <div class="plate-allergen">Alérgenos: ${allergens}</div>
            </div>
          </div>
        </a>
      </div>
    `;
  }

  async function loadNext() {
    if (loading || !hasMore) return;
    loading = true;
    page++;

    try {
      const qs = new URLSearchParams(window.location.search);
      qs.set("page", page);

      const resp = await fetch(`/api/plates?${qs.toString()}`);
      const data = await resp.json();

      if (!data || !Array.isArray(data.plates) || data.plates.length === 0) {
        hasMore = false;
        return;
      }

      // Add new cards to the container
      data.plates.forEach((p) => {
        container.insertAdjacentHTML("beforeend", renderPlateCard(p));
      });

      hasMore = !!data.hasMore;
    } catch (err) {
      console.error("Error loading next page", err);
    } finally {
      loading = false;
    }
  }

  // Scroll trigger
  window.addEventListener("scroll", () => {
    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 600
    ) {
      loadNext();
    }
  });
});
