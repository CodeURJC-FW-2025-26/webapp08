// public/js/ingredient.js - FULL FILE WITH 404 ERROR HANDLING
document.addEventListener("DOMContentLoaded", function () {
  console.log("ingredient.js - Script cargado correctamente");

  //
  // GLOBAL VARIABLES FOR EDITING CONTROL
  //
  let isEditing = false;
  let originalIngredientsHTML = "";
  let currentEditIngredientId = null;
  let currentEditPlateId = null;
  let ingredientNameCheckTimeout = null;
  let editNameCheckTimeout = null;

  //
  // 1. UTILITY FUNCTIONS (SHARED)
  //

  // 1.1. Show error dialog
  function showErrorDialog(message) {
    let errorModal = document.getElementById("errorModal");

    if (!errorModal) {
      errorModal = document.createElement("div");
      errorModal.id = "errorModal";
      errorModal.className = "modal fade";
      errorModal.setAttribute("tabindex", "-1");
      errorModal.setAttribute("aria-labelledby", "errorModalLabel");
      errorModal.setAttribute("aria-hidden", "true");

      errorModal.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="errorModalLabel">Error</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
              <div id="errorModalMessage"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-create" data-bs-dismiss="modal">Cerrar</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(errorModal);
    }

    document.getElementById("errorModalMessage").textContent = message;
    const modal = new bootstrap.Modal(errorModal);
    modal.show();
  }

  // 1.2. Show success dialog (SAME STYLE AS ERROR)
  function showSuccessDialog(message, title = "Éxito") {
    let successModal = document.getElementById("successModal");

    if (!successModal) {
      successModal = document.createElement("div");
      successModal.id = "successModal";
      successModal.className = "modal fade";
      successModal.setAttribute("tabindex", "-1");
      successModal.setAttribute("aria-labelledby", "successModalLabel");
      successModal.setAttribute("aria-hidden", "true");

      successModal.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="successModalLabel">Éxito</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
              <div id="successModalMessage"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-create" data-bs-dismiss="modal">Aceptar</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(successModal);
    }

    document.getElementById("successModalLabel").textContent = title;
    document.getElementById("successModalMessage").textContent = message;
    const modal = new bootstrap.Modal(successModal);
    modal.show();
  }

  // 1.3. Update "No ingredients" message
  function updateNoIngredientsMessage() {
    const ingredientsGrid = document.getElementById("ingredientsGrid");
    if (!ingredientsGrid) return;

    const ingredients = ingredientsGrid.querySelectorAll(".ing-item");
    const titleElement = document.querySelector("section.mt-3 h4.text-zen");

    if (ingredients.length === 0 && titleElement) {
      titleElement.textContent = "Aún no hay ingredientes";
    } else if (
      ingredients.length > 0 &&
      titleElement &&
      titleElement.textContent === "Aún no hay ingredientes"
    ) {
      titleElement.textContent = "Ingredientes principales";
    }
  }

  // 1.4. Add ingredient to DOM (for creation)
  function addIngredientToDOM(ingredientData, plateId) {
    const ingredientsGrid = document.getElementById("ingredientsGrid");
    if (!ingredientsGrid) return;

    const colDiv = document.createElement("div");
    colDiv.className = "col-6 col-md-4 col-lg-3 ing-item";
    colDiv.innerHTML = `
      <div class="plate-card text-center p-2">
        <img src="${ingredientData.image || "/images/default-ingredient.jpg"}" 
             alt="${ingredientData.name}" 
             class="ingredient-img">
        <div class="ingredient-name mt-2">
          <em><strong>${ingredientData.name}</strong></em>
        </div>
        <div class="ingredient-desc">${ingredientData.description}</div>
        
        <!-- BUTTONS -->
        <div class="mt-2">
          <button class="btn btn-create btn-sm me-1 btn-edit-ingredient" 
                  data-plate-id="${plateId}" 
                  data-ingredient-id="${ingredientData._id}">
            Editar
          </button>
          
          <button class="btn btn-create btn-sm btn-delete-ingredient" 
                  data-plate-id="${plateId}" 
                  data-ingredient-id="${ingredientData._id}">
            Borrar
          </button>
        </div>
      </div>
    `;

    colDiv.style.opacity = "0";
    colDiv.style.transform = "translateY(20px)";
    ingredientsGrid.appendChild(colDiv);

    setTimeout(() => {
      colDiv.style.transition = "opacity 0.3s, transform 0.3s";
      colDiv.style.opacity = "1";
      colDiv.style.transform = "translateY(0)";
    }, 10);
  }

  // 1.5. Reset editing state
  function resetEditState() {
    isEditing = false;
    currentEditIngredientId = null;
    currentEditPlateId = null;
    originalIngredientsHTML = "";
  }

  // 1.6. Update specific ingredient in the DOM
  function updateSpecificIngredientInDOM(ingredientData) {
    const ingredientButtons = document.querySelectorAll(
      ".btn-edit-ingredient, .btn-delete-ingredient"
    );

    ingredientButtons.forEach((button) => {
      const ingId = button.getAttribute("data-ingredient-id");

      if (ingId === ingredientData._id.toString()) {
        const ingredientItem = button.closest(".ing-item");
        if (ingredientItem) {
          // Update the card
          ingredientItem.querySelector(".ingredient-img").src =
            ingredientData.image || "/images/default-ingredient.jpg";
          ingredientItem.querySelector(".ingredient-img").alt =
            ingredientData.name;
          ingredientItem.querySelector(".ingredient-name strong").textContent =
            ingredientData.name;
          ingredientItem.querySelector(".ingredient-desc").textContent =
            ingredientData.description;

          console.log("Ingrediente actualizado en DOM:", ingredientData.name);
        }
      }
    });
  }

  // 1.7. Show duplicate name error
  function showNameError(inputElement, message) {
    // Find or create error element
    let errorElement = inputElement.parentElement.querySelector(
      ".name-error-message"
    );

    if (!errorElement) {
      errorElement = document.createElement("div");
      errorElement.className = "name-error-message invalid-feedback";
      errorElement.style.display = "block";
      inputElement.parentElement.appendChild(errorElement);
    }

    errorElement.textContent = message;
    inputElement.classList.add("is-invalid");

    // Add styles if they do not exist
    const style = document.createElement("style");
    if (!document.querySelector("#name-error-styles")) {
      style.id = "name-error-styles";
      style.textContent = `
        .name-error-message {
          color: #dc3545;
          font-size: 0.875em;
          margin-top: 0.25rem;
          display: block !important;
        }
        input.is-invalid {
          border-color: #dc3545 !important;
        }
        textarea.is-invalid {
          border-color: #dc3545 !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // 1.8. Clear name error
  function clearNameError(inputElement = null) {
    if (inputElement) {
      // Clear only for a specific input
      const errorElement = inputElement.parentElement.querySelector(
        ".name-error-message"
      );
      if (errorElement) {
        errorElement.textContent = "";
        errorElement.style.display = "none";
      }
      inputElement.classList.remove("is-invalid");
    } else {
      // Clear all errors
      const errorElements = document.querySelectorAll(".name-error-message");
      errorElements.forEach((el) => {
        el.textContent = "";
        el.style.display = "none";
      });

      const invalidInputs = document.querySelectorAll(
        'input.is-invalid[name="name"], textarea.is-invalid[name="description"]'
      );
      invalidInputs.forEach((input) => {
        input.classList.remove("is-invalid");
      });
    }
  }

  // 1.9. Check ingredient name (duplicates)
  function checkIngredientName(
    name,
    plateId,
    inputElement,
    currentIngId = null
  ) {
    // Clear previous error
    clearNameError(inputElement);

    if (name.length < 2) return;

    const url = currentIngId
      ? `/api/plates/${plateId}/check-ingredient-name?name=${encodeURIComponent(
          name
        )}&exclude=${currentIngId}`
      : `/api/plates/${plateId}/check-ingredient-name?name=${encodeURIComponent(
          name
        )}`;

    fetch(url, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.available) {
          showNameError(inputElement, "Este ingrediente ya existe");
        }
      })
      .catch((error) => {
        console.error("Error verificando nombre:", error);
      });
  }

  //
  // 2. DELETE INGREDIENT (AJAX) - WITH 404 ERROR HANDLING
  //
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("btn-delete-ingredient")) {
      e.preventDefault();

      const button = e.target;
      const plateId = button.getAttribute("data-plate-id");
      const ingId = button.getAttribute("data-ingredient-id");
      const ingredientItem = button.closest(".ing-item");
      const ingredientName = ingredientItem
        ? ingredientItem.querySelector(".ingredient-name strong").textContent
        : "el ingrediente";

      // 1. CREATE AND SHOW PROCESSING MODAL (CANNOT BE CLOSED)
      const processingModal = document.createElement("div");
      processingModal.id = "processingModal_" + Date.now(); // unique ID
      processingModal.className = "modal fade";
      processingModal.setAttribute("tabindex", "-1");
      processingModal.setAttribute("aria-labelledby", "processingModalLabel");
      processingModal.setAttribute("aria-hidden", "true");
      processingModal.setAttribute("data-bs-backdrop", "static");
      processingModal.setAttribute("data-bs-keyboard", "false");

      processingModal.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="processingModalLabel">Procesando</h5>
            </div>
            <div class="modal-body text-center">
              <div class="spinner-border text-zen mb-3" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Cargando...</span>
              </div>
              <div>Borrando "${ingredientName}"...</div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(processingModal);

      // Initialize and show modal
      const processingModalInstance = new bootstrap.Modal(processingModal, {
        backdrop: "static",
        keyboard: false,
      });
      processingModalInstance.show();

      // Disable button
      const originalText = button.innerHTML;
      button.disabled = true;
      button.innerHTML =
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Borrando...';

      fetch(`/plates/${plateId}/ingredients/${ingId}`, {
        method: "DELETE",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Accept: "application/json",
        },
      })
        .then((response) => {
          // Restore button
          button.disabled = false;
          button.innerHTML = originalText;

          // 2. HIDE AND REMOVE PROCESSING MODAL
          processingModalInstance.hide();

          // Remove modal from DOM after hiding it
          setTimeout(() => {
            if (processingModal.parentNode) {
              processingModal.parentNode.removeChild(processingModal);
            }
            // Clean backdrop if it exists
            const backdrop = document.querySelector(".modal-backdrop");
            if (backdrop) backdrop.remove();
            document.body.classList.remove("modal-open");
            document.body.style.overflow = "";
          }, 300);

          // CHECK 404 ERROR (INGREDIENT ALREADY DELETED IN ANOTHER TAB)
          if (response.status === 404) {
            // The ingredient no longer exists (probably deleted in another tab)
            if (ingredientItem) {
              // Remove the DOM element since it no longer exists on the server
              ingredientItem.style.transition = "opacity 0.3s, transform 0.3s";
              ingredientItem.style.opacity = "0";
              ingredientItem.style.transform = "scale(0.8)";

              setTimeout(() => {
                ingredientItem.remove();
                updateNoIngredientsMessage();
              }, 300);
            }

            // Show specific message for 404 error
            showErrorDialog("Error: El ingrediente no existe.");
            return;
          }

          if (!response.ok) {
            return response.json().then((data) => {
              throw new Error(
                data.error || `Error ${response.status}: ${response.statusText}`
              );
            });
          }
          return response.json();
        })
        .then((data) => {
          if (data && data.success && ingredientItem) {
            // 3. ANIMATE REMOVAL FROM DOM
            ingredientItem.style.transition = "opacity 0.3s, transform 0.3s";
            ingredientItem.style.opacity = "0";
            ingredientItem.style.transform = "scale(0.8)";

            setTimeout(() => {
              ingredientItem.remove();
              updateNoIngredientsMessage();

              // 4. SHOW SUCCESS MODAL (CAN BE CLOSED)
              showSuccessDialog(
                `"${ingredientName}" ha sido borrado correctamente.`,
                "Borrado completado"
              );
            }, 300);
          } else if (data && !data.success) {
            // 3. SHOW SERVER ERROR
            showErrorDialog(data.error || "Error al borrar el ingrediente.");
          }
          // If data is null/undefined (already handled in the 404 block), do nothing
        })
        .catch((error) => {
          console.error("Error:", error);

          // Restore button
          button.disabled = false;
          button.innerHTML = originalText;

          // 2. HIDE AND REMOVE PROCESSING MODAL (if it still exists)
          if (processingModalInstance) {
            processingModalInstance.hide();
          }

          // Remove modal from DOM
          setTimeout(() => {
            if (processingModal.parentNode) {
              processingModal.parentNode.removeChild(processingModal);
            }
            // Clean backdrop if it exists
            const backdrop = document.querySelector(".modal-backdrop");
            if (backdrop) backdrop.remove();
            document.body.classList.remove("modal-open");
            document.body.style.overflow = "";
          }, 300);

          // 3. SHOW ERROR (but not if we already handled the 404)
          if (!error.message.includes("404")) {
            showErrorDialog(`Error: ${error.message}`);
          }
        });
    }
  });

  //
  // 3. ADD INGREDIENT (AJAX) - WITH VALIDATION
  //
  const addIngredientForm = document.getElementById("addIngredientForm");

  if (addIngredientForm) {
    const nameInput = addIngredientForm.querySelector('input[name="name"]');
    const plateId = addIngredientForm.action.match(
      /\/plates\/([^\/]+)\/ingredients/
    )[1];

    // 3.1. REAL-TIME NAME VALIDATION
    if (nameInput) {
      nameInput.addEventListener("input", function () {
        clearTimeout(ingredientNameCheckTimeout);

        const name = this.value.trim();
        if (name.length < 2) {
          clearNameError(this);
          return;
        }

        // Wait 500ms after the user stops typing
        ingredientNameCheckTimeout = setTimeout(() => {
          checkIngredientName(name, plateId, this);
        }, 500);
      });

      // Also validate on blur
      nameInput.addEventListener("blur", function () {
        const name = this.value.trim();
        if (name.length >= 2) {
          checkIngredientName(name, plateId, this);
        }
      });
    }

    // 3.2. FORM SUBMISSION
    addIngredientForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // Validate name before submitting
      const name = nameInput.value.trim();
      const nameError = addIngredientForm.querySelector(".name-error-message");

      if (nameError && nameError.style.display !== "none") {
        showErrorDialog(
          "No se puede añadir el ingrediente: el nombre ya existe."
        );
        return;
      }

      const formData = new FormData(this);

      const submitButton = this.querySelector('button[type="submit"]');
      const originalText = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.innerHTML =
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Añadiendo...';

      fetch(`/plates/${plateId}/ingredients`, {
        method: "POST",
        body: formData,
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      })
        .then((response) => {
          submitButton.disabled = false;
          submitButton.innerHTML = originalText;

          if (!response.ok) {
            return response.json().then((data) => {
              throw new Error(
                data.error || `Error ${response.status}: ${response.statusText}`
              );
            });
          }
          return response.json();
        })
        .then((data) => {
          if (data.success) {
            // 1. Reset form
            addIngredientForm.reset();
            clearNameError();

            // 🔹 STEP 3: hide image preview
            const ingredientPreview = document.getElementById(
              "ingredientImagePreview"
            );
            const ingredientPreviewImg = document.getElementById(
              "ingredientImagePreviewImg"
            );
            if (ingredientPreview && ingredientPreviewImg) {
              ingredientPreview.classList.add("d-none");
              ingredientPreviewImg.src = "";
            }

            // 2. Add to DOM
            addIngredientToDOM(data.ingredient, plateId);

            // 3. Show success
            showSuccessDialog(
              data.message || "Ingrediente añadido correctamente"
            );

            // 4. Update message
            updateNoIngredientsMessage();
          } else {
            showErrorDialog(data.error || "Error al añadir el ingrediente.");
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          submitButton.disabled = false;
          submitButton.innerHTML = originalText;
          showErrorDialog(`Error: ${error.message}`);
        });
    });
  }

  //
  // 4. EDIT INGREDIENT (FULL SECTION)
  //

  // 4.1. Event listener for "Edit" buttons
  document.addEventListener("click", function (e) {
    if (
      e.target.matches(".btn-edit-ingredient") ||
      (e.target.tagName === "A" &&
        e.target.href &&
        e.target.href.includes("/ingredients/") &&
        e.target.href.includes("/edit"))
    ) {
      e.preventDefault();

      if (isEditing) {
        showErrorDialog(
          "Ya estás editando un ingrediente. Termina o cancela la edición actual."
        );
        return;
      }

      let plateId, ingId;

      if (e.target.classList.contains("btn-edit-ingredient")) {
        plateId = e.target.getAttribute("data-plate-id");
        ingId = e.target.getAttribute("data-ingredient-id");
      } else {
        const url = e.target.href;
        const match = url.match(
          /\/plates\/([^\/]+)\/ingredients\/([^\/]+)\/edit/
        );
        if (match) {
          plateId = match[1];
          ingId = match[2];
        }
      }

      if (!plateId || !ingId) return;

      // Start editing in full section
      startFullSectionEdit(plateId, ingId);
    }
  });

  // 4.2. Start editing in full section
  function startFullSectionEdit(plateId, ingId) {
    console.log("Iniciando edición en sección completa");

    const ingredientsGrid = document.getElementById("ingredientsGrid");
    const ingredientsSection = ingredientsGrid
      ? ingredientsGrid.closest("section")
      : null;

    if (!ingredientsGrid || !ingredientsSection) {
      showErrorDialog("No se encontró la sección de ingredientes.");
      return;
    }

    // Save original state
    isEditing = true;
    currentEditIngredientId = ingId;
    currentEditPlateId = plateId;
    originalIngredientsHTML = ingredientsSection.innerHTML;

    // Show loading indicator
    ingredientsSection.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-zen" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="mt-3 h5">Cargando ingrediente para editar...</p>
      </div>
    `;

    // Fetch ingredient data
    fetch(`/api/ingredients/${ingId}`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          // Handle 404 error if the ingredient no longer exists
          if (response.status === 404) {
            throw new Error(
              "El ingrediente ya no existe. Puede que haya sido borrado en otra pestaña."
            );
          }
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          showFullEditForm(ingredientsSection, data.ingredient, plateId, ingId);
        } else {
          throw new Error(
            data.error || "Error al cargar datos del ingrediente"
          );
        }
      })
      .catch((error) => {
        console.error("Error cargando ingrediente:", error);
        cancelFullSectionEdit();
        showErrorDialog(`Error al cargar ingrediente: ${error.message}`);
      });
  }

  // 4.3. Show full edit form
  function showFullEditForm(container, ingredientData, plateId, ingId) {
    const isDefaultImage =
      ingredientData.image === "/images/default-ingredient.jpg" ||
      !ingredientData.image;

    container.innerHTML = `
      <div class="full-edit-container">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h4 class="text-zen mb-0">Editando Ingrediente: <em>${
            ingredientData.name
          }</em></h4>
        </div>
        
        <div class="row justify-content-center">
          <div class="col-12 col-md-10 col-lg-8">
            <div class="plate-card-detail p-4">
              <form id="editIngredientForm" data-plate-id="${plateId}" data-ingredient-id="${ingId}">
                
                <!-- Current image -->
                <div class="mb-4">
                  <label class="form-label"><strong>Imagen actual:</strong></label>

                  <div class="text-center mb-3" id="currentIngredientImageWrapper">
                    <img src="${
                      ingredientData.image || "/images/default-ingredient.jpg"
                    }"
                        alt="${ingredientData.name}"
                        style="max-width: 250px; height: auto;"
                        class="img-fluid rounded-zen shadow"
                        id="currentIngredientImage">
                  </div>

                  <!-- hidden ALWAYS -->
                  <input type="hidden"
                        name="removeImage"
                        id="removeIngredientImageInput"
                        value="0">

                  <!-- button ALWAYS -->
                  <button type="button"
                          class="btn btn-create btn-sm mt-2"
                          id="removeCurrentIngredientImageBtn">
                    Eliminar imagen
                  </button>

                  <div class="mt-3">
                    <label class="form-label"><strong>Cambiar imagen:</strong></label>
                    <div id="ingredientImageDropArea"
                        class="mb-2"
                        style="border: 1px dashed #ddd; padding:10px; border-radius:6px;">
                      <small class="text-muted">Arrastra la imagen aquí o haz clic para seleccionar.</small>
                      <input type="file"
                            name="ingredientImage"
                            id="editIngredientImageInput"
                            class="form-control"
                            accept="image/*">

                      <div id="editIngredientPreview" class="text-center d-none mt-3">
                        <img id="editIngredientPreviewImg"
                            class="img-fluid rounded-zen shadow"
                            style="max-width:250px;">

                        <button type="button"
                                class="btn btn-create btn-sm mt-2"
                                id="removeNewIngredientImageBtn">
                          Eliminar imagen
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <hr class="my-4">
                
                <!-- Name -->
                <div class="mb-4">
                  <label class="form-label"><strong>Nombre del ingrediente:</strong></label>
                  <input type="text" 
                         name="name" 
                         id="editIngredientName"
                         class="form-control" 
                         value="${ingredientData.name}" 
                         required 
                         maxlength="50"
                         placeholder="Ej: Queso crema">
                  <div class="name-error-message invalid-feedback" style="display: none;"></div>
                </div>
                
                <!-- Description -->
                <div class="mb-4">
                  <label class="form-label"><strong>Descripción:</strong></label>
                  <textarea name="description" 
                            class="form-control" 
                            rows="4" 
                            required 
                            maxlength="200"
                            placeholder="Describe el ingrediente...">${
                              ingredientData.description
                            }</textarea>
                </div>
                
                <!-- Buttons (right aligned) -->
                <div class="text-end mt-4">
                  <button type="button" class="btn btn-create me-2 btn-cancel-full-edit">
                    Cancelar
                  </button>
                  <button type="submit" class="btn btn-create" id="editSubmitButton">
                    <span class="submit-text">Guardar Cambios</span>
                    <span class="spinner-border spinner-border-sm d-none" role="status"></span>
                  </button>
                </div>
                
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

    setupFullEditFormEvents(plateId, ingId);
  }

  // 4.4. Configure full form events
  function setupFullEditFormEvents(plateId, ingId) {
    const cancelButtons = document.querySelectorAll(".btn-cancel-full-edit");
    const form = document.getElementById("editIngredientForm");
    const nameInput = document.getElementById("editIngredientName");

    // REAL-TIME VALIDATION FOR EDITING
    if (nameInput) {
      nameInput.addEventListener("input", function () {
        clearTimeout(editNameCheckTimeout);

        const name = this.value.trim();
        if (name.length < 2) {
          clearNameError(this);
          return;
        }

        // Wait 500ms after stopping typing
        editNameCheckTimeout = setTimeout(() => {
          checkIngredientName(name, plateId, this, ingId);
        }, 500);
      });

      // Also validate on blur
      nameInput.addEventListener("blur", function () {
        const name = this.value.trim();
        if (name.length >= 2) {
          checkIngredientName(name, plateId, this, ingId);
        }
      });
    }

    // Cancel events
    cancelButtons.forEach((btn) => {
      btn.addEventListener("click", function () {
        cancelFullSectionEdit();
      });
    });

    // Form submit event
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();

        // Validate name before submitting
        const name = nameInput.value.trim();
        const nameError = form.querySelector(".name-error-message");

        if (nameError && nameError.style.display !== "none") {
          showErrorDialog(
            "No se puede actualizar el ingrediente: el nombre ya existe."
          );
          return;
        }

        const submitBtn = document.getElementById("editSubmitButton");
        const submitText = submitBtn.querySelector(".submit-text");
        const spinner = submitBtn.querySelector(".spinner-border");

        submitText.classList.add("d-none");
        spinner.classList.remove("d-none");
        submitBtn.disabled = true;

        const formData = new FormData(this);
        const plateId = this.getAttribute("data-plate-id");
        const ingId = this.getAttribute("data-ingredient-id");

        fetch(`/plates/${plateId}/ingredients/${ingId}`, {
          method: "PUT",
          body: formData,
          headers: {
            "X-Requested-With": "XMLHttpRequest",
          },
        })
          .then((response) => {
            submitText.classList.remove("d-none");
            spinner.classList.add("d-none");
            submitBtn.disabled = false;

            // Handle 404 error if the ingredient no longer exists
            if (response.status === 404) {
              throw new Error(
                "El ingrediente ya no existe. Puede que haya sido borrado en otra pestaña."
              );
            }

            if (!response.ok) {
              return response.json().then((data) => {
                throw new Error(
                  data.error ||
                    `Error ${response.status}: ${response.statusText}`
                );
              });
            }
            return response.json();
          })
          .then((data) => {
            if (data.success) {
              // Show SUCCESS DIALOG
              showSuccessDialog(
                data.message || "Ingrediente actualizado correctamente"
              );

              // Restore section and update the specific ingredient
              restoreIngredientsSection(data.ingredient);
            } else {
              throw new Error(
                data.error || "Error al actualizar el ingrediente"
              );
            }
          })
          .catch((error) => {
            console.error("Error actualizando ingrediente:", error);
            showErrorDialog(`Error: ${error.message}`);
          });
      });
    }

    //
    // REMOVE CURRENT IMAGE (EDITING)
    //
    const removeCurrentBtn = document.getElementById(
      "removeCurrentIngredientImageBtn"
    );
    const removeImageInput = document.getElementById(
      "removeIngredientImageInput"
    );
    const currentImage = document.getElementById("currentIngredientImage");

    if (removeCurrentBtn) {
      removeCurrentBtn.addEventListener("click", () => {
        // notify backend
        removeImageInput.value = "1";

        // remove image from view
        if (currentImage) {
          currentImage.remove();
        }

        // remove button
        removeCurrentBtn.remove();
      });
    }

    //
    // IMAGE PREVIEW IN EDITING
    //
    const editImageInput = document.getElementById("editIngredientImageInput");
    const editPreview = document.getElementById("editIngredientPreview");
    const editPreviewImg = document.getElementById("editIngredientPreviewImg");

    const removeNewImageBtn = document.getElementById(
      "removeNewIngredientImageBtn"
    );

    if (removeNewImageBtn) {
      removeNewImageBtn.addEventListener("click", () => {
        // clear file input
        editImageInput.value = "";

        // hide preview
        editPreviewImg.src = "";
        editPreview.classList.add("d-none");
      });
    }

    if (editImageInput) {
      editImageInput.addEventListener("change", () => {
        const file = editImageInput.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
          showErrorDialog("El archivo seleccionado no es una imagen válida.");
          editImageInput.value = "";
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          editPreviewImg.src = e.target.result;
          editPreview.classList.remove("d-none");
        };
        reader.readAsDataURL(file);
      });
    }
  }

  // 4.5. Cancel editing and restore section
  function cancelFullSectionEdit() {
    const ingredientsSection = document.querySelector("section.mt-3");
    if (ingredientsSection && originalIngredientsHTML) {
      ingredientsSection.innerHTML = originalIngredientsHTML;
    }

    // Reset state
    resetEditState();

    // Re-convert links to buttons (just in case)
    setTimeout(() => {
      convertEditLinksToButtons();
    }, 100);
  }

  // 4.6. Restore section after successful edit
  function restoreIngredientsSection(updatedIngredient) {
    const ingredientsSection = document.querySelector("section.mt-3");

    if (ingredientsSection && originalIngredientsHTML) {
      // Restore original HTML
      ingredientsSection.innerHTML = originalIngredientsHTML;

      // Update the specific ingredient in the DOM
      updateSpecificIngredientInDOM(updatedIngredient);
    }

    // Reset state
    resetEditState();

    // Re-convert links to buttons
    setTimeout(() => {
      convertEditLinksToButtons();
      updateNoIngredientsMessage();
    }, 100);
  }

  //
  // 5. INITIALIZATION FUNCTIONS
  //

  // 5.1. Set up existing delete buttons (compatibility)
  function setupExistingDeleteButtons() {
    const deleteForms = document.querySelectorAll(
      'form[action*="/ingredients/"]'
    );

    deleteForms.forEach((form) => {
      if (form.action.includes("_method=DELETE")) {
        const match = form.action.match(
          /\/plates\/([^\/]+)\/ingredients\/([^\/?]+)/
        );
        if (match) {
          const plateId = match[1];
          const ingId = match[2];

          const submitButton = form.querySelector('button[type="submit"]');
          if (submitButton) {
            submitButton.classList.add("btn-delete-ingredient");
            submitButton.setAttribute("data-plate-id", plateId);
            submitButton.setAttribute("data-ingredient-id", ingId);

            const buttonContainer = form.parentElement;
            const newButton = submitButton.cloneNode(true);
            form.remove();
            buttonContainer.appendChild(newButton);
          }
        }
      }
    });
  }

  // 5.2. Convert traditional links to AJAX buttons
  function convertEditLinksToButtons() {
    const editLinks = document.querySelectorAll(
      'a[href*="/ingredients/"][href*="/edit"]'
    );

    editLinks.forEach((link) => {
      const url = link.href;
      const match = url.match(
        /\/plates\/([^\/]+)\/ingredients\/([^\/]+)\/edit/
      );

      if (match) {
        const plateId = match[1];
        const ingId = match[2];

        const button = document.createElement("button");
        button.className = "btn btn-create btn-sm me-1 btn-edit-ingredient";
        button.setAttribute("data-plate-id", plateId);
        button.setAttribute("data-ingredient-id", ingId);
        button.textContent = "Editar";

        link.parentNode.replaceChild(button, link);
      }
    });
  }

  //
  // 6. INITIALIZE EVERYTHING
  //
  console.log("Inicializando ingredient.js");
  setupExistingDeleteButtons();
  convertEditLinksToButtons();
  updateNoIngredientsMessage();
  console.log("Inicialización completada");

  //
  // 7. IMAGE PREVIEW (ADD INGREDIENT)
  //

  const ingredientImageInput = document.getElementById("ingredientImage");
  const ingredientPreview = document.getElementById("ingredientImagePreview");
  const ingredientPreviewImg = document.getElementById(
    "ingredientImagePreviewImg"
  );
  const removeIngredientImageBtn = document.getElementById(
    "removeIngredientImageBtn"
  );

  if (ingredientImageInput && ingredientPreview && ingredientPreviewImg) {
    ingredientImageInput.addEventListener("change", () => {
      const file = ingredientImageInput.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showErrorDialog("El archivo seleccionado no es una imagen válida.");
        ingredientImageInput.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        ingredientPreviewImg.src = e.target.result;
        ingredientPreview.classList.remove("d-none");
      };
      reader.readAsDataURL(file);
    });

    if (removeIngredientImageBtn) {
      removeIngredientImageBtn.addEventListener("click", () => {
        ingredientImageInput.value = "";
        ingredientPreviewImg.src = "";
        ingredientPreview.classList.add("d-none");
      });
    }
  }
});
