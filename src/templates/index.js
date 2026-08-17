import { TemplateManager } from './TemplateManager.js';
import { buildZeroLatencyIEM } from './zeroLatencyIEM.js';
import { buildCoverBandDirect } from './coverBandDirect.js';
import { buildCoverBandStems } from './coverBandStems.js';

export { TemplateManager };

export const TEMPLATES = {
  zeroLatencyIEM: {
    id: 'zeroLatencyIEM',
    name: '⚡ Zero-Latency Direct IEM + Ableton FOH Hybrid',
    description: 'Direct 0ms analog stage preamp split to IEMs (Aux 1-6) before Ableton, with live FX & tuning sent to FOH',
    build: buildZeroLatencyIEM
  },
  coverBandDirect: {
    id: 'coverBandDirect',
    name: 'Cover Band (5 Vox, Gtr, Keys 1:1 DAW Return)',
    description: 'Direct 1:1 Ableton Live processing return per channel with low latency autotune and amps',
    build: buildCoverBandDirect
  },
  coverBandStems: {
    id: 'coverBandStems',
    name: 'Cover Band (Subgroup Stem Returns)',
    description: 'Consolidates 5 vocals into Vocals Stem (USB 1/2) and instruments into Band Stem (USB 3/4)',
    build: buildCoverBandStems
  }
};
