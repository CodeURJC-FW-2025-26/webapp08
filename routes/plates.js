const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const multer = require("multer");
const path = require("path");
const platesController = require("../controllers/platesController");

const UPLOAD_PATH = process.env.UPLOAD_PATH || "uploads";

// multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(process.cwd(), UPLOAD_PATH)),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});
const upload = multer({ storage });

// validators for creating/editing a plate
const plateValidators = [
  //Yang part

  //End of Yang part
  // ---------- custom validator to require image(s) ----------
  // Note: multer must run BEFORE in the chain (upload.array) so req.files exists.
  body("plateImage").custom((value, { req }) => {
    // If we are in edit mode and you want to allow keeping the old image, adjust here:
    const editing =
      req.query._editing === "1" || req.body._editing === "1" || false;
    if (editing) return true; // do not require a new image during editing if using this convention

    // for creation: require at least one uploaded file (multer uses req.files when it's an array)
    if (!req.files || req.files.length === 0) {
      throw new Error("Debes subir al menos una imagen para el plato.");
    }
    return true;
  }),
];

// ROUTES
// main list with query params (search / pagination)
router.get("/", platesController.listPlates);

// new plate form
router.get("/plates/new", platesController.showNewForm);

// create (POST)
router.post(
  "/plates",
  upload.array("plateImage", 5),
  plateValidators,
  platesController.createPlate
);

router.post(
  "/plates/:id/ingredients",
  upload.single("ingredientImage"),
  platesController.addIngredient
);

// detail route
router.get("/plates/:id", platesController.showPlate);

// intermediate confirmation (route that redirects after creation)
router.get("/plates/:id/created", platesController.showCreated);

// edit form
router.get("/plates/:id/edit", platesController.showEditForm);

// update (PUT)
router.put(
  "/plates/:id",
  upload.array("plateImage", 5),
  plateValidators,
  platesController.updatePlate
);

// delete plate
router.delete("/plates/:id", platesController.deletePlate);

//Miguel Angel part
// ingredients: add, delete, edit
router.post(
  "/plates/:id/ingredients",
  upload.single("ingredientImage"),
  platesController.addIngredient
);

router.delete(
  "/plates/:plateId/ingredients/:ingId",
  platesController.deleteIngredient
);

// Route to SHOW the edit ingredient form (ADDED)
router.get(
  "/plates/:plateId/ingredients/:ingId/edit",
  platesController.editIngredientForm
);

router.put(
  "/plates/:plateId/ingredients/:ingId",
  upload.single("ingredientImage"),
  platesController.updateIngredient
);

// Route to show the confirmation page for creating an ingredient (ADDED)
router.get(
  "/createconfirmationingredient",
  platesController.showConfirmationPageCreate
);

// Route to show the confirmation page for editing an ingredient (ADDED)
router.get(
  "/editconfirmationingredient",
  platesController.showConfirmationPageEdit
);

// Route to show the confirmation page for deleting an ingredient (ADDED)
router.get(
  "/deleteconfirmationingredient",
  platesController.showConfirmationPageDelete
);

// Route to SHOW the error page when creating an ingredient (ADDED)
router.get("/createerroringredient", platesController.showErrorPageCreate);

// Route to SHOW the error page when editing an ingredient (ADDED)
router.get("/editerroringredient", platesController.showErrorPageEdit);
//Enf of Miguel Angel part


// ---------- Generic error page (redirect here from controllers) ----------
router.get("/error", (req, res) => {
  // read query parameters (if they come encoded)
  const title = req.query.title ? decodeURIComponent(req.query.title) : "Error";
  const message = req.query.message
    ? decodeURIComponent(req.query.message)
    : "Ha ocurrido un error.";
  const returnUrl = req.query.returnUrl
    ? decodeURIComponent(req.query.returnUrl)
    : "/";
  // render error.mustache with a button pointing to returnUrl
  return res
    .status(400)
    .render("error", { title, message, returnUrl: returnUrl });
});

module.exports = router;
