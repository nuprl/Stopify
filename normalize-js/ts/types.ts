import * as traverse from '@babel/traverse';
import * as t from '@babel/types';

export type Visitor<S> = traverse.Visitor<S> & {
    ReferencedIdentifier?: traverse.VisitNode<S, t.Identifier>,
    BindingIdentifier?: traverse.VisitNode<S, t.Identifier>,
    // Scope: traverse.VisitNode<S, t.Scopable>
};