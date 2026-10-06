export type WebNode =
  | { kind: 'overview'; label: string; icon: string }
  | { kind: 'section'; label: string; icon: string; sectionIndex: string }
  | { kind: 'winner'; label: string; icon: string }
  | { kind: 'gallery'; label: string; icon: string }
  | { kind: 'videos'; label: string; icon: string }
  | { kind: 'wiki'; label: string; icon: string }

/** URL-safe identifier for a node, used in deep links (#/s/28/castaways). */
export function nodeSlug(node: WebNode): string {
  return node.kind === 'section'
    ? node.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : node.kind
}
