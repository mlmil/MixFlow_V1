import { RULES } from './rules.js';

export class RoutingLinter {
  static lint(graph) {
    const diagnostics = [];

    // Reset error / warning states on all nodes
    graph.nodes.forEach(node => {
      node.hasError = false;
      node.hasWarning = false;
      node.diagnostics = [];
    });

    // Run each rule
    Object.values(RULES).forEach(rule => {
      rule.check(graph, diagnostics);
    });

    // Tag nodes with diagnostics
    diagnostics.forEach(diag => {
      const node = graph.getNode(diag.nodeId);
      if (node) {
        node.diagnostics.push(diag);
        if (diag.severity === 'error') node.hasError = true;
        if (diag.severity === 'warning') node.hasWarning = true;
      }
    });

    graph.emit('diagnosticsUpdated', diagnostics);
    return diagnostics;
  }
}
