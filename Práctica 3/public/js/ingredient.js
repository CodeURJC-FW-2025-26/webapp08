// public/js/ingredient.js - ARCHIVO COMPLETO CON MANEJO DE ERROR 404
document.addEventListener('DOMContentLoaded', function() {
  console.log('ingredient.js - Script cargado correctamente');
  
  // ============================================
  // VARIABLES GLOBALES PARA CONTROL DE EDICIÓN
  // ============================================
  let isEditing = false;
  let originalIngredientsHTML = '';
  let currentEditIngredientId = null;
  let currentEditPlateId = null;
  let ingredientNameCheckTimeout = null;
  let editNameCheckTimeout = null;
  
  // ============================================
  // 1. FUNCIONES UTILITARIAS (COMPARTIDAS)
  // ============================================
  
  // 1.1. Mostrar diálogo de error
  function showErrorDialog(message) {
    let errorModal = document.getElementById('errorModal');
    
    if (!errorModal) {
      errorModal = document.createElement('div');
      errorModal.id = 'errorModal';
      errorModal.className = 'modal fade';
      errorModal.setAttribute('tabindex', '-1');
      errorModal.setAttribute('aria-labelledby', 'errorModalLabel');
      errorModal.setAttribute('aria-hidden', 'true');
      
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
    
    document.getElementById('errorModalMessage').textContent = message;
    const modal = new bootstrap.Modal(errorModal);
    modal.show();
  }
  
  // 1.2. Mostrar diálogo de éxito (MISMO ESTILO QUE ERROR)
  function showSuccessDialog(message, title = 'Éxito') {
    let successModal = document.getElementById('successModal');
    
    if (!successModal) {
      successModal = document.createElement('div');
      successModal.id = 'successModal';
      successModal.className = 'modal fade';
      successModal.setAttribute('tabindex', '-1');
      successModal.setAttribute('aria-labelledby', 'successModalLabel');
      successModal.setAttribute('aria-hidden', 'true');
      
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
    
    document.getElementById('successModalLabel').textContent = title;
    document.getElementById('successModalMessage').textContent = message;
    const modal = new bootstrap.Modal(successModal);
    modal.show();
  }
  
  // 1.3. Actualizar mensaje "No hay ingredientes"
  function updateNoIngredientsMessage() {
    const ingredientsGrid = document.getElementById('ingredientsGrid');
    if (!ingredientsGrid) return;
    
    const ingredients = ingredientsGrid.querySelectorAll('.ing-item');
    const titleElement = document.querySelector('section.mt-3 h4.text-zen');
    
    if (ingredients.length === 0 && titleElement) {
      titleElement.textContent = 'Aún no hay ingredientes';
    } else if (ingredients.length > 0 && titleElement && titleElement.textContent === 'Aún no hay ingredientes') {
      titleElement.textContent = 'Ingredientes principales';
    }
  }
  
  // 1.4. Añadir ingrediente al DOM (para creación)
  function addIngredientToDOM(ingredientData, plateId) {
    const ingredientsGrid = document.getElementById('ingredientsGrid');
    if (!ingredientsGrid) return;
    
    const colDiv = document.createElement('div');
    colDiv.className = 'col-6 col-md-4 col-lg-3 ing-item';
    colDiv.innerHTML = `
      <div class="plate-card text-center p-2">
        <img src="${ingredientData.image || '/images/default-ingredient.jpg'}" 
             alt="${ingredientData.name}" 
             class="ingredient-img">
        <div class="ingredient-name mt-2">
          <em><strong>${ingredientData.name}</strong></em>
        </div>
        <div class="ingredient-desc">${ingredientData.description}</div>
        
        <!-- BOTONES -->
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
    
    colDiv.style.opacity = '0';
    colDiv.style.transform = 'translateY(20px)';
    ingredientsGrid.appendChild(colDiv);
    
    setTimeout(() => {
      colDiv.style.transition = 'opacity 0.3s, transform 0.3s';
      colDiv.style.opacity = '1';
      colDiv.style.transform = 'translateY(0)';
    }, 10);
  }
  
  // 1.5. Resetear estado de edición
  function resetEditState() {
    isEditing = false;
    currentEditIngredientId = null;
    currentEditPlateId = null;
    originalIngredientsHTML = '';
  }
  
  // 1.6. Actualizar ingrediente específico en el DOM
  function updateSpecificIngredientInDOM(ingredientData) {
    const ingredientButtons = document.querySelectorAll('.btn-edit-ingredient, .btn-delete-ingredient');
    
    ingredientButtons.forEach(button => {
      const ingId = button.getAttribute('data-ingredient-id');
      
      if (ingId === ingredientData._id.toString()) {
        const ingredientItem = button.closest('.ing-item');
        if (ingredientItem) {
          // Actualizar la tarjeta
          ingredientItem.querySelector('.ingredient-img').src = ingredientData.image || '/images/default-ingredient.jpg';
          ingredientItem.querySelector('.ingredient-img').alt = ingredientData.name;
          ingredientItem.querySelector('.ingredient-name strong').textContent = ingredientData.name;
          ingredientItem.querySelector('.ingredient-desc').textContent = ingredientData.description;
          
          console.log('Ingrediente actualizado en DOM:', ingredientData.name);
        }
      }
    });
  }
  
  // 1.7. Mostrar error de nombre duplicado
  function showNameError(inputElement, message) {
    // Buscar o crear elemento de error
    let errorElement = inputElement.parentElement.querySelector('.name-error-message');
    
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'name-error-message invalid-feedback';
      errorElement.style.display = 'block';
      inputElement.parentElement.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
    inputElement.classList.add('is-invalid');
    
    // Añadir estilos si no existen
    const style = document.createElement('style');
    if (!document.querySelector('#name-error-styles')) {
      style.id = 'name-error-styles';
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
  
  // 1.8. Limpiar error de nombre
  function clearNameError(inputElement = null) {
    if (inputElement) {
      // Limpiar solo para un input específico
      const errorElement = inputElement.parentElement.querySelector('.name-error-message');
      if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
      }
      inputElement.classList.remove('is-invalid');
    } else {
      // Limpiar todos los errores
      const errorElements = document.querySelectorAll('.name-error-message');
      errorElements.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
      });
      
      const invalidInputs = document.querySelectorAll('input.is-invalid[name="name"], textarea.is-invalid[name="description"]');
      invalidInputs.forEach(input => {
        input.classList.remove('is-invalid');
      });
    }
  }
  
  // 1.9. Verificar nombre del ingrediente (duplicados) - PARA AÑADIR
  function checkIngredientName(name, plateId, inputElement, currentIngId = null) {
    // Limpiar error previo
    clearNameError(inputElement);
    
    if (name.length < 2) return;
    
    const url = currentIngId 
      ? `/api/plates/${plateId}/check-ingredient-name?name=${encodeURIComponent(name)}&exclude=${currentIngId}`
      : `/api/plates/${plateId}/check-ingredient-name?name=${encodeURIComponent(name)}`;
    
    fetch(url, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      if (!data.available) {
        showNameError(inputElement, 'Este ingrediente ya existe');
      }
    })
    .catch(error => {
      console.error('Error verificando nombre:', error);
    });
  }
  
  // ============================================
  // 2. BORRAR INGREDIENTE (AJAX) - CON MANEJO DE ERROR 404
  // ============================================
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-delete-ingredient')) {
      e.preventDefault();
      
      const button = e.target;
      const plateId = button.getAttribute('data-plate-id');
      const ingId = button.getAttribute('data-ingredient-id');
      const ingredientItem = button.closest('.ing-item');
      const ingredientName = ingredientItem ? ingredientItem.querySelector('.ingredient-name strong').textContent : 'el ingrediente';
      
      // 1. CREAR Y MOSTRAR MODAL DE PROCESAMIENTO (NO SE PUEDE CERRAR)
      const processingModal = document.createElement('div');
      processingModal.id = 'processingModal_' + Date.now(); // ID único
      processingModal.className = 'modal fade';
      processingModal.setAttribute('tabindex', '-1');
      processingModal.setAttribute('aria-labelledby', 'processingModalLabel');
      processingModal.setAttribute('aria-hidden', 'true');
      processingModal.setAttribute('data-bs-backdrop', 'static');
      processingModal.setAttribute('data-bs-keyboard', 'false');
      
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
      
      // Inicializar y mostrar modal
      const processingModalInstance = new bootstrap.Modal(processingModal, {
        backdrop: 'static',
        keyboard: false
      });
      processingModalInstance.show();
      
      // Deshabilitar botón
      const originalText = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Borrando...';
      
      fetch(`/plates/${plateId}/ingredients/${ingId}`, {
        method: 'DELETE',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        }
      })
      .then(response => {
        // Restaurar botón
        button.disabled = false;
        button.innerHTML = originalText;
        
        // 2. OCULTAR Y ELIMINAR MODAL DE PROCESAMIENTO
        processingModalInstance.hide();
        
        // Eliminar modal del DOM después de ocultarlo
        setTimeout(() => {
          if (processingModal.parentNode) {
            processingModal.parentNode.removeChild(processingModal);
          }
          // Limpiar backdrop si existe
          const backdrop = document.querySelector('.modal-backdrop');
          if (backdrop) backdrop.remove();
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
        }, 300);
        
        // VERIFICAR ERROR 404 (INGREDIENTE YA BORRADO EN OTRA PESTAÑA)
        if (response.status === 404) {
          // El ingrediente ya no existe (probablemente borrado en otra pestaña)
          if (ingredientItem) {
            // Eliminar el elemento del DOM ya que no existe en el servidor
            ingredientItem.style.transition = 'opacity 0.3s, transform 0.3s';
            ingredientItem.style.opacity = '0';
            ingredientItem.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
              ingredientItem.remove();
              updateNoIngredientsMessage();
            }, 300);
          }
          
          // Mostrar mensaje específico para error 404
          showErrorDialog('Error: El ingrediente no existe.');
          return;
        }
        
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
          });
        }
        return response.json();
      })
      .then(data => {
        if (data && data.success && ingredientItem) {
          // 3. ANIMAR ELIMINACIÓN DEL DOM
          ingredientItem.style.transition = 'opacity 0.3s, transform 0.3s';
          ingredientItem.style.opacity = '0';
          ingredientItem.style.transform = 'scale(0.8)';
          
          setTimeout(() => {
            ingredientItem.remove();
            updateNoIngredientsMessage();
            
            // 4. MOSTRAR MODAL DE ÉXITO (SE PUEDE CERRAR)
            showSuccessDialog(`"${ingredientName}" ha sido borrado correctamente.`, 'Borrado completado');
          }, 300);
        } else if (data && !data.success) {
          // 3. MOSTRAR ERROR DEL SERVIDOR
          showErrorDialog(data.error || 'Error al borrar el ingrediente.');
        }
        // Si data es null/undefined (ya manejado en el bloque 404), no hacer nada
      })
      .catch(error => {
        console.error('Error:', error);
        
        // Restaurar botón
        button.disabled = false;
        button.innerHTML = originalText;
        
        // 2. OCULTAR Y ELIMINAR MODAL DE PROCESAMIENTO (si aún existe)
        if (processingModalInstance) {
          processingModalInstance.hide();
        }
        
        // Eliminar modal del DOM
        setTimeout(() => {
          if (processingModal.parentNode) {
            processingModal.parentNode.removeChild(processingModal);
          }
          // Limpiar backdrop si existe
          const backdrop = document.querySelector('.modal-backdrop');
          if (backdrop) backdrop.remove();
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
        }, 300);
        
        // 3. MOSTRAR ERROR (pero no si ya manejamos el 404)
        if (!error.message.includes('404')) {
          showErrorDialog(`Error: ${error.message}`);
        }
      });
    }
  });
  
  // ============================================
  // 3. AÑADIR INGREDIENTE (AJAX) - CON VALIDACIÓN
  // ============================================
  const addIngredientForm = document.getElementById('addIngredientForm');
  
  if (addIngredientForm) {
    const nameInput = addIngredientForm.querySelector('input[name="name"]');
    const plateId = addIngredientForm.action.match(/\/plates\/([^\/]+)\/ingredients/)[1];
    
    // 3.1. VALIDACIÓN EN TIEMPO REAL DE NOMBRE
    if (nameInput) {
      nameInput.addEventListener('input', function() {
        clearTimeout(ingredientNameCheckTimeout);
        
        const name = this.value.trim();
        if (name.length < 2) {
          clearNameError(this);
          return;
        }
        
        // Esperar 500ms después de dejar de escribir
        ingredientNameCheckTimeout = setTimeout(() => {
          checkIngredientName(name, plateId, this);
        }, 500);
      });
      
      // También validar al perder el foco
      nameInput.addEventListener('blur', function() {
        const name = this.value.trim();
        if (name.length >= 2) {
          checkIngredientName(name, plateId, this);
        }
      });
    }
    
    // 3.2. ENVÍO DEL FORMULARIO
    addIngredientForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Validar nombre antes de enviar
      const name = nameInput.value.trim();
      const nameError = addIngredientForm.querySelector('.name-error-message');
      
      if (nameError && nameError.style.display !== 'none') {
        showErrorDialog('No se puede añadir el ingrediente: el nombre ya existe.');
        return;
      }
      
      const formData = new FormData(this);
      
      const submitButton = this.querySelector('button[type="submit"]');
      const originalText = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Añadiendo...';
      
      fetch(`/plates/${plateId}/ingredients`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      .then(response => {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
        
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
          });
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          // 1. Limpiar formulario
          addIngredientForm.reset();
          clearNameError();

          // 🔹 PASO 3: ocultar previsualización de imagen
          const ingredientPreview = document.getElementById('ingredientImagePreview');
          const ingredientPreviewImg = document.getElementById('ingredientImagePreviewImg');
          if (ingredientPreview && ingredientPreviewImg) {
            ingredientPreview.classList.add('d-none');
            ingredientPreviewImg.src = '';
          }

          // 2. Añadir al DOM
          addIngredientToDOM(data.ingredient, plateId);

          // 3. Mostrar éxito
          showSuccessDialog(data.message || 'Ingrediente añadido correctamente');

          // 4. Actualizar mensaje
          updateNoIngredientsMessage();
        } else {
          showErrorDialog(data.error || 'Error al añadir el ingrediente.');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
        showErrorDialog(`Error: ${error.message}`);
      });
    });
  }
  
  // ============================================
  // 4. EDITAR INGREDIENTE (EN SECCIÓN COMPLETA)
  // ============================================
  
  // 4.1. Event listener para botones "Editar"
  document.addEventListener('click', function(e) {
    if (e.target.matches('.btn-edit-ingredient') || 
        (e.target.tagName === 'A' && e.target.href && e.target.href.includes('/ingredients/') && e.target.href.includes('/edit'))) {
      
      e.preventDefault();
      
      if (isEditing) {
        showErrorDialog('Ya estás editando un ingrediente. Termina o cancela la edición actual.');
        return;
      }
      
      let plateId, ingId;
      
      if (e.target.classList.contains('btn-edit-ingredient')) {
        plateId = e.target.getAttribute('data-plate-id');
        ingId = e.target.getAttribute('data-ingredient-id');
      } else {
        const url = e.target.href;
        const match = url.match(/\/plates\/([^\/]+)\/ingredients\/([^\/]+)\/edit/);
        if (match) {
          plateId = match[1];
          ingId = match[2];
        }
      }
      
      if (!plateId || !ingId) return;
      
      // Iniciar edición en sección completa
      startFullSectionEdit(plateId, ingId);
    }
  });
  
  // 4.2. Iniciar edición en sección completa
  function startFullSectionEdit(plateId, ingId) {
    console.log('Iniciando edición en sección completa');
    
    const ingredientsGrid = document.getElementById('ingredientsGrid');
    const ingredientsSection = ingredientsGrid ? ingredientsGrid.closest('section') : null;
    
    if (!ingredientsGrid || !ingredientsSection) {
      showErrorDialog('No se encontró la sección de ingredientes.');
      return;
    }
    
    // Guardar estado original
    isEditing = true;
    currentEditIngredientId = ingId;
    currentEditPlateId = plateId;
    originalIngredientsHTML = ingredientsSection.innerHTML;
    
    // Mostrar indicador de carga
    ingredientsSection.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-zen" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="mt-3 h5">Cargando ingrediente para editar...</p>
      </div>
    `;
    
    // Obtener datos del ingrediente
    fetch(`/api/ingredients/${ingId}`, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        // Manejar error 404 si el ingrediente ya no existe
        if (response.status === 404) {
          throw new Error('El ingrediente ya no existe. Puede que haya sido borrado en otra pestaña.');
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        showFullEditForm(ingredientsSection, data.ingredient, plateId, ingId);
      } else {
        throw new Error(data.error || 'Error al cargar datos del ingrediente');
      }
    })
    .catch(error => {
      console.error('Error cargando ingrediente:', error);
      cancelFullSectionEdit();
      showErrorDialog(`Error al cargar ingrediente: ${error.message}`);
    });
  }
  
  // 4.3. Mostrar formulario de edición completo
  function showFullEditForm(container, ingredientData, plateId, ingId) {
    const isDefaultImage = ingredientData.image === '/images/default-ingredient.jpg' || !ingredientData.image;
    
    container.innerHTML = `
      <div class="full-edit-container">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h4 class="text-zen mb-0">Editando Ingrediente: <em>${ingredientData.name}</em></h4>
        </div>
        
        <div class="row justify-content-center">
          <div class="col-12 col-md-10 col-lg-8">
            <div class="plate-card-detail p-4">
              <form id="editIngredientForm" data-plate-id="${plateId}" data-ingredient-id="${ingId}">
                
                <!-- Imagen actual -->
                <div class="mb-4">
                  <label class="form-label"><strong>Imagen actual:</strong></label>

                  <div class="text-center mb-3" id="currentIngredientImageWrapper">
                    <img src="${ingredientData.image || '/images/default-ingredient.jpg'}"
                        alt="${ingredientData.name}"
                        style="max-width: 250px; height: auto;"
                        class="img-fluid rounded-zen shadow"
                        id="currentIngredientImage">
                  </div>

                  <!-- hidden SIEMPRE -->
                  <input type="hidden"
                        name="removeImage"
                        id="removeIngredientImageInput"
                        value="0">

                  <!-- botón SIEMPRE -->
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
                
                <!-- Nombre -->
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
                
                <!-- Descripción -->
                <div class="mb-4">
                  <label class="form-label"><strong>Descripción:</strong></label>
                  <textarea name="description" 
                            class="form-control" 
                            rows="4" 
                            required 
                            maxlength="200"
                            placeholder="Describe el ingrediente...">${ingredientData.description}</textarea>
                </div>
                
                <!-- Botones (alineados a la derecha) -->
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
  
  // 4.4. Configurar eventos del formulario completo
  function setupFullEditFormEvents(plateId, ingId) {
    const cancelButtons = document.querySelectorAll('.btn-cancel-full-edit');
    const form = document.getElementById('editIngredientForm');
    const nameInput = document.getElementById('editIngredientName');
    
    // VALIDACIÓN EN TIEMPO REAL PARA EDICIÓN
    if (nameInput) {
      nameInput.addEventListener('input', function() {
        clearTimeout(editNameCheckTimeout);
        
        const name = this.value.trim();
        if (name.length < 2) {
          clearNameError(this);
          return;
        }
        
        // Esperar 500ms después de dejar de escribir
        editNameCheckTimeout = setTimeout(() => {
          checkIngredientName(name, plateId, this, ingId);
        }, 500);
      });
      
      // También validar al perder el foco
      nameInput.addEventListener('blur', function() {
        const name = this.value.trim();
        if (name.length >= 2) {
          checkIngredientName(name, plateId, this, ingId);
        }
      });
    }
    
    // Eventos para cancelar
    cancelButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        cancelFullSectionEdit();
      });
    });
    
    // Evento para enviar formulario
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Validar nombre antes de enviar
        const name = nameInput.value.trim();
        const nameError = form.querySelector('.name-error-message');
        
        if (nameError && nameError.style.display !== 'none') {
          showErrorDialog('No se puede actualizar el ingrediente: el nombre ya existe.');
          return;
        }
        
        const submitBtn = document.getElementById('editSubmitButton');
        const submitText = submitBtn.querySelector('.submit-text');
        const spinner = submitBtn.querySelector('.spinner-border');
        
        submitText.classList.add('d-none');
        spinner.classList.remove('d-none');
        submitBtn.disabled = true;
        
        const formData = new FormData(this);
        const plateId = this.getAttribute('data-plate-id');
        const ingId = this.getAttribute('data-ingredient-id');
        
        fetch(`/plates/${plateId}/ingredients/${ingId}`, {
          method: 'PUT',
          body: formData,
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
        .then(response => {
          submitText.classList.remove('d-none');
          spinner.classList.add('d-none');
          submitBtn.disabled = false;
          
          // Manejar error 404 si el ingrediente ya no existe
          if (response.status === 404) {
            throw new Error('El ingrediente ya no existe. Puede que haya sido borrado en otra pestaña.');
          }
          
          if (!response.ok) {
            return response.json().then(data => {
              throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
            });
          }
          return response.json();
        })
        .then(data => {
          if (data.success) {
            // Mostrar CUADRO DE DIÁLOGO DE ÉXITO
            showSuccessDialog(data.message || 'Ingrediente actualizado correctamente');
            
            // Restaurar sección y actualizar el ingrediente específico
            restoreIngredientsSection(data.ingredient);
          } else {
            throw new Error(data.error || 'Error al actualizar el ingrediente');
          }
        })
        .catch(error => {
          console.error('Error actualizando ingrediente:', error);
          showErrorDialog(`Error: ${error.message}`);
        });
      });
    }
    
    // ======================================
    // ELIMINAR IMAGEN ACTUAL (EDICIÓN)
    // ======================================
    const removeCurrentBtn = document.getElementById('removeCurrentIngredientImageBtn');
    const removeImageInput = document.getElementById('removeIngredientImageInput');
    const currentImage = document.getElementById('currentIngredientImage');

    if (removeCurrentBtn) {
      removeCurrentBtn.addEventListener('click', () => {
        // avisar al backend
        removeImageInput.value = '1';

        // quitar imagen de la vista
        if (currentImage) {
          currentImage.remove();
        }

        // quitar botón
        removeCurrentBtn.remove();
      });
    }

    // ===============================
    // PREVIEW IMAGEN EN EDICIÓN
    // ===============================
    const editImageInput = document.getElementById('editIngredientImageInput');
    const editPreview = document.getElementById('editIngredientPreview');
    const editPreviewImg = document.getElementById('editIngredientPreviewImg');

    const removeNewImageBtn = document.getElementById('removeNewIngredientImageBtn');

    if (removeNewImageBtn) {
      removeNewImageBtn.addEventListener('click', () => {
        // limpiar input file
        editImageInput.value = '';

        // ocultar preview
        editPreviewImg.src = '';
        editPreview.classList.add('d-none');
      });
    }

    if (editImageInput) {
      editImageInput.addEventListener('change', () => {
        const file = editImageInput.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
          showErrorDialog('El archivo seleccionado no es una imagen válida.');
          editImageInput.value = '';
          return;
        }

        const reader = new FileReader();
        reader.onload = e => {
          editPreviewImg.src = e.target.result;
          editPreview.classList.remove('d-none');
        };
        reader.readAsDataURL(file);
      });
    }
  }
  
  // 4.5. Cancelar edición y restaurar sección
  function cancelFullSectionEdit() {
    const ingredientsSection = document.querySelector('section.mt-3');
    if (ingredientsSection && originalIngredientsHTML) {
      ingredientsSection.innerHTML = originalIngredientsHTML;
    }
    
    // Resetear estado
    resetEditState();
    
    // Re-convertir enlaces a botones (por si acaso)
    setTimeout(() => {
      convertEditLinksToButtons();
    }, 100);
  }
  
  // 4.6. Restaurar sección después de edición exitosa
  function restoreIngredientsSection(updatedIngredient) {
    const ingredientsSection = document.querySelector('section.mt-3');
    
    if (ingredientsSection && originalIngredientsHTML) {
      // Restaurar HTML original
      ingredientsSection.innerHTML = originalIngredientsHTML;
      
      // Actualizar el ingrediente específico en el DOM
      updateSpecificIngredientInDOM(updatedIngredient);
    }
    
    // Resetear estado
    resetEditState();
    
    // Re-convertir enlaces a botones
    setTimeout(() => {
      convertEditLinksToButtons();
      updateNoIngredientsMessage();
    }, 100);
  }
  
  // ============================================
  // 5. FUNCIONES DE INICIALIZACIÓN
  // ============================================
  
  // 5.1. Configurar botones de borrar existentes (compatibilidad)
  function setupExistingDeleteButtons() {
    const deleteForms = document.querySelectorAll('form[action*="/ingredients/"]');
    
    deleteForms.forEach(form => {
      if (form.action.includes('_method=DELETE')) {
        const match = form.action.match(/\/plates\/([^\/]+)\/ingredients\/([^\/?]+)/);
        if (match) {
          const plateId = match[1];
          const ingId = match[2];
          
          const submitButton = form.querySelector('button[type="submit"]');
          if (submitButton) {
            submitButton.classList.add('btn-delete-ingredient');
            submitButton.setAttribute('data-plate-id', plateId);
            submitButton.setAttribute('data-ingredient-id', ingId);
            
            const buttonContainer = form.parentElement;
            const newButton = submitButton.cloneNode(true);
            form.remove();
            buttonContainer.appendChild(newButton);
          }
        }
      }
    });
  }
  
  // 5.2. Convertir enlaces tradicionales a botones AJAX
  function convertEditLinksToButtons() {
    const editLinks = document.querySelectorAll('a[href*="/ingredients/"][href*="/edit"]');
    
    editLinks.forEach(link => {
      const url = link.href;
      const match = url.match(/\/plates\/([^\/]+)\/ingredients\/([^\/]+)\/edit/);
      
      if (match) {
        const plateId = match[1];
        const ingId = match[2];
        
        const button = document.createElement('button');
        button.className = 'btn btn-create btn-sm me-1 btn-edit-ingredient';
        button.setAttribute('data-plate-id', plateId);
        button.setAttribute('data-ingredient-id', ingId);
        button.textContent = 'Editar';
        
        link.parentNode.replaceChild(button, link);
      }
    });
  }
  
  // ============================================
  // 6. INICIALIZAR TODO
  // ============================================
  console.log('Inicializando ingredient.js');
  setupExistingDeleteButtons();
  convertEditLinksToButtons();
  updateNoIngredientsMessage();
  console.log('Inicialización completada');

  // ============================================
  // 7. PREVISUALIZACIÓN DE IMAGEN (AÑADIR INGREDIENTE)
  // ============================================

  const ingredientImageInput = document.getElementById('ingredientImage');
  const ingredientPreview = document.getElementById('ingredientImagePreview');
  const ingredientPreviewImg = document.getElementById('ingredientImagePreviewImg');
  const removeIngredientImageBtn = document.getElementById('removeIngredientImageBtn');

  if (ingredientImageInput && ingredientPreview && ingredientPreviewImg) {

    ingredientImageInput.addEventListener('change', () => {
      const file = ingredientImageInput.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showErrorDialog('El archivo seleccionado no es una imagen válida.');
        ingredientImageInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = e => {
        ingredientPreviewImg.src = e.target.result;
        ingredientPreview.classList.remove('d-none');
      };
      reader.readAsDataURL(file);
    });

    if (removeIngredientImageBtn) {
      removeIngredientImageBtn.addEventListener('click', () => {
        ingredientImageInput.value = '';
        ingredientPreviewImg.src = '';
        ingredientPreview.classList.add('d-none');
      });
    }
  }
});

