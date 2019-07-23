import { CompilerOpts } from './types';
import { NodePath } from 'babel-traverse';
import * as t from 'babel-types';

export const runtimePath = 'continuations/dist/runtime';

/**
 * Produces a string that represents the source location of `path`.
 *
 * @param functionName the name of the enclosing function
 * @param path the path of the node whose location to return
 * @param opts compiler options, for the source map
 */
export function locationString(functionName: string | undefined,
    path: NodePath<t.Node>,
    opts: CompilerOpts): string {
  
    let result: string[] = [];
  
    const loc = t.isAssignmentExpression(path.node) ? path.node.right.loc :
      path.node.loc;
    // TODO(arjun): handleNew triggers this case
    if (loc !== undefined) {
      const line = opts.sourceMap.getLine(loc.start.line, loc.start.column);
      if (typeof line === 'number') {
        result.push(`Line ${line}`);
      }
    }
  
    if (typeof functionName === 'string') {
      result.push(`: in ${functionName}`);
    }
    return result.join('');
  }

  export type StopifyAnnotation = '@stopify flat';

export function isStopifyAnnotation(v: string): v is StopifyAnnotation {
  return /^@stopify flat$/.test(v);
}

export type FlatTag = 'NotFlat' | 'Flat';

export type FlatnessMark<T> = T & {
  mark: FlatTag
};