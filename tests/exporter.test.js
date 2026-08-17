import { describe, it, expect, beforeEach } from 'vitest';
import { Graph } from '../src/graph/Graph.js';
import { StageInputNode } from '../src/nodes/StageInputNode.js';
import { ChannelStripNode } from '../src/nodes/ChannelStripNode.js';
import { OutputBusNode } from '../src/nodes/OutputBusNode.js';
import { exportMixingStationJSON } from '../src/exporter/MixingStationExporter.js';
import { exportXAirSnapshot } from '../src/exporter/XAirOscExporter.js';
import { ConfigImporter } from '../src/exporter/ConfigImporter.js';

describe('Multi-Format Exporter & Importer', () => {
  let graph;

  beforeEach(() => {
    graph = new Graph();
  });

  it('exports valid Mixing Station JSON format', () => {
    const input = new StageInputNode({ id: 'in1', channelIndex: 1, name: 'Lead Vox', gain: 30, phantom: true });
    const strip = new ChannelStripNode({ id: 'strip1', channelIndex: 1, name: 'Lead Vox', rtnsw: true, fader: -3.5 });
    const mainPA = new OutputBusNode({ id: 'pa', busType: 'main_lr' });

    graph.addNode(input);
    graph.addNode(strip);
    graph.addNode(mainPA);

    const json = exportMixingStationJSON(graph);

    expect(json.format).toBe('MixingStationScene');
    expect(json.channels['0']).toBeDefined();
    expect(json.channels['0'].name).toBe('Lead Vox');
    expect(json.channels['0'].rtnsw).toBe(1);
    expect(json.channels['0'].preampGain).toBe(30);
    expect(json.channels['0'].phantom).toBe(true);
  });

  it('exports valid native XR18 OSC snapshot text format (.xair / .scn)', () => {
    const input = new StageInputNode({ id: 'in1', channelIndex: 1, name: 'Lead Vox', gain: 28, phantom: true });
    const strip = new ChannelStripNode({ id: 'strip1', channelIndex: 1, name: 'Lead Vox', rtnsw: true, fader: 0 });

    graph.addNode(input);
    graph.addNode(strip);

    const oscText = exportXAirSnapshot(graph);

    expect(oscText).toContain('# XAir18 state dump');
    expect(oscText).toContain('/ch/01/config "Lead Vox"');
    expect(oscText).toContain('/headamp/01 +28.0 ON');
    expect(oscText).toContain('/ch/01/preamp');
  });

  it('imports JSON scene configuration and rebuilds the graph nodes', () => {
    const testScene = {
      format: 'MixingStationScene',
      channels: {
        '0': { name: 'Lead Vox', preampGain: 32, phantom: true, rtnsw: 1, fader: -2 },
        '1': { name: 'Guitar', preampGain: 18, phantom: false, rtnsw: 1, fader: 0 }
      }
    };

    const importedGraph = ConfigImporter.importJSON(testScene);
    expect(importedGraph.nodes.size).toBeGreaterThan(0);

    const inputNode = Array.from(importedGraph.nodes.values()).find(n => n.category === 'input' && n.getProperty('channelIndex') === 1);
    expect(inputNode).toBeDefined();
    expect(inputNode.getProperty('gain')).toBe(32);
    expect(inputNode.getProperty('phantom')).toBe(true);
  });
});
