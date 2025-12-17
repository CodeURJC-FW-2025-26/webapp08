// controllers/platesController.js
const { validationResult } = require('express-validator');
const Plate = require('../models/Plate');
const Ingredient = require('../models/Ingredient'); 
const path = require('path');
const fs = require('fs');

const ITEMS_PER_PAGE = 6;

const ALLERGEN_OPTIONS = [
  'Gluten','Crustáceos','Huevos','Pescado','Cacahuetes','Soja','Lácteos',
  'Frutos de cáscara','Nueces','Apio','Mostaza','Sésamo',
  'Dióxido de azufre y sulfitos','Altramuces','Moluscos','Aguacate'
];

/* --- Helpers --- */
function handleValidationErrors(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return { ok: false, errors: errors.array() };
  }
  return { ok: true };
}

function escapeRegExp(string) {
  if (!string) return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildQueryString(queryObj = {}, opts = {}) {
  const exclude = Array.isArray(opts.exclude) ? opts.exclude : [];
  const pairs = [];
  const q = { ...queryObj };

  if (typeof opts.page !== 'undefined') q.page = String(opts.page);

  for (const k of Object.keys(q)) {
    if (exclude.includes(k)) continue;
    if (q[k] === undefined || q[k] === null || String(q[k]).trim() === '') continue;
    pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(q[k]));
  }
  return pairs.join('&');
}

/* --- Controller actions --- */

/**
 * Paginated list of plates with filters (name, type, ingredients)
 */
async function listPlates(req, res) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));

  // search parameters (come by GET)
  const searchName = (req.query.searchName || '').trim();
  const searchType = (req.query.searchType || '').trim();
  const searchIngredients = (req.query.searchIngredients || '').trim();

  try {
    // Build dynamic filter
    const filter = {};

    if (searchName) {
      filter.title = { $regex: new RegExp(escapeRegExp(searchName), 'i') };
    }

    if (searchType && searchType.toLowerCase() !== 'todos' && searchType !== '') {
      filter.type = searchType;
    }

    if (searchIngredients && searchIngredients.toLowerCase() !== 'todos' && searchIngredients !== '') {
      const ingRegex = new RegExp(escapeRegExp(searchIngredients), 'i');
      filter.$or = [
        { allergens: searchIngredients },           // match exact alérgeno
        { allergens: { $regex: ingRegex } },        // match parcial en alérgenos
        { 'ingredients.name': { $regex: ingRegex } } // match en nombre de ingredientes
      ];
    }

    // total and pagination
    const total = await Plate.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    if (page > totalPages && total > 0) {
      const baseQS = buildQueryString(req.query, { page: totalPages });
      return res.redirect('/?' + baseQS);
    }

    const skip = (page - 1) * ITEMS_PER_PAGE;

    // sorting: use order if it exists, otherwise title
    const platesRaw = await Plate.find(filter)
      .sort({ order: 1, title: 1 })
      .skip(skip)
      .limit(ITEMS_PER_PAGE)
      .lean();

    // map for template
    const plates = platesRaw.map(p => {
      const image = (Array.isArray(p.images) && p.images.length > 0) ? p.images[0] : '/images/default-plate.jpg';
      const allergensString = (Array.isArray(p.allergens) && p.allergens.length > 0) ? p.allergens.join(', ') : '---';
      const createdAtFormatted = p.createdAt ? new Date(p.createdAt).toISOString().slice(0,10) : '';
      return { ...p, image, allergensString, createdAtFormatted };
    });

    // build pages array
    const pages = [];
    for (let i = 1; i <= totalPages; i++) pages.push({ num: i, isCurrent: i === page });

    // build query string without page for pagination links
    const queryString = buildQueryString(req.query, { exclude: ['page'] });
    const qsPrefix = queryString ? '&' + queryString : '';

    // --- flags for "selected" in category filters
    const isTypeEntrante = (searchType === 'Entrante');
    const isTypePrincipal = (searchType === 'Principal');
    const isTypeSushi = (searchType === 'Sushi');
    const isTypePostres = (searchType === 'Postres');
    const isTypeBebida = (searchType === 'Bebida');

    // --- flags for ingredient/allergen predefined filters
    const isIngArroz = (searchIngredients === 'Arroz');
    const isIngPollo = (searchIngredients === 'Pollo');
    const isIngPescado = (searchIngredients === 'Pescado');
    const isIngVerduras = (searchIngredients === 'Verduras');

    res.render('main', {
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
      isTypeEntrante, isTypePrincipal, isTypeSushi, isTypePostres, isTypeBebida,
      isIngArroz, isIngPollo, isIngPescado, isIngVerduras
    });

  } catch (err) {
    console.error('Error listPlates:', err);
    res.status(500).render('main', { errorMessage: 'Error al listar platos' });
  }
}

/**
 * Show new plate form
 */
function showNewForm(req, res) {
  res.render('new', { plate: {}, errors: [], allergenOptions: ALLERGEN_OPTIONS });
}

/**
 * Create plate (process POST /plates)
 */
async function createPlate(req, res) {

  // Detectar correctamente si es AJAX aunque sea FormData
  const wantsJson =
      req.xhr ||
      req.headers['x-requested-with'] === 'XMLHttpRequest' ||
      (req.headers.accept && req.headers.accept.includes('application/json'));

  const isEditing = false; // esta función solo crea, no edita
  const validation = handleValidationErrors(req);
  const hasImageFiles = req.files && req.files.length > 0;

  // -----------------------------
  // 1) VALIDACIONES DE EXPRESS-VALIDATOR
  // -----------------------------
  if (!validation.ok) {
    const errors = validation.errors.map(e => ({ param: e.path, msg: e.msg }));

    if (wantsJson) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    return res.status(400).render('new', {
      errors,
      plate: req.body,
      allergenOptions: ALLERGEN_OPTIONS,
      editing: false
    });
  }

  // -----------------------------
  // 2) IMAGEN OBLIGATORIA SOLO EN CREACIÓN
  // -----------------------------
  if (!hasImageFiles && !isEditing) {
    const errObj = { param: "plateImage", msg: "La imagen del plato es obligatoria" };

    if (wantsJson) {
      return res.status(400).json({
        success: false,
        errors: [errObj]
      });
    }

    return res.status(400).render('new', {
      errors: [errObj],
      plate: req.body,
      allergenOptions: ALLERGEN_OPTIONS,
      editing: false
    });
  }

  // -----------------------------
  // 3) VALIDACIÓN DE TÍTULO ÚNICO
  // -----------------------------
  try {
    const exists = await Plate.findOne({ title: req.body.title });

    if (exists) {
      const errObj = { param: "title", msg: "Ya existe un plato con ese título" };

      if (wantsJson) {
        return res.status(400).json({
          success: false,
          errors: [errObj]
        });
      }

      return res.status(400).render('new', {
        errors: [errObj],
        plate: req.body,
        allergenOptions: ALLERGEN_OPTIONS,
        editing: false
      });
    }
  } catch (err) {
    console.error("Error checking existing title:", err);

    if (wantsJson) {
      return res.status(500).json({
        success: false,
        error: "Error del servidor al validar el título"
      });
    }

    return res.status(500).render('new', {
      errorMessage: "Error al validar título",
      plate: req.body,
      allergenOptions: ALLERGEN_OPTIONS
    });
  }

  // -----------------------------
  // 4) CREACIÓN REAL DEL PLATO
  // -----------------------------
  try {
    const { title, type, description, price, duration } = req.body;

    const allergens = Array.isArray(req.body.allergens)
      ? req.body.allergens
      : req.body.allergens
      ? [req.body.allergens]
      : [];

    const images = hasImageFiles
      ? req.files.map(f => "/uploads/" + f.filename)
      : [];

    const plate = new Plate({
      title,
      type,
      description,
      price: parseFloat(price),
      duration: parseInt(duration, 10),
      allergens,
      images
    });

    await plate.save();

    // RESPUESTA AJAX → JSON
    if (wantsJson) {
      return res.json({
        success: true,
        redirect: `/plates/${plate._id}`
      });
    }

    // RESPUESTA NORMAL → REDIRECCIÓN
    return res.redirect(`/plates/${plate._id}/created`);

  } catch (err) {
    console.error("Error createPlate:", err);

    if (wantsJson) {
      return res.status(500).json({
        success: false,
        error: "Error del servidor al crear el plato"
      });
    }

    return res.status(500).render('new', {
      errorMessage: "Error al crear plato",
      plate: req.body,
      allergenOptions: ALLERGEN_OPTIONS
    });
  }
}


/**
 * Show plate detail
 */
// Replace the current showPlate function with this:
async function showPlate(req, res) {
  try {
    // Populate ingredients (if they are refs) so the view receives objects with name, description, image, _id...
    const plate = await Plate.findById(req.params.id).populate('ingredients').lean();
    if (!plate) return res.status(404).render('error', { title: 'No encontrado', message: 'Plato no encontrado', returnUrl: '/' });

    plate.createdAtFormatted = plate.createdAt ? new Date(plate.createdAt).toISOString().slice(0,10) : '';

    // Provide plateId to the view (used for ingredient links)
    return res.render('detail', {
      plate,
      plateId: plate._id.toString()
    });

  } catch (err) {
    console.error('Error showPlate:', err);
    return res.status(500).render('error', { title: 'Error', message: 'Error al recuperar plato' });
  }
}



/**
 * Intermediate confirmation page after creating a plate
 */
async function showCreated(req, res) {
  try {
    const plate = await Plate.findById(req.params.id).lean();
    if (!plate) {
      return res.status(404).render('error', { title: 'No encontrado', message: 'Plato no encontrado', showHome: true });
    }

    // prepare main image
    const image = (Array.isArray(plate.images) && plate.images.length > 0) ? plate.images[0] : '/images/default-plate.jpg';

    res.render('confirmation', {
      title: 'Plato creado',
      message: 'El plato se ha creado correctamente.',
      plateId: plate._id,
      plateTitle: plate.title,
      plateImage: image
    });
  } catch (err) {
    console.error('Error showCreated:', err);
    res.status(500).render('error', { title: 'Error', message: 'Error al mostrar confirmación' });
  }
}

/**
 * Show edit form
 */
async function showEditForm(req, res) {
  try {
    const plate = await Plate.findById(req.params.id).lean();
    if (!plate) return res.status(404).render('errorcreateplate', { title: 'No encontrado', message: 'Plato no encontrado', showHome: true });

    res.render('new', { plate, editing: true, allergenOptions: ALLERGEN_OPTIONS, isEntrante: plate.type === 'Entrante', isPrincipal: plate.type === 'Principal', isSushi: plate.type === 'Sushi', isPostres: plate.type === 'Postres', isBebida: plate.type === 'Bebida'  });
  } catch (err) {
    console.error('Error showEditForm:', err);
    res.status(500).render('error', { title: 'Error', message: 'Error al recuperar plato' });
  }
}

/**
 * Update plate (PUT)
 */
async function updatePlate(req, res) {
  // Detectar petición AJAX (similar a createPlate)
  const wantsJson =
    req.xhr ||
    req.headers['x-requested-with'] === 'XMLHttpRequest' ||
    (req.headers.accept && req.headers.accept.includes('application/json'));

  const validation = handleValidationErrors(req);

  if (!validation.ok) {
    const errors = validation.errors.map(e => ({ param: e.path || e.param, msg: e.msg || e.message }));
    if (wantsJson) {
      return res.status(400).json({ success: false, errors });
    }
    return res.status(400).render('new', { errors: validation.errors, plate: req.body, editing: true, allergenOptions: ALLERGEN_OPTIONS });
  }

  try {
    const plate = await Plate.findById(req.params.id);
    if (!plate) {
      if (wantsJson) return res.status(404).json({ success: false, error: 'Plato no encontrado' });
      return res.status(404).render('error', { title: 'No encontrado', message: 'Plato no encontrado', showHome: true });
    }

    plate.title = req.body.title;
    plate.type = req.body.type;
    plate.description = req.body.description;
    plate.price = parseFloat(req.body.price || 0);
    plate.duration = parseInt(req.body.duration || 0, 10);
    plate.allergens = Array.isArray(req.body.allergens) ? req.body.allergens : (req.body.allergens ? [req.body.allergens] : []);

    // Manejo de imágenes:
    if (req.files && req.files.length) {
      const newFile = req.files[0];
      const newPath = '/uploads/' + newFile.filename;

      if (Array.isArray(plate.images) && plate.images.length > 0) {
        try {
          const oldRel = plate.images[0].replace(/^\//, '');
          const oldPath = path.join(process.cwd(), oldRel);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (e) {
          console.warn('No se pudo borrar imagen antigua:', e.message);
        }
        plate.images[0] = newPath;
      } else {
        plate.images = [ newPath ];
      }

      if (req.files.length > 1) {
        for (let i = 1; i < req.files.length; i++) {
          plate.images.push('/uploads/' + req.files[i].filename);
        }
      }
    } else if (req.body && (req.body.removeImage === 'true' || req.body.removeImage === true)) {
      // Borrar imagen existente si el formulario lo solicita (editar -> quitar imagen)
      if (Array.isArray(plate.images) && plate.images.length > 0) {
        plate.images.forEach(img => {
          try {
            const rel = img.replace(/^\//, '');
            const fp = path.join(process.cwd(), rel);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
          } catch (e) {
            // ignore
          }
        });
      }
      plate.images = [];
    }

    await plate.save();

    if (wantsJson) {
      return res.json({ success: true, redirect: `/plates/${plate._id}` });
    }

    return res.redirect(`/plates/${plate._id}`);
  } catch (err) {
    console.error('Error updatePlate:', err);
    if (wantsJson) {
      if (err && err.code === 11000) {
        return res.status(400).json({ success: false, errors: [{ param: 'title', msg: 'Ya existe un plato con ese título' }] });
      }
      return res.status(500).json({ success: false, error: 'Error al actualizar plato' });
    } else {
      if (err && err.code === 11000) {
        return res.status(400).render('new', { errors: [{ msg: 'Ya existe un plato con ese título' }], plate: req.body, editing: true, allergenOptions: ALLERGEN_OPTIONS });
      }
      return res.status(500).render('error', { title: 'Error', message: 'Error al actualizar plato' });
    }
  }
}


// controllers/platesController.js (reemplaza la función deletePlate existente)
async function deletePlate(req, res) {
  const wantsJson =
    req.xhr ||
    req.headers['x-requested-with'] === 'XMLHttpRequest' ||
    (req.headers.accept && req.headers.accept.includes('application/json'));

  try {
    const plate = await Plate.findByIdAndDelete(req.params.id);
    if (!plate) {
      if (wantsJson) {
        return res.status(404).json({ success: false, error: 'Plato no encontrado.' });
      }
      return res.status(404).render('errorplate', { title: 'No encontrado', message: 'Plato no encontrado', showHome: true });
    }

    // delete physical image files
    if (plate.images && plate.images.length) {
      plate.images.forEach(imgPath => {
        try {
          const relative = imgPath.replace(/^\//, '');
          const filePath = path.join(process.cwd(), relative);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {
          // silently ignore individual file delete errors
        }
      });
    }

    if (wantsJson) {
      return res.json({ success: true, message: 'Plato borrado correctamente.' });
    }

    //intermediate confirmation page after deletion
    return res.render('confirmdeleteplate');

  } catch (err) {
    console.error('Error deletePlate:', err);
    if (wantsJson) {
      return res.status(500).json({ success: false, error: 'Error inesperado al borrar el plato.' });
    }
    res.status(500).render('errorplate', {
      message: "Error inesperado al borrar el plato.",
      errors: [],
      backLink: "/"
    });
  }
};


// AÑADIR INGREDIENTE MODIFICADO
async function addIngredient(req, res) {
  const plateId = req.params.id;
  const backUrl = `/plates/${plateId}`;
  
  try {
    const plate = await Plate.findById(plateId);
    if (!plate) {
      return res.status(404).json({ 
        success: false, 
        error: 'Plato no encontrado.' 
      });
    }

    const { name, description } = req.body;
    
    // Validaciones básicas
    if (!name || name.trim() === '' || !description || description.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan campos por completar. Nombre y descripción son obligatorios.' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'La imagen del ingrediente es obligatoria.' 
      });
    }

    // Verificar duplicados
    await plate.populate('ingredients');
    const isDuplicate = plate.ingredients.some(ing => 
      ing.name.toLowerCase() === name.trim().toLowerCase()
    );
    
    if (isDuplicate) {
      return res.status(400).json({ 
        success: false, 
        error: `Error: El ingrediente "${name.trim()}" ya está añadido a este plato.` 
      });
    }

    // Crear nuevo ingrediente
    const imagePath = '/uploads/' + req.file.filename;
    const newIng = new Ingredient({
      name: name.trim(),
      description: description.trim(),
      image: imagePath
    });
    
    await newIng.save();

    // Añadir al plato
    plate.ingredients.push(newIng._id);
    await plate.save();

    // Devolver datos del ingrediente creado
    return res.json({
      success: true,
      ingredient: {
        _id: newIng._id,
        name: newIng.name,
        description: newIng.description,
        image: newIng.image,
        createdAt: newIng.createdAt
      },
      message: `Ingrediente "${newIng.name}" añadido correctamente.`
    });

  } catch (err) {
    console.error('Error addIngredient:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor al añadir el ingrediente.' 
    });
  }
}

// BORRAR INGREDIENTE MODIFICADO
async function deleteIngredient(req, res) {
  const plateId = req.params.plateId;
  const ingId = req.params.ingId;

  try {
    // 1. Buscar el plato
    const plate = await Plate.findById(plateId);
    if (!plate) {
      return res.status(404).json({ 
        success: false, 
        error: 'Plato no encontrado.' 
      });
    }

    // 2. Verificar si el ingrediente existe en la base de datos
    const ingredient = await Ingredient.findById(ingId);
    if (!ingredient) {
      return res.status(404).json({ 
        success: false, 
        error: 'Ingrediente no encontrado.' 
      });
    }

    // 3. Verificar que el ingrediente pertenece al plato
    const belongs = plate.ingredients.map(id => id.toString()).includes(ingId);
    if (!belongs) {
      return res.status(404).json({ 
        success: false, 
        error: 'Ingrediente no pertenece a este plato.' 
      });
    }

    // 4. Remover referencia del ingrediente en el plato
    plate.ingredients = plate.ingredients.filter(id => id.toString() !== ingId);
    await plate.save();

    // 5. Eliminar documento del ingrediente
    await Ingredient.findByIdAndDelete(ingId);

    return res.json({ 
      success: true, 
      message: 'Ingrediente eliminado correctamente.' 
    });

  } catch (err) {
    console.error('Error deleteIngredient:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor al borrar el ingrediente.' 
    });
  }
}

// EDITAR INGREDIENTE MODIFICADO
async function updateIngredient(req, res) {
  const plateId = req.params.plateId;
  const ingId = req.params.ingId;

  try {
    const plate = await Plate.findById(plateId);
    if (!plate) {
      return res.status(404).json({ 
        success: false, 
        error: 'Plato no encontrado.' 
      });
    }

    // Verificar que el ingrediente pertenece al plato
    const belongs = plate.ingredients.map(id => id.toString()).includes(ingId);
    if (!belongs) {
      return res.status(404).json({ 
        success: false, 
        error: 'Ingrediente no pertenece a este plato.' 
      });
    }

    const { name, description } = req.body;
    const removeImage = req.body.removeImage === '1';

    // Validaciones
    if (!name || name.trim() === '' || !description || description.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan campos por completar. Nombre y descripción son obligatorios.' 
      });
    }

    // Verificar duplicados (excluyendo el actual)
    await plate.populate('ingredients');
    const isDuplicate = plate.ingredients.some(existingIng => 
      existingIng._id.toString() !== ingId && 
      existingIng.name.toLowerCase() === name.trim().toLowerCase()
    );
    
    if (isDuplicate) {
      return res.status(400).json({ 
        success: false, 
        error: `Error: El ingrediente "${name.trim()}" ya existe en este plato.` 
      });
    }

    // Actualizar ingrediente
    const ing = await Ingredient.findById(ingId);
    if (!ing) {
      return res.status(404).json({ 
        success: false, 
        error: 'Ingrediente no encontrado.' 
      });
    }

    ing.name = name.trim();
    ing.description = description.trim();
    
    // Actualizar imagen si se subió una nueva
    // 1️⃣ Eliminar imagen actual si el usuario lo pidió
    if (removeImage && ing.image) {
      try {
        fs.unlinkSync(path.join(process.cwd(), ing.image.replace(/^\//, '')));
      } catch (e) {
        console.warn('No se pudo borrar imagen:', e.message);
      }
      ing.image = null;
    }

    // Eliminar imagen actual si el usuario lo pidió
    if (req.body.removeImage === '1') {
      if (ing.image) {
        try {
          fs.unlinkSync(
            path.join(process.cwd(), ing.image.replace(/^\//, ''))
          );
        } catch (e) {
          console.warn('No se pudo borrar la imagen del ingrediente:', e.message);
        }
      }
      ing.image = '';
    }

    // 2️⃣ Subir nueva imagen (reemplaza a la anterior)
    if (req.file && req.file.filename) {
      if (ing.image) {
        try {
          fs.unlinkSync(path.join(process.cwd(), ing.image.replace(/^\//, '')));
        } catch (e) {
          console.warn('No se pudo borrar imagen anterior:', e.message);
        }
      }
      ing.image = '/uploads/' + req.file.filename;
    }

    await ing.save();

    return res.json({
      success: true,
      ingredient: {
        _id: ing._id,
        name: ing.name,
        description: ing.description,
        image: ing.image
      },
      message: `Ingrediente "${ing.name}" actualizado correctamente.`
    });

  } catch (err) {
    console.error('Error updateIngredient:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor al actualizar el ingrediente.' 
    });
  }
}


// Replace current editIngredientForm function with this:
async function editIngredientForm(req, res) {
  try {
    console.log('[INFO] editIngredientForm params:', req.params); // log servidor

    const plateId = req.params.plateId;
    const ingId = req.params.ingId;

    // 1) load plate without populate (just to check membership)
    const plate = await Plate.findById(plateId).lean();
    if (!plate) {
      return res.status(404).render('error', {
        title: 'No encontrado',
        message: 'Plato no encontrado',
        returnUrl: '/'
      });
    }

    // 2) check ingredient reference belongs to plate
    const belongs = (plate.ingredients || []).map(i => String(i)).includes(String(ingId));
    if (!belongs) {
      return res.status(404).render('error', {
        title: 'Ingrediente no pertenece',
        message: 'El ingrediente no pertenece a este plato.',
        returnUrl: `/plates/${plateId}`
      });
    }

    // 3) load actual Ingredient document
    const ingredient = await Ingredient.findById(ingId).lean();
    if (!ingredient) {
      return res.status(404).render('editerroringredient', {
        title: 'Ingrediente no encontrado',
        message: 'No se encontró el ingrediente solicitado.',
        returnUrl: `/plates/${plateId}`
      });
    }

    // 4) Render the edit ingredient form with ingredient data
    return res.render('editingredientform', {
      plateId: plateId,
      ingId: ingId,
      ingredient: {
        _id: ingredient._id,
        name: ingredient.name || '',
        description: ingredient.description || '',
        image: ingredient.image || ''
      }
    });

  } catch (err) {
    console.error('Error editIngredientForm:', err);
    return res.status(500).render('editerroringredient', {
      title: 'Error servidor',
      message: 'Error al cargar formulario de edición',
      returnUrl: `/plates/${req.params.plateId || ''}`
    });
  }
}


async function showConfirmationPageCreate(req, res) {
  // Retrieve the success message and the return URL (which will be the plate detail)
    const successMessage = req.query.message || 'La operación se ha completado con éxito.';
    const redirectUrl = req.query.redirectTo || '/';
    
  // Render confirmation view
    res.render('createconfirmationingredient', { // 👈 Crea esta vista (Paso 4)
        successMessage: successMessage,
        redirectUrl: redirectUrl
    });
};

async function showConfirmationPageEdit(req, res) {
  // Retrieve the success message and the return URL (which will be the plate detail)
    const successMessage = req.query.message || 'La operación se ha completado con éxito.';
    const redirectUrl = req.query.redirectTo || '/';
    
  // Render confirmation view
    res.render('editconfirmationingredient', { // 👈 Crea esta vista (Paso 4)
        successMessage: successMessage,
        redirectUrl: redirectUrl
    });
};

async function showConfirmationPageDelete(req, res) {
    // Retrieve the success message and the return URL (which will be the plate detail)
    const successMessage = req.query.message || 'La operación se ha completado con éxito.';
    const redirectUrl = req.query.redirectTo || '/';
    
  // Render confirmation view
    res.render('deleteconfirmationingredient', { // 👈 Crea esta vista (Paso 4)
        successMessage: successMessage,
        redirectUrl: redirectUrl
    });
};

async function showErrorPageCreate(req, res) {
    // Retrieve data from the URL (Query Parameters)
    // 'message' is the specific error text (e.g., "Duplicate name").
    const errorMessage = req.query.message || 'Se ha producido un error desconocido.';
  // 'redirectTo' is the URL where the button should lead back (e.g., /plates/ID).
    const redirectUrl = req.query.redirectTo || '/'; 
    
  // Render error view
    res.render('createerroringredient', { 
        errorMessage: errorMessage,
        redirectUrl: redirectUrl
    });
};

async function showErrorPageEdit(req, res) {
  // Retrieve data from the URL (Query Parameters)
  // 'message' is the specific error text (e.g., "Duplicate name").
    const errorMessage = req.query.message || 'Se ha producido un error desconocido.';
  // 'redirectTo' is the URL where the button should lead back (e.g., /plates/ID).
    const redirectUrl = req.query.redirectTo || '/'; 
    
  // Render error view
    res.render('editerroringredient', { 
        errorMessage: errorMessage,
        redirectUrl: redirectUrl
    });
};  

// -------------- Nuevas funciones AJAX / API -----------------

// Comprueba disponibilidad del título (GET /api/plates/check-title?title=xxx)
async function checkTitleAvailability(req, res) {
  try {
    const title = (req.query.title || '').trim();
    if (!title) return res.json({ available: false, msg: 'Título vacío' });
    const existing = await Plate.findOne({ title });
    return res.json({ available: !existing });
  } catch (err) {
    console.error('checkTitleAvailability error:', err);
    return res.status(500).json({ available: false, error: 'server error' });
  }
};


// API para paginación (JSON) -> GET /api/plates?page=1&searchName=...
async function apiListPlates(req, res) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const ITEMS_PER_PAGE = 6;

  try {

    // FILTROS
    const filter = {};
    if (req.query.searchName)
      filter.title = { $regex: new RegExp(req.query.searchName, 'i') };

    if (req.query.searchType && req.query.searchType.toLowerCase() !== 'todos')
      filter.type = req.query.searchType;

    // CONTAR Y CONSULTAR
    const total = await Plate.countDocuments(filter);

    const platesRaw = await Plate.find(filter)
      .sort({ order: 1, title: 1 })
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .lean();

    // MAPEAR FORMATO COMPLETO
    const plates = platesRaw.map(p => ({
      _id: p._id,
      title: p.title,
      type: p.type,
      price: p.price,
      description: p.description,
      duration: p.duration || null,
      allergens: Array.isArray(p.allergens) ? p.allergens : [],
      images: Array.isArray(p.images) && p.images.length ? p.images : ['/images/default-plate.jpg']
    }));

    const hasMore = (page * ITEMS_PER_PAGE) < total;

    res.json({ page, plates, hasMore });

  } catch (err) {
    console.error('apiListPlates error', err);
    res.status(500).json({ error: 'server error' });
  }
};


// Obtener datos de un ingrediente (para edición) NUEVO
async function getIngredientData(req, res) {
  try {
    const ingredient = await Ingredient.findById(req.params.id).lean();
    
    if (!ingredient) {
      return res.status(404).json({ 
        success: false, 
        error: 'Ingrediente no encontrado.' 
      });
    }

    return res.json({
      success: true,
      ingredient: {
        _id: ingredient._id,
        name: ingredient.name,
        description: ingredient.description,
        image: ingredient.image || '/images/default-ingredient.jpg'
      }
    });

  } catch (err) {
    console.error('Error getIngredientData:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor.' 
    });
  }
}

// Verificar si un nombre de ingrediente ya existe en un plato NUEVO
async function checkIngredientName(req, res) {
  try {
    const plateId = req.params.plateId;
    const ingredientName = (req.query.name || '').trim().toLowerCase();
    const excludeId = req.query.exclude || null; // Nuevo parámetro
    
    if (!ingredientName) {
      return res.json({ available: true });
    }
    
    const plate = await Plate.findById(plateId).populate('ingredients');
    
    if (!plate) {
      return res.status(404).json({ 
        success: false, 
        error: 'Plato no encontrado.' 
      });
    }
    
    // Verificar si ya existe un ingrediente con ese nombre (excluyendo el actual si se especifica)
    const exists = plate.ingredients.some(ingredient => {
      if (excludeId && ingredient._id.toString() === excludeId) {
        return false; // Excluir el ingrediente actual
      }
      return ingredient.name.toLowerCase() === ingredientName;
    });
    
    return res.json({ 
      available: !exists,
      message: exists ? 'Este ingrediente ya existe' : 'Nombre disponible'
    });
    
  } catch (err) {
    console.error('Error checkIngredientName:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor.' 
    });
  }
}

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
  checkTitleAvailability,
  apiListPlates,
  getIngredientData,
  checkIngredientName
};

