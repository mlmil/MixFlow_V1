import { describe, it, expect } from 'vitest';
import { TEMPLATES } from '../src/templates/index.js';
import { RoutingLinter } from '../src/linter/RoutingLinter.js';

describe('Pre-Built Band Starter Templates', () => {
  it('loads Cover Band 1:1 DAW Return template with zero fatal linter errors', () => {
    const graph = TEMPLATES.coverBandDirect.build();
    expect(graph.nodes.size).toBeGreaterThan(10);
    expect(graph.connections.length).toBeGreaterThan(10);

    const diagnostics = RoutingLinter.lint(graph);
    const errors = diagnostics.filter(d => d.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('loads Cover Band Stems template cleanly', () => {
    const graph = TEMPLATES.coverBandStems.build();
    expect(graph.nodes.size).toBeGreaterThan(6);
    const diagnostics = RoutingLinter.lint(graph);
    const errors = diagnostics.filter(d => d.severity === 'error');
    expect(errors.length).toBe(0);
  });
});
