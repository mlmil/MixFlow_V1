import { buildZeroLatencyIEM } from './zeroLatencyIEM.js';
import { buildCoverBandDirect } from './coverBandDirect.js';
import { buildCoverBandStems } from './coverBandStems.js';
import { Graph } from '../graph/Graph.js';
import { NodeRegistry } from '../nodes/NodeRegistry.js';

const STORAGE_KEY = 'mixflow_custom_templates';

export class TemplateManager {
  static getBuiltinTemplates() {
    return {
      zeroLatencyIEM: {
        id: 'zeroLatencyIEM',
        name: '⚡ Zero-Latency Direct IEM + Ableton FOH Hybrid',
        description: 'Direct 0ms analog stage preamp split to IEMs (Aux 1-6) before Ableton, with live FX & tuning sent to FOH',
        isBuiltin: true,
        build: buildZeroLatencyIEM
      },
      coverBandDirect: {
        id: 'coverBandDirect',
        name: 'Cover Band (5 Vox, Gtr, Keys 1:1 DAW Return)',
        description: 'Direct 1:1 Ableton Live processing return per channel with low latency autotune and amps',
        isBuiltin: true,
        build: buildCoverBandDirect
      },
      coverBandStems: {
        id: 'coverBandStems',
        name: 'Cover Band (Subgroup Stem Returns)',
        description: 'Consolidates 5 vocals into Vocals Stem (USB 1/2) and instruments into Band Stem (USB 3/4)',
        isBuiltin: true,
        build: buildCoverBandStems
      }
    };
  }

  static getCustomTemplates() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.warn('Could not read custom templates from localStorage:', e);
      return {};
    }
  }

  static getAllTemplates() {
    return {
      ...this.getBuiltinTemplates(),
      ...this.getCustomTemplates()
    };
  }

  static saveCustomTemplate(name, description, graph) {
    const id = `custom_${Date.now()}`;
    const customTemplates = this.getCustomTemplates();

    customTemplates[id] = {
      id,
      name,
      description: description || 'User custom template',
      isBuiltin: false,
      updatedAt: new Date().toISOString(),
      graphData: graph.toJSON()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(customTemplates));
    return id;
  }

  static overwriteTemplate(id, graph) {
    const customTemplates = this.getCustomTemplates();
    if (customTemplates[id]) {
      customTemplates[id].graphData = graph.toJSON();
      customTemplates[id].updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customTemplates));
      return true;
    }
    // If it's a builtin template, clone it as a custom template
    const builtins = this.getBuiltinTemplates();
    if (builtins[id]) {
      return this.saveCustomTemplate(`${builtins[id].name} (Edited)`, builtins[id].description, graph);
    }
    return false;
  }

  static renameTemplate(id, newName, newDescription) {
    const customTemplates = this.getCustomTemplates();
    if (customTemplates[id]) {
      customTemplates[id].name = newName;
      if (newDescription !== undefined) customTemplates[id].description = newDescription;
      customTemplates[id].updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customTemplates));
      return true;
    }
    return false;
  }

  static cloneTemplate(id, newName, graph) {
    const all = this.getAllTemplates();
    const source = all[id];
    const name = newName || (source ? `${source.name} (Copy)` : 'Cloned Template');
    const desc = source ? source.description : '';
    return this.saveCustomTemplate(name, desc, graph);
  }

  static deleteCustomTemplate(id) {
    const customTemplates = this.getCustomTemplates();
    delete customTemplates[id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customTemplates));
  }

  static loadTemplate(id) {
    const builtins = this.getBuiltinTemplates();
    if (builtins[id]) {
      return builtins[id].build();
    }

    const custom = this.getCustomTemplates()[id];
    if (custom && custom.graphData) {
      return Graph.fromJSON(custom.graphData, NodeRegistry);
    }

    return null;
  }

  static exportLibraryJSON() {
    return JSON.stringify(this.getCustomTemplates(), null, 2);
  }

  static importLibraryJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      const current = this.getCustomTemplates();
      const merged = { ...current, ...parsed };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return true;
    } catch (e) {
      console.error('Invalid template library JSON:', e);
      return false;
    }
  }
}
