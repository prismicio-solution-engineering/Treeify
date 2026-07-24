export interface ParentRef {
  id: string;
  fieldPath: string;
}

export interface TreeNode {
  id: string;
  title: string;
  type: string;
  uid: string | null;
  level: number | null;
  reachable: boolean;
  parents: ParentRef[];
  children: ParentRef[];
  path: string[];
}

export interface Edge {
  from: string;
  to: string;
  fieldPath: string;
  broken: boolean;
}

export interface RepoTree {
  repositoryName: string;
  editorBaseUrl: string;
  editorUrlTemplate: string;
  generatedAt: string;
  rootId: string | null;
  stats: {
    documentCount: number;
    nodeCount: number;
    edgeCount: number;
    maxLevel: number;
    orphanCount: number;
    multiParentCount: number;
    brokenLinkCount: number;
    cyclic: boolean;
  };
  nodes: TreeNode[];
  edges: Edge[];
}
