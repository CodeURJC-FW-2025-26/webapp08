// controllers/platesController.js
const { validationResult } = require("express-validator");
const Plate = require("../models/Plate");
const Ingredient = require("../models/Ingredient");
const path = require("path");
const fs = require("fs");

const ITEMS_PER_PAGE = 6;

const ALLERGEN_OPTIONS = [
  "Gluten",
  "Crustáceos",
  "Huevos",
  "Pescado",
  "Cacahuetes",
  "Soja",
  "Lácteos",
  "Frutos de cáscara",
  "Nueces",
  "Apio",
  "Mostaza",
  "Sésamo",
  "Dióxido de azufre y sulfitos",
  "Altramuces",
  "Moluscos",
  "Aguacate",
];

/* --- Helpers --- */
function handleValidationErrors(req) {
  //Yang part

  //End of Yang part
}

function escapeRegExp(string) {
  if (!string) return "";
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildQueryString(queryObj = {}, opts = {}) {
  const exclude = Array.isArray(opts.exclude) ? opts.exclude : [];
  const pairs = [];
  const q = { ...queryObj };

  if (typeof opts.page !== "undefined") q.page = String(opts.page);

  for (const k of Object.keys(q)) {
    if (exclude.includes(k)) continue;
    if (q[k] === undefined || q[k] === null || String(q[k]).trim() === "")
      continue;
    pairs.push(encodeURIComponent(k) + "=" + encodeURIComponent(q[k]));
  }
  return pairs.join("&");
}

/* --- Controller actions --- */

/**
 * Paginated list of plates with filters (name, type, ingredients)
 */
async function listPlates(req, res) {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));

  // search parameters (come by GET)
  const searchName = (req.query.searchName || "").trim();
  const searchType = (req.query.searchType || "").trim();
  const searchIngredients = (req.query.searchIngredients || "").trim();

  try {
    // Build dynamic filter
    const filter = {};

    if (searchName) {
      filter.title = { $regex: new RegExp(escapeRegExp(searchName), "i") };
    }

    if (
      searchType &&
      searchType.toLowerCase() !== "todos" &&
      searchType !== ""
    ) {
      filter.type = searchType;
    }

    if (
      searchIngredients &&
      searchIngredients.toLowerCase() !== "todos" &&
      searchIngredients !== ""
    ) {
      const ingRegex = new RegExp(escapeRegExp(searchIngredients), "i");
      filter.$or = [
        { allergens: searchIngredients }, // exact allergen match
        { allergens: { $regex: ingRegex } }, // partial match in allergens
        { "ingredients.name": { $regex: ingRegex } }, // match ingredient name
      ];
    }

    // total and pagination
    const total = await Plate.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    if (page > totalPages && total > 0) {
      const baseQS = buildQueryString(req.query, { page: totalPages });
      return res.redirect("/?" + baseQS);
    }

    const skip = (page - 1) * ITEMS_PER_PAGE;

    // Sorting: use "order" if it exists, otherwise title
    const platesRaw = await Plate.find(filter)
      .sort({ order: 1, title: 1 })
      .skip(skip)
      .limit(ITEMS_PER_PAGE)
      .lean();

    // map for template
    const plates = platesRaw.map((p) => {
      const image =
        Array.isArray(p.images) && p.images.length > 0
          ? p.images[0]
          : "/images/default-plate.jpg";
      const allergensString =
        Array.isArray(p.allergens) && p.allergens.length > 0
          ? p.allergens.join(", ")
          : "---";
      const createdAtFormatted = p.createdAt
        ? new Date(p.createdAt).toISOString().slice(0, 10)
        : "";
      return { ...p, image, allergensString, createdAtFormatted };
    });

    // build pages array
    const pages = [];
    for (let i = 1; i <= totalPages; i++)
      pages.push({ num: i, isCurrent: i === page });

    // build query string without page for pagination links
    const queryString = buildQueryString(req.query, { exclude: ["page"] });
    const qsPrefix = queryString ? "&" + queryString : "";

    // --- flags for "selected" in category filters
    const isTypeEntrante = searchType === "Entrante";
    const isTypePrincipal = searchType === "Principal";
    const isTypeSushi = searchType === "Sushi";
    const isTypePostres = searchType === "Postres";
    const isTypeBebida = searchType === "Bebida";

    // --- flags for ingredient/allergen predefined filters
    const isIngArroz = searchIngredients === "Arroz";
    const isIngPollo = searchIngredients === "Pollo";
    const isIngPescado = searchIngredients === "Pescado";
    const isIngVerduras = searchIngredients === "Verduras";

    res.render("main", {
      plates,
      currentPage: page,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      prevPage: Math.max(1, page - 1),
      nextPage: Math.min(totalPages, page + 1),
      pages,
      // filters (to keep input values)
      searchName,
      searchType,
      searchIngredients,
      queryString: qsPrefix,
      // flags for selects (used in template as {{#isTypeEntrante}}selected{{/isTypeEntrante}})
      isTypeEntrante,
      isTypePrincipal,
      isTypeSushi,
      isTypePostres,
      isTypeBebida,
      isIngArroz,
      isIngPollo,
      isIngPescado,
      isIngVerduras,
    });
  } catch (err) {
    console.error("Error listPlates:", err);
    res.status(500).render("main", { errorMessage: "Error al listar platos" });
  }
}

/**
 * Show new plate form
 */
function showNewForm(req, res) {
  res.render("new", {
    plate: {},
    errors: [],
    allergenOptions: ALLERGEN_OPTIONS,
  });
}

/**
 * Create plate (process POST /plates)
 */
async function createPlate(req, res) {
  // validations with express-validator
  const validation = handleValidationErrors(req);
  //Iñigo part

  //End of Iñigo part

  // UNIQUE TITLE validation (server-side)
  try {
    //Yang part

    //End of Yang part
  } catch (errFind) {
    console.error("Error checking existing title:", errFind);
    const title = encodeURIComponent("Error servidor");
    const message = encodeURIComponent(
      "Error al validar título en base de datos."
    );
    const returnUrl = encodeURIComponent("/plates/new");
    return res.redirect(
      `/error?title=${title}&message=${message}&returnUrl=${returnUrl}`
    );
  }

  try {
    const { title, type, description, price, duration } = req.body;
    const allergens = Array.isArray(req.body.allergens)
      ? req.body.allergens
      : req.body.allergens
      ? [req.body.allergens]
      : [];
    const images = [];
    if (req.files && req.files.length) {
      req.files.forEach((f) => images.push("/uploads/" + f.filename));
    }

    //Yang part

    //End of Yang part

    await plate.save();
    // redirect to intermediate confirmation page
    return res.redirect(`/plates/${plate._id}/created`);
  } catch (err) {
    console.error("Error createPlate:", err);
    // handle duplicate title (rare case if previous check fails)
    //Iñigo Part

    //End of Iñigo part
    const title = encodeURIComponent("Error servidor");
    const message = encodeURIComponent(
      "Error al crear plato. Intenta más tarde."
    );
    const returnUrl = encodeURIComponent("/plates/new");
    return res.redirect(
      `/error?title=${title}&message=${message}&returnUrl=${returnUrl}`
    );
  }
}

/**
 * Show plate detail
 */
// Replace the current showPlate function with this:
async function showPlate(req, res) {
  try {
    // Populate ingredients (if stored as refs) so the view receives objects with name, description, image...
    const plate = await Plate.findById(req.params.id)
      .populate("ingredients")
      .lean();
    if (!plate)
      return res.status(404).render("error", {
        title: "No encontrado",
        message: "Plato no encontrado",
        returnUrl: "/",
      });

    plate.createdAtFormatted = plate.createdAt
      ? new Date(plate.createdAt).toISOString().slice(0, 10)
      : "";

    // Provide plateId to the view (used for ingredient links)
    return res.render("detail", {
      plate,
      //Miguel Angel art
    plateId: plate._id.toString(),
      //End of Miguel Angel part
    });
  } catch (err) {
    console.error("Error showPlate:", err);
    return res
      .status(500)
      .render("error", { title: "Error", message: "Error al recuperar plato" });
  }
}

/**
 * Intermediate confirmation page after creating a plate
 */
async function showCreated(req, res) {
  try {
    const plate = await Plate.findById(req.params.id).lean();
    if (!plate) {
      return res.status(404).render("error", {
        title: "No encontrado",
        message: "Plato no encontrado",
        showHome: true,
      });
    }

    // prepare main image
    const image =
      Array.isArray(plate.images) && plate.images.length > 0
        ? plate.images[0]
        : "/images/default-plate.jpg";

    res.render("confirmation", {
      title: "Plato creado",
      message: "El plato se ha creado correctamente.",
      plateId: plate._id,
      plateTitle: plate.title,
      plateImage: image,
    });
  } catch (err) {
    console.error("Error showCreated:", err);
    res.status(500).render("error", {
      title: "Error",
      message: "Error al mostrar confirmación",
    });
  }
}

/**
 * Show edit form
 */
async function showEditForm(req, res) {
  try {
    const plate = await Plate.findById(req.params.id).lean();
    if (!plate)
      return res.status(404).render("errorcreateplate", {
        title: "No encontrado",
        message: "Plato no encontrado",
        showHome: true,
      });

    res.render("new", {
      plate,
      editing: true,
      allergenOptions: ALLERGEN_OPTIONS,
    });
  } catch (err) {
    console.error("Error showEditForm:", err);
    res
      .status(500)
      .render("error", { title: "Error", message: "Error al recuperar plato" });
  }
}

/**
 * Update plate (PUT)
 */
async function updatePlate(req, res) {
  const validation = handleValidationErrors(req);
  //Iñigo Part

  //End of Iñigo part

  try {
    const plate = await Plate.findById(req.params.id);
    if (!plate)
      return res.status(404).render("error", {
        title: "No encontrado",
        message: "Plato no encontrado",
        showHome: true,
      });

    plate.title = req.body.title;
    plate.type = req.body.type;
    plate.description = req.body.description;
    plate.price = parseFloat(req.body.price || 0);
    plate.duration = parseInt(req.body.duration || 0, 10);
    plate.allergens = Array.isArray(req.body.allergens)
      ? req.body.allergens
      : req.body.allergens
      ? [req.body.allergens]
      : [];

    if (req.files && req.files.length) {
      req.files.forEach((f) => plate.images.push("/uploads/" + f.filename));
    }

    await plate.save();

    // Iñigo part – intermediate confirmation page after updating

    // ── end Iñigo part ──
  } catch (err) {
    console.error("Error updatePlate:", err);
    // Iñigo part – duplicate title error on edit

    // ── end Iñigo part ──

    res.status(500).render("errorplate", {
      message: "Error inesperado al actualizar el plato.",
      errors: [],
      backLink: `/plates/${req.params.id}/edit`,
    });
  }
}

/**
 * Delete plate
 */
async function deletePlate(req, res) {
  try {
    const plate = await Plate.findByIdAndDelete(req.params.id);
    if (!plate)
      return res.status(404).render("errorplate", {
        title: "No encontrado",
        message: "Plato no encontrado",
        showHome: true,
      });

    // delete physical image files
    if (plate.images && plate.images.length) {
      plate.images.forEach((imgPath) => {
        try {
          const relative = imgPath.replace(/^\//, "");
          const filePath = path.join(process.cwd(), relative);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {
          // do nothing if deletion fails
        }
      });
    }

    // Iñigo part – intermediate confirmation page after deletion

    // ── end Iñigo part ──
  } catch (err) {
    console.error("Error deletePlate:", err);
    res.status(500).render("errorplate", {
      message: "Error inesperado al borrar el plato.",
      errors: [],
      backLink: "/",
    });
  }
}

/* Ingredients: add, delete, edit */
async function addIngredient(req, res) {
  //Miguel Angel part
const backUrl = `/plates/${req.params.id}`;
  try {
    const plate = await Plate.findById(req.params.id);
    if (!plate) {
      const errorMsg = 'Plato no encontrado.';
      return res.redirect(`/createerroringredient?message=${encodeURIComponent(errorMsg)}&redirectTo=/`);
    }

    const { name, description } = req.body;
    if (!name || name.trim() === '' || !description || description.trim() === '') {
      const errorMsg = 'Faltan campos por completar. Nombre y descripción son obligatorios.';
      return res.redirect(`/createerroringredient?message=${encodeURIComponent(errorMsg)}&redirectTo=${encodeURIComponent(backUrl)}`);
    }
  //End of Miguel Angel part
    if (!req.file) {
      const errorMsg = "La imagen del ingrediente es obligatoria.";
      return res.redirect(
        `/createerroringredient?message=${encodeURIComponent(
          errorMsg
        )}&redirectTo=${encodeURIComponent(backUrl)}`
      );
    }

    // check duplicate ingredient in plate (search by name)
    // first populate current ingredients to compare names
    //Miguel Angel part

    //End of Miguel Angel part
    const imagePath =
      req.file && req.file.filename ? "/uploads/" + req.file.filename : "";
    //Miguel Angel part

    //End of Miguel Angel part
  
//Miguel Angel part

//End of Miguel Angel part

//Miguel Angel part

//End of Miguel Angel part

// Replace current editIngredientForm function with this:
async function editIngredientForm(req, res) {
  try {
    console.log("[INFO] editIngredientForm params:", req.params); // server log

    const plateId = req.params.plateId;
    const ingId = req.params.ingId;

    // 1) load plate without populate (just to check membership)
    const plate = await Plate.findById(plateId).lean();
    if (!plate) {
      return res.status(404).render("error", {
        title: "No encontrado",
        message: "Plato no encontrado",
        returnUrl: "/",
      });
    }

    // 2) check ingredient reference belongs to plate
    const belongs = (plate.ingredients || [])
      .map((i) => String(i))
      .includes(String(ingId));
    if (!belongs) {
      return res.status(404).render("error", {
        title: "Ingrediente no pertenece",
        message: "El ingrediente no pertenece a este plato.",
        returnUrl: `/plates/${plateId}`,
      });
    }
    
    // 3) load actual Ingredient document
    //Miguel Angel part

//End of Miguel Angel part
/* --- Export all functions --- */
module.exports = {
  listPlates,
  showNewForm,
  createPlate,
  showPlate,
  showCreated,
  showEditForm,
  updatePlate,
  deletePlate,
  addIngredient,
  deleteIngredient,
  updateIngredient,
  editIngredientForm,
  showConfirmationPageCreate,
  showConfirmationPageEdit,
  showConfirmationPageDelete,
  showErrorPageCreate,
  showErrorPageEdit,
};
