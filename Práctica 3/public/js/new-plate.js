// public/js/new-plate.js (version with real-time validation + pre-submit validation)
// + image preview (create/edit), image change and removal
document.addEventListener("DOMContentLoaded", () => {
  const form =
    document.getElementById("newPlateForm") ||
    document.querySelector("form.newplate-form");
  if (!form) return;

  // helper modal
  const modalEl = document.getElementById("globalModal");
  const bsModal = new bootstrap.Modal(modalEl);
  const spinner = document.getElementById("modalSpinner");
  const modalMessage = document.getElementById("modalMessage");
  const modalFooter = document.getElementById("globalModalFooter");
  const modalTitle = document.getElementById("globalModalTitle");
  const modalPrimaryBtn = document.getElementById("modalPrimaryBtn");

  const modalDefaultClose = document.getElementById("modalDefaultClose");
  const modalHeaderClose = document.getElementById("modalHeaderClose");

  function hideDefaultClose() {
    modalHeaderClose?.classList.add("d-none");
    modalDefaultClose?.classList.add("d-none");
  }
  function restoreDefaultClose() {
    modalHeaderClose?.classList.remove("d-none");
    modalDefaultClose?.classList.remove("d-none");
  }

  modalEl.addEventListener("hidden.bs.modal", () => {
    spinner.style.display = "none";
    modalMessage.innerHTML = "";
    modalTitle.textContent = "Procesando...";
    restoreDefaultClose();
  });

  // per-field helpers
  function setFieldError(fieldEl, msg) {
    if (!fieldEl) return;
    // try to find existing invalid-feedback
    let fb = fieldEl.parentElement.querySelector(".invalid-feedback");
    if (!fb) {
      fb = document.createElement("div");
      fb.className = "invalid-feedback";
      fieldEl.parentElement.appendChild(fb);
    }
    fb.textContent = msg;
    fieldEl.classList.add("is-invalid");
  }
  function clearFieldError(fieldEl) {
    if (!fieldEl) return;
    fieldEl.classList.remove("is-invalid");
    const fb = fieldEl.parentElement.querySelector(".invalid-feedback");
    if (fb) fb.textContent = "";
  }
  function clearAllFieldErrors() {
    form
      .querySelectorAll(".is-invalid")
      .forEach((el) => el.classList.remove("is-invalid"));
    form
      .querySelectorAll(".invalid-feedback")
      .forEach((fb) => (fb.textContent = ""));
  }

  // validation rules
  function validateTitle(value) {
    if (!value || value.trim() === "") return "El título es obligatorio.";
    if (value.trim().length < 3)
      return "El título debe tener al menos 3 caracteres.";
    if (!/^[A-ZÁÉÍÓÚÑ]/.test(value.trim()))
      return "El título debe empezar por mayúscula.";
    return null;
  }
  function validateDescription(value) {
    if (!value || value.trim() === "") return "La descripción es obligatoria.";
    if (value.trim().length < 20)
      return "La descripción debe tener al menos 20 caracteres.";
    if (value.trim().length > 200)
      return "La descripción no puede superar 200 caracteres.";
    return null;
  }
  function validatePrice(value) {
    if (value === "" || value === null || typeof value === "undefined")
      return "El precio es obligatorio.";
    const v = parseFloat(value);
    if (isNaN(v)) return "El precio debe ser un número.";
    if (v < 1 || v > 100) return "El precio debe estar entre 1 y 100.";
    return null;
  }
  function validateDuration(value) {
    if (value === "" || value === null || typeof value === "undefined")
      return "La duración es obligatoria.";
    const v = parseInt(value, 10);
    if (isNaN(v)) return "La duración debe ser un número entero.";
    if (v < 1 || v > 60) return "La duración debe estar entre 1 y 60 minutos.";
    return null;
  }
  function validateType(value) {
    if (!value || value.trim() === "")
      return "El tipo de plato es obligatorio.";
    return null;
  }

  // fast access to inputs
  const titleInput = form.querySelector('[name="title"]');
  const descrInput = form.querySelector('[name="description"]');
  const priceInput = form.querySelector('[name="price"]');
  const durInput = form.querySelector('[name="duration"]');
  const typeSelect = form.querySelector('[name="type"]');
  const fileInput = form.querySelector('[name="plateImage"]');

  // 
  // IMAGE PREVIEW / REMOVE / DRAG&DROP BEHAVIOR
  // 
  const dropArea = document.getElementById("plateImageDropArea"); // drag/drop container
  const previewContainer = document.getElementById("plateImagePreview"); // preview container (may include existing image)
  const removeExistingBtn = document.getElementById("removeExistingImageBtn"); // existing button in template (if any)
  const removeImageInput = document.getElementById("removeImageInput"); // hidden flag to notify server to remove existing image

  // previewImg variable: may come from HTML (existing image) or be created
  let previewImg = null;
  // look for any img inside previewContainer (existing image)
  if (previewContainer) {
    previewImg = previewContainer.querySelector("img");
  }

  function createPreviewElements() {
    // create img and button if they do not exist
    if (!previewContainer) return;
    if (!previewImg) {
      previewImg = document.createElement("img");
      previewImg.style.maxWidth = "150px";
      previewImg.className = "img-fluid rounded mb-2";
      previewContainer.appendChild(previewImg);
    }
    // if remove button does not exist inside preview, add it
    let btn = previewContainer.querySelector(".btn-remove-selected-image");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm btn-create btn-remove-selected-image";
      btn.textContent = "Eliminar imagen";
      btn.addEventListener("click", () => {
        // On remove: clear file input, hide preview and mark removeImage for editing
        if (fileInput) fileInput.value = "";
        if (previewImg) previewImg.src = "";
        previewContainer.classList.add("d-none");
        if (removeImageInput) removeImageInput.value = "true";
      });
      previewContainer.appendChild(btn);
    }
  }

  function showPreviewFromDataURL(dataURL) {
    if (!previewContainer) return;

    // 🔹 If the existing "remove old image" button exists, hide it
    if (removeExistingBtn) {
      removeExistingBtn.classList.add("d-none");
    }

    createPreviewElements();
    previewImg.src = dataURL;
    previewContainer.classList.remove("d-none");

    if (removeImageInput) removeImageInput.value = "false";
  }

  function handleSelectedFile(file) {
    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) {
      // not an image
      alert("El archivo seleccionado no es una imagen válida.");
      if (fileInput) fileInput.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      showPreviewFromDataURL(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  // file input change -> preview selected file
  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const f = fileInput.files && fileInput.files[0];
      if (f) {
        handleSelectedFile(f);
      } else {
        // if input is cleared - hide preview (if there is no existing image)
        // mark removeImageInput if editing
        if (removeImageInput && form.dataset.editing === "true") {
          removeImageInput.value = "true";
        }
      }
    });
  }

  // If template provided an existing "Remove image" button, wire it:
  if (removeExistingBtn) {
    removeExistingBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      // mark for removal on the server
      if (removeImageInput) removeImageInput.value = "true";
      // clear file input and hide preview
      if (fileInput) fileInput.value = "";
      if (previewImg) previewImg.src = "";
      // hide container or remove existing-image-preview element
      // prefer hiding container to preserve layout
      previewContainer.classList.add("d-none");
    });
  }

  // Drag & drop support
  if (dropArea) {
    ["dragenter", "dragover"].forEach((evt) => {
      dropArea.addEventListener(evt, (e) => {
        e.preventDefault();
        dropArea.classList.add("border-primary");
      });
    });
    ["dragleave", "drop"].forEach((evt) => {
      dropArea.addEventListener(evt, (e) => {
        e.preventDefault();
        dropArea.classList.remove("border-primary");
      });
    });
    dropArea.addEventListener("drop", (e) => {
      e.preventDefault();
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      // place file into fileInput
      if (fileInput) {
        // Create a DataTransfer to set fileInput.files (works in modern browsers)
        try {
          const dt = new DataTransfer();
          dt.items.add(f);
          fileInput.files = dt.files;
        } catch (err) {
          // fallback: cannot set files programmatically in some older browsers
          // still handle preview directly
        }
      }
      handleSelectedFile(f);
    });
  }

  // 
  // real-time listeners
  // 
  if (titleInput) {
    titleInput.addEventListener("input", () => {
      const err = validateTitle(titleInput.value);
      if (err) setFieldError(titleInput, err);
      else clearFieldError(titleInput);
    });
    titleInput.addEventListener("blur", () => {
      const err = validateTitle(titleInput.value);
      if (err) setFieldError(titleInput, err);
      else clearFieldError(titleInput);
    });
  }
  if (descrInput) {
    descrInput.addEventListener("input", () => {
      const err = validateDescription(descrInput.value);
      if (err) setFieldError(descrInput, err);
      else clearFieldError(descrInput);
    });
  }
  if (priceInput) {
    priceInput.addEventListener("input", () => {
      const err = validatePrice(priceInput.value);
      if (err) setFieldError(priceInput, err);
      else clearFieldError(priceInput);
    });
  }
  if (durInput) {
    durInput.addEventListener("input", () => {
      const err = validateDuration(durInput.value);
      if (err) setFieldError(durInput, err);
      else clearFieldError(durInput);
    });
  }
  if (typeSelect) {
    typeSelect.addEventListener("change", () => {
      const err = validateType(typeSelect.value);
      if (err) setFieldError(typeSelect, err);
      else clearFieldError(typeSelect);
    });
  }

  // keep your AJAX title-availability check (debounced)
  function debounce(fn, wait = 400) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }
  if (titleInput) {
    titleInput.addEventListener(
      "input",
      debounce(async (e) => {
        const value = e.target.value.trim();
        if (!value) return;
        try {
          const resp = await fetch(
            `/api/plates/check-title?title=${encodeURIComponent(value)}`
          );
          const data = await resp.json();
          if (!data.available) {
            setFieldError(titleInput, "Ya existe un plato con ese título");
          } else {
            // if current error is availability, clear it
            const fb =
              titleInput.parentElement.querySelector(".invalid-feedback");
            if (fb && fb.textContent === "Ya existe un plato con ese título")
              fb.textContent = "";
            titleInput.classList.remove("is-invalid");
          }
        } catch (err) {
          /* ignore */
        }
      }, 600)
    );
  }

  // Validate whole form before submit; return array of error messages (for modal) and mark fields
  function validateFormAll() {
    clearAllFieldErrors();
    const errorsList = [];

    const tErr = validateTitle(titleInput?.value || "");
    if (tErr) {
      setFieldError(titleInput, tErr);
      errorsList.push(tErr);
    }

    const dErr = validateDescription(descrInput?.value || "");
    if (dErr) {
      setFieldError(descrInput, dErr);
      errorsList.push(dErr);
    }

    const pErr = validatePrice(priceInput?.value);
    if (pErr) {
      setFieldError(priceInput, pErr);
      errorsList.push(pErr);
    }

    const durErr = validateDuration(durInput?.value);
    if (durErr) {
      setFieldError(durInput, durErr);
      errorsList.push(durErr);
    }

    const typeErr = validateType(typeSelect?.value);
    if (typeErr) {
      setFieldError(typeSelect, typeErr);
      errorsList.push(typeErr);
    }

    // file required only on creation (we detect editing via a hidden input or editing flag on form)
    const isEditing = !!form.dataset.editing && form.dataset.editing === "true";
    if (!isEditing) {
      if (!fileInput || (fileInput.files && fileInput.files.length === 0)) {
        const errMsg = "La imagen del plato es obligatoria.";
        if (fileInput) setFieldError(fileInput, errMsg);
        errorsList.push(errMsg);
      }
    }

    return errorsList;
  }

  // Intercept form submit (AJAX)
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    clearAllFieldErrors();

    const clientErrors = validateFormAll();
    if (clientErrors.length) {
      // show errors in modal and do not send to server
      modalTitle.textContent = "Errores en el formulario";
      const list = clientErrors.map((e) => `<li>${e}</li>`).join("");
      modalMessage.innerHTML = `<p>Corrige los siguientes errores:</p><ul class="text-start">${list}</ul>`;
      modalFooter.style.display = "flex";
      modalPrimaryBtn.textContent = "Volver al formulario";
      modalPrimaryBtn.removeAttribute("href");
      modalPrimaryBtn.onclick = () => bsModal.hide();
      bsModal.show();
      return;
    }

    // if there are no client-side errors, continue with your AJAX flow
    modalTitle.textContent = "Creando plato";
    spinner.style.display = "block";
    modalMessage.innerHTML = "";
    modalFooter.style.display = "flex";
    hideDefaultClose();
    modalPrimaryBtn.classList.remove("d-none");
    bsModal.show();

    const fd = new FormData(form);
    try {
      const resp = await fetch(form.action, {
        method: form.method || "POST",
        body: fd,
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Accept: "application/json",
        },
      });

      let data = null;
      const ct = resp.headers.get("content-type") || "";
      if (ct.includes("application/json")) data = await resp.json();
      else {
        const text = await resp.text();
        spinner.style.display = "none";
        modalTitle.textContent = resp.ok
          ? "Respuesta inesperada"
          : "Error servidor";
        const esc = (s) =>
          s.replace(
            /[&<>"']/g,
            (c) =>
              ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
              }[c])
          );
        modalMessage.innerHTML = `<pre style="white-space:pre-wrap; max-height:300px; overflow:auto;">${esc(
          text.slice(0, 2000)
        )}</pre>`;
        modalFooter.style.display = "block";
        modalPrimaryBtn.textContent = "Cerrar";
        modalPrimaryBtn.removeAttribute("href");
        modalPrimaryBtn.addEventListener("click", () => bsModal.hide(), {
          once: true,
        });
        return;
      }

      if (!resp.ok || data.success === false) {
        spinner.style.display = "none";
        const errors = data.errors || [];
        if (errors.length) {
          errors.forEach((e) => {
            if (e.param) {
              const field = form.querySelector(`[name="${e.param}"]`);
              if (field) setFieldError(field, e.msg || e.message || "Error");
            }
          });
          modalTitle.textContent = "Errores en el formulario";
          const errorList = errors
            .map((e) => `<li>${e.msg || e.message || "Error"}</li>`)
            .join("");
          modalMessage.innerHTML = `<p>Se han encontrado los siguientes errores:</p><ul class="text-start">${errorList}</ul>`;
          modalFooter.style.display = "block";
          modalPrimaryBtn.textContent = "Volver al formulario";
          modalPrimaryBtn.removeAttribute("href");
          modalPrimaryBtn.addEventListener("click", () => bsModal.hide(), {
            once: true,
          });
        } else {
          modalTitle.textContent = "Error";
          modalMessage.innerHTML = `<p>${
            data.error || "Error al procesar"
          }</p>`;
          modalFooter.style.display = "block";
          modalPrimaryBtn.textContent = "Cerrar";
          modalPrimaryBtn.removeAttribute("href");
        }
        return;
      }

      // success -> redirect to detail
      modalTitle.textContent = "Listo";
      spinner.style.display = "none";
      modalMessage.innerHTML = `<p>Plato creado correctamente. Redirigiendo...</p>`;
      modalFooter.style.display = "none";
      setTimeout(() => (window.location = data.redirect || "/"), 700);
    } catch (err) {
      console.error("AJAX create error", err);
      spinner.style.display = "none";
      modalTitle.textContent = "Error red";
      modalMessage.innerHTML =
        "<p>Error en la comunicación con el servidor.</p>";
      modalFooter.style.display = "flex";
      modalPrimaryBtn.textContent = "Cerrar";
      modalPrimaryBtn.removeAttribute("href");
      modalPrimaryBtn.addEventListener("click", () => bsModal.hide(), {
        once: true,
      });
    }
  });
});
