// Simple audit modal component for examples
export class AuditModal {
  constructor() {
    this.modal = null;
    this.isOpen = false;
    this.createModal();
  }

  createModal() {
    // Create modal HTML structure
    const modalHTML = `
      <div id="auditModal" class="audit-modal">
        <div class="audit-modal-content">
          <div class="audit-modal-header">
            <h3>📋 Audit History</h3>
            <span class="audit-modal-close">&times;</span>
          </div>
          <div class="audit-modal-body">
            <div id="auditTimeline" class="audit-timeline">
              <!-- Timeline content will be inserted here -->
            </div>
          </div>
        </div>
      </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('auditModal');

    // Add event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Close modal when clicking X
    const closeBtn = this.modal.querySelector('.audit-modal-close');
    closeBtn.addEventListener('click', () => this.close());

    // Close modal when clicking outside
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  async open(connectionName, tableName, primaryKeys, auditService) {
    this.isOpen = true;
    this.modal.classList.add('active');

    // Show loading state
    const timeline = document.getElementById('auditTimeline');
    timeline.innerHTML = this.createLoadingHTML();

    try {
      // Fetch audit data
      const auditResponse = await auditService.getTableAudit(
        connectionName,
        tableName,
        primaryKeys,
        { limit: 50, offset: 0 }
      );

      // Render timeline
      this.renderTimeline(auditResponse.results);
    } catch (error) {
      console.error('Failed to load audit data:', error);
      timeline.innerHTML = this.createErrorHTML(error.message);
    }
  }

  close() {
    this.isOpen = false;
    this.modal.classList.remove('active');
  }

  createLoadingHTML() {
    return `
      <div class="audit-loading">
        <div class="audit-skeleton">
          <div class="audit-skeleton-line"></div>
          <div class="audit-skeleton-line short"></div>
        </div>
        <div class="audit-skeleton">
          <div class="audit-skeleton-line"></div>
          <div class="audit-skeleton-line short"></div>
        </div>
        <div class="audit-skeleton">
          <div class="audit-skeleton-line"></div>
          <div class="audit-skeleton-line short"></div>
        </div>
      </div>
    `;
  }

  createErrorHTML(message) {
    return `
      <div class="audit-error">
        <div class="audit-error-icon">⚠️</div>
        <div class="audit-error-message">Failed to load audit history: ${message}</div>
      </div>
    `;
  }

  renderTimeline(auditData) {
    const timeline = document.getElementById('auditTimeline');

    if (!auditData || auditData.length === 0) {
      timeline.innerHTML = `
        <div class="audit-empty">
          <div class="audit-empty-icon">🕒</div>
          <div class="audit-empty-message">No audit history found for this row.</div>
        </div>
      `;
      return;
    }

    let html = '<div class="timeline">';
    
      auditData.forEach((record, index) => {
        const operation = this.getOperationTypeDisplay(record.operationType);
        const isFirstOfDay = index === 0 || 
          this.formatAuditDate(record.timestamp) !== this.formatAuditDate(auditData[index - 1]?.timestamp);

      // Parse changed fields
      let changedFields = {};
      try {
        if (record.changedFields && typeof record.changedFields === 'string') {
          changedFields = JSON.parse(record.changedFields);
        } else if (record.changedFields && typeof record.changedFields === 'object') {
          changedFields = record.changedFields;
        }
      } catch (error) {
        console.error('Failed to parse audit changedFields:', error);
      }

      const hasChanges = Object.entries(changedFields).length > 0;

      html += `
        <div class="timeline-item">
          <div class="timeline-bullet" style="background-color: ${operation.color}"></div>
          <div class="timeline-content">
            ${isFirstOfDay ? `
              <div class="timeline-date">${this.formatAuditDate(record.timestamp)}</div>
            ` : ''}
            <div class="timeline-header">
              <div class="timeline-action">
                <span class="timeline-operation ${operation.label.toLowerCase()}">${operation.label}</span>
                <span class="timeline-user">${this.getUserActionText(record.operationType, record.username)}</span>
              </div>
              <div class="timeline-time">${this.formatAuditTime(record.timestamp)}</div>
            </div>
            <div class="timeline-changes">
              ${!hasChanges ? `
                <div class="no-changes">No field changes recorded</div>
              ` : ''}
              ${Object.entries(changedFields).map(([fieldName, change]) => `
                <div class="field-change">
                  <span class="field-name">${fieldName}:</span>
                  ${change.before !== undefined ? `
                    <span class="field-before">${change.before_display || change.before || '(empty)'}</span>
                    <span class="field-arrow">→</span>
                  ` : ''}
                  <span class="field-after">${change.after_display || change.after || '(empty)'}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    timeline.innerHTML = html;
  }

  getOperationTypeDisplay(operationType) {
    switch (operationType) {
      case 1: return { label: 'INSERT', color: '#51cf66' };
      case 2: return { label: 'UPDATE', color: '#339af0' };
      case 3: return { label: 'DELETE', color: '#ff6b6b' };
      default: return { label: 'UNKNOWN', color: '#868e96' };
    }
  }

  getUserActionText(operationType, username) {
    const user = username || 'System';
    switch (operationType) {
      case 1: return `Created by ${user}`;
      case 2: return `Edited by ${user}`;
      case 3: return `Deleted by ${user}`;
      default: return `Modified by ${user}`;
    }
  }

  formatAuditTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  formatAuditDate(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    if (isToday) {
      return 'TODAY';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

