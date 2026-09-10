(() => {
  const reasons = {
    info: {
      label: 'More information required',
      message: order => `Hi ${order.tenant.split(' ')[0] || 'there'}, thanks for reporting the ${order.issue.toLowerCase()}. We need a little more information before we can arrange the repair. Please reply with any additional details or photos that may help us assess the issue.`
    },
    duplicate: {
      label: 'Duplicate request',
      message: order => `Hi ${order.tenant.split(' ')[0] || 'there'}, thanks for your message. This maintenance request appears to duplicate an existing job, so we will continue tracking it under the existing work order rather than create another contractor dispatch.`
    },
    approval: {
      label: 'Owner approval required',
      message: order => `Hi ${order.tenant.split(' ')[0] || 'there'}, thanks for reporting the ${order.issue.toLowerCase()}. We are unable to dispatch this job yet because owner approval is required. We will update you once approval has been received.`
    },
    incorrect: {
      label: 'Not proceeding from this request',
      message: order => `Hi ${order.tenant.split(' ')[0] || 'there'}, thanks for your maintenance request. We are not proceeding with contractor dispatch from this request at this stage. Please contact the property management team if you need clarification or believe the issue still requires action.`
    },
    other: {
      label: 'Other',
      message: order => `Hi ${order.tenant.split(' ')[0] || 'there'}, thanks for your maintenance request. We are not proceeding with contractor dispatch at this stage. Please contact the property management team if you need further information.`
    }
  };

  let selectedReason = 'info';

  function ensureModal() {
    if (document.getElementById('rejectOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'rejectOverlay';
    overlay.className = 'reject-overlay hidden';
    overlay.innerHTML = `
      <div class="reject-panel" role="dialog" aria-modal="true" aria-labelledby="rejectTitle">
        <div class="reject-panel-head">
          <div>
            <h2 id="rejectTitle">Reject work order</h2>
            <p>The contractor will not be contacted. A tenant update will be sent instead.</p>
          </div>
          <button id="rejectCloseBtn" class="reject-close" type="button" aria-label="Close">×</button>
        </div>

        <span class="reject-label">Reason</span>
        <div class="reject-reasons">
          ${Object.entries(reasons).map(([key, value]) => `<button class="reject-reason${key === selectedReason ? ' active' : ''}" type="button" data-reject-reason="${key}">${value.label}</button>`).join('')}
        </div>

        <label class="reject-label" for="rejectTenantMessage">Tenant message</label>
        <textarea id="rejectTenantMessage" class="reject-message"></textarea>

        <div class="reject-actions">
          <button id="rejectCancelBtn" class="secondary" type="button">Cancel</button>
          <button id="rejectConfirmBtn" class="primary reject-send" type="button">Reject & notify tenant</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    document.querySelectorAll('[data-reject-reason]').forEach(button => {
      button.addEventListener('click', () => {
        selectedReason = button.dataset.rejectReason;
        document.querySelectorAll('[data-reject-reason]').forEach(b => b.classList.toggle('active', b === button));
        if (current) $('rejectTenantMessage').value = reasons[selectedReason].message(current);
      });
    });

    $('rejectCloseBtn').addEventListener('click', closeRejectModal);
    $('rejectCancelBtn').addEventListener('click', closeRejectModal);
    $('rejectConfirmBtn').addEventListener('click', confirmReject);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeRejectModal();
    });
  }

  function openRejectModal() {
    if (selectedIndex == null || !workOrders[selectedIndex]) return;
    ensureModal();
    selectedReason = 'info';
    document.querySelectorAll('[data-reject-reason]').forEach(button => button.classList.toggle('active', button.dataset.rejectReason === selectedReason));
    $('rejectTenantMessage').value = reasons[selectedReason].message(workOrders[selectedIndex]);
    $('rejectOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeRejectModal() {
    const overlay = document.getElementById('rejectOverlay');
    if (overlay) overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  async function confirmReject() {
    if (selectedIndex == null || !workOrders[selectedIndex]) return;
    const index = selectedIndex;
    const order = workOrders[index];
    const tenantMessage = $('rejectTenantMessage').value.trim();
    if (!tenantMessage) return toast('Tenant message is required.');

    const button = $('rejectConfirmBtn');
    button.disabled = true;
    button.textContent = 'Rejecting & notifying…';

    try {
      if (order.syncing && pendingSyncs[index]) await pendingSyncs[index];
      const synced = workOrders[index];
      if (synced.syncError && !synced.demoFallback) throw new Error('Work order was not saved. Try again.');

      if (synced.backend) {
        const response = await fetch('/api/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workOrderId: synced.workOrderId,
            reason: reasons[selectedReason].label,
            tenantMessage
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || data.details || 'Reject failed');
      }

      workOrders[index].uiStatus = 'rejected';
      workOrders[index].rejectionReason = reasons[selectedReason].label;
      workOrders[index].rejectionMessage = tenantMessage;
      workOrders[index].editedTenantMessage = tenantMessage;
      current = workOrders[index];
      renderQueue();
      closeRejectModal();
      $('rejectedView').querySelector('p').textContent = 'Tenant notified. No contractor message was sent.';
      show('rejectedView');
    } catch (error) {
      toast(error.message || 'Could not reject work order');
    } finally {
      button.disabled = false;
      button.textContent = 'Reject & notify tenant';
    }
  }

  const rejectButton = document.getElementById('rejectBtn');
  if (rejectButton) {
    rejectButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      openRejectModal();
    }, true);
  }
})();
