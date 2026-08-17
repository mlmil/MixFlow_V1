import { TemplateManager } from '../templates/TemplateManager.js';

export class TemplateEditorModal {
  static open({ activeTemplateId, graph, onTemplateChange }) {
    const overlay = document.createElement('div');
    overlay.classList.add('modal-overlay');

    const render = () => {
      const allTemplates = TemplateManager.getAllTemplates();
      const customTemplates = TemplateManager.getCustomTemplates();

      overlay.innerHTML = `
        <div class="modal-card" style="width: 620px; max-width: 95vw;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 15px;">✏️</span>
              <span style="font-weight: 700; font-size: 14px;">Template Manager & Editor</span>
            </div>
            <button class="modal-close-btn" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:16px;">✕</button>
          </div>

          <div class="modal-body" style="gap: 16px;">
            <!-- Save / Overwrite Active Rig Bar -->
            <div style="background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px; display: flex; flex-direction: column; gap: 8px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--color-vocal); text-transform: uppercase;">Save Current Canvas</span>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="text" class="node-input new-tmpl-name" placeholder="Enter template name (e.g., Friday Night Club Rig)" style="flex: 1;" />
                <button class="tool-btn primary btn-save-new" style="white-space: nowrap;">💾 Save New</button>
                <button class="tool-btn btn-overwrite-active" style="white-space: nowrap;" title="Save current canvas over the active template">🔄 Overwrite Current</button>
              </div>
            </div>

            <!-- Templates List -->
            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto;">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Template Library</span>
              ${Object.values(allTemplates).map(tmpl => `
                <div class="template-item-card" style="background: var(--bg-card); border: 1px solid ${tmpl.id === activeTemplateId ? 'var(--color-vocal)' : 'var(--border-subtle)'}; border-radius: var(--radius-sm); padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                  <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <strong style="font-size: 12px; color: var(--text-primary);">${tmpl.name}</strong>
                      ${tmpl.isBuiltin ? '<span style="font-size: 9px; font-family: var(--font-mono); background: var(--bg-input); padding: 1px 4px; border-radius: 3px; color: var(--text-muted);">BUILT-IN</span>' : '<span style="font-size: 9px; font-family: var(--font-mono); background: rgba(0, 229, 255, 0.15); color: var(--color-vocal); padding: 1px 4px; border-radius: 3px;">CUSTOM</span>'}
                      ${tmpl.id === activeTemplateId ? '<span style="font-size: 9px; font-family: var(--font-mono); color: var(--status-success); font-weight:700;">ACTIVE</span>' : ''}
                    </div>
                    <span style="font-size: 10.5px; color: var(--text-secondary);">${tmpl.description}</span>
                  </div>

                  <div style="display: flex; align-items: center; gap: 6px;">
                    <button class="tool-btn btn-load-tmpl" data-id="${tmpl.id}" style="font-size: 10.5px; padding: 4px 8px;">📂 Load</button>
                    <button class="tool-btn btn-clone-tmpl" data-id="${tmpl.id}" style="font-size: 10.5px; padding: 4px 8px;" title="Duplicate this template">📋 Clone</button>
                    ${!tmpl.isBuiltin ? `
                      <button class="tool-btn btn-rename-tmpl" data-id="${tmpl.id}" style="font-size: 10.5px; padding: 4px 8px;" title="Rename template">✏️ Rename</button>
                      <button class="tool-btn btn-delete-tmpl" data-id="${tmpl.id}" style="font-size: 10.5px; padding: 4px 8px; color: var(--status-error);" title="Delete custom template">🗑️</button>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Footer Backup Bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 12px;">
              <div style="display: flex; gap: 8px;">
                <button class="tool-btn btn-export-lib" style="font-size: 11px;">⬇️ Backup Templates JSON</button>
                <button class="tool-btn btn-import-lib" style="font-size: 11px;">⬆️ Restore Templates</button>
              </div>
              <button class="tool-btn btn-modal-done primary" style="font-size: 11px; padding: 6px 14px;">Done</button>
            </div>
          </div>
        </div>
      `;

      // Bind Modal Events
      overlay.querySelector('.modal-close-btn').addEventListener('click', () => overlay.remove());
      overlay.querySelector('.btn-modal-done').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

      // Save New
      overlay.querySelector('.btn-save-new').addEventListener('click', () => {
        const nameInput = overlay.querySelector('.new-tmpl-name');
        const name = nameInput.value.trim();
        if (!name) {
          alert('Please enter a template name.');
          return;
        }
        const newId = TemplateManager.saveCustomTemplate(name, 'Custom band rig', graph);
        if (onTemplateChange) onTemplateChange(newId);
        render();
      });

      // Overwrite Active
      overlay.querySelector('.btn-overwrite-active').addEventListener('click', () => {
        if (confirm('Overwrite active template with current canvas routing?')) {
          TemplateManager.overwriteTemplate(activeTemplateId, graph);
          alert('Template updated successfully!');
          render();
        }
      });

      // Load Template
      overlay.querySelectorAll('.btn-load-tmpl').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          if (onTemplateChange) onTemplateChange(id, true);
          overlay.remove();
        });
      });

      // Clone Template
      overlay.querySelectorAll('.btn-clone-tmpl').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const newName = prompt('Enter name for the cloned template:');
          if (newName) {
            const newId = TemplateManager.cloneTemplate(id, newName, graph);
            if (onTemplateChange) onTemplateChange(newId);
            render();
          }
        });
      });

      // Rename Custom Template
      overlay.querySelectorAll('.btn-rename-tmpl').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const newName = prompt('Enter new template name:');
          if (newName) {
            TemplateManager.renameTemplate(id, newName);
            if (onTemplateChange) onTemplateChange(id);
            render();
          }
        });
      });

      // Delete Custom Template
      overlay.querySelectorAll('.btn-delete-tmpl').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          if (confirm('Delete this custom template?')) {
            TemplateManager.deleteCustomTemplate(id);
            if (onTemplateChange) onTemplateChange('zeroLatencyIEM');
            render();
          }
        });
      });

      // Backup / Export Library
      overlay.querySelector('.btn-export-lib').addEventListener('click', () => {
        const json = TemplateManager.exportLibraryJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mixflow_templates_library.json';
        a.click();
        URL.revokeObjectURL(url);
      });

      // Restore / Import Library
      overlay.querySelector('.btn-import-lib').addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (evt) => {
            const ok = TemplateManager.importLibraryJSON(evt.target.result);
            if (ok) {
              alert('Templates library imported successfully!');
              render();
            } else {
              alert('Could not parse template library JSON.');
            }
          };
          reader.readAsText(file);
        };
        fileInput.click();
      });
    };

    render();
    document.body.appendChild(overlay);
  }
}
