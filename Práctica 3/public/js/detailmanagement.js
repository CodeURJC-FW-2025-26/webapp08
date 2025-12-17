document.addEventListener('DOMContentLoaded', function(){
  const btn = document.getElementById('btnDeletePlate');
  if (!btn) return;

  const plateId = btn.getAttribute('data-plate-id');
  const modalEl = document.getElementById('globalModal');
  const bsModal = new bootstrap.Modal(modalEl);
  const modalTitle = document.getElementById('globalModalTitle');
  const modalMessage = document.getElementById('modalMessage');
  const modalFooter = document.getElementById('globalModalFooter');
  const modalPrimaryBtn = document.getElementById('modalPrimaryBtn');
  const modalSpinner = document.getElementById('modalSpinner');
  const modalHeaderClose = document.getElementById('modalHeaderClose');
  const modalDefaultClose = document.getElementById('modalDefaultClose');

  function hideDefaultClose(){ modalHeaderClose?.classList.add('d-none'); modalDefaultClose?.classList.add('d-none'); }
  function restoreDefaultClose(){ modalHeaderClose?.classList.remove('d-none'); modalDefaultClose?.classList.remove('d-none'); }

  btn.addEventListener('click', function(e){
    e.preventDefault();
    modalTitle.textContent = 'Confirmar borrado';
    modalMessage.innerHTML = `<p>¿Estás seguro que deseas borrar este plato? Esta acción no se puede deshacer.</p>`;
    modalFooter.style.display = 'flex';
    hideDefaultClose();

    // Botón BORRAR (primario)
    modalPrimaryBtn.textContent = 'Borrar';
    modalPrimaryBtn.classList.remove('d-none');
    modalPrimaryBtn.classList.remove('btn-primary');
    modalPrimaryBtn.classList.add('btn-danger');

    // Botón CANCELAR (secundario)
    modalDefaultClose.classList.remove('d-none');
    modalDefaultClose.textContent = 'Cancelar';
    modalDefaultClose.classList.remove('btn-secondary');
    modalDefaultClose.classList.add('btn-outline-secondary');

    // Handler one-shot para el botón primario
    modalPrimaryBtn.onclick = async function(ev){
      // mostrar spinner
      modalSpinner.style.display = 'block';
      modalPrimaryBtn.classList.add('disabled');
      modalDefaultClose.classList.add('d-none');

      try {
        const resp = await fetch(`/plates/${plateId}`, {
          method: 'DELETE',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
          }
        });

        modalSpinner.style.display = 'none';
        modalPrimaryBtn.classList.remove('disabled');

        if (!resp.ok) {
          const data = await resp.json().catch(() => ({ error: 'Plato no encontrado' }));

          modalSpinner.style.display = 'none';
          modalTitle.textContent = 'Plato no disponible';
          modalMessage.innerHTML = `
            <p>${data.error || 'Este plato ya no existe o ha sido eliminado.'}</p>
            <p>Serás redirigido a la página principal.</p>
          `;

          // 🔥 ocultamos botón borrar
          modalPrimaryBtn.classList.add('d-none');

          // mostramos solo cancelar / cerrar
          modalDefaultClose.classList.remove('d-none');
          modalDefaultClose.textContent = 'Volver';

          // al cerrar → redirigir
          modalDefaultClose.onclick = () => {
            window.location = '/';
          };

          modalFooter.style.display = 'flex';
          return;
        }


        const data = await resp.json();
        if (data.success) {
          // redirigir a / (puedes poner un mensaje corto antes)
          modalTitle.textContent = 'Borrado';
          modalMessage.innerHTML = `<p>${data.message || 'Plato eliminado. Redirigiendo...'}</p>`;
          modalFooter.style.display = 'none';
          setTimeout(()=> window.location = '/', 700);
        } else {
          modalTitle.textContent = 'Error';
          modalMessage.innerHTML = `<p>${data.error || 'Error al borrar'}</p>`;
          modalFooter.style.display = 'flex';
        }
      } catch(err) {
        console.error(err);
        modalSpinner.style.display = 'none';
        modalTitle.textContent = 'Error';
        modalMessage.innerHTML = `<p>Error de red: ${err.message}</p>`;
        modalFooter.style.display = 'flex';
      }
    };

    bsModal.show();
  });
});
