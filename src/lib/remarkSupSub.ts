// Recognize only paired <sup>/<sub> inline tags. Other HTML stays subject to
// react-markdown's default handling; no raw HTML or attributes are enabled.
type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
};

function tag(node: MarkdownNode) {
  return node.type === 'html' ? /^<(\/)?(sup|sub)>$/i.exec(node.value || '') : null;
}

function format(nodes: MarkdownNode[]): MarkdownNode[] {
  const result: MarkdownNode[] = [];
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    const opening = tag(node);
    if (opening && !opening[1]) {
      const stack = [opening[2].toLowerCase()];
      let end = index + 1;
      for (; end < nodes.length; end++) {
        const boundary = tag(nodes[end]);
        if (!boundary) continue;
        const name = boundary[2].toLowerCase();
        if (!boundary[1]) stack.push(name);
        else {
          if (stack[stack.length - 1] !== name) break;
          stack.pop();
        }
        if (!stack.length) break;
      }
      if (!stack.length && end < nodes.length && tag(nodes[end])?.[1]) {
        const formatted = {
          type: opening[2].toLowerCase() === 'sup' ? 'superscript' : 'subscript',
          data: { hName: opening[2].toLowerCase() },
          children: format(nodes.slice(index + 1, end)),
        };
        result.push(formatted);
        index = end;
        continue;
      }
    }
    if (node.children) node.children = format(node.children);
    result.push(node);
  }
  return result;
}

export function remarkSupSub() {
  return (tree: MarkdownNode) => {
    if (tree.children) tree.children = format(tree.children);
  };
}
