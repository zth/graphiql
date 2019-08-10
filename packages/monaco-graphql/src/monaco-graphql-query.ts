import { 
  editor, 
  languages, 
  Position, 
  CancellationToken, 
  MarkerSeverity
} from 'monaco-editor';

import { GraphQLSchema } from 'graphql';

import { Position as GraphQLPosition } from 'graphql-language-service-utils';

import {
  getHoverInformation,
  getDiagnostics,
  getAutocompleteSuggestions,
} from 'graphql-language-service-interface';

/**
 *  Copyright (c) 2019 GraphQL Contributors.
 *
 *  This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */


export function setupQueryEditor(schema: GraphQLSchema) {
  languages.registerHoverProvider('graphql', {
    async provideHover(
      model: editor.ITextModel,
      position: Position,
      token: CancellationToken,
    ) {
      return provideHoverInfo({
        position,
        model,
        schema,
        token,
      });
    },
  });
  languages.registerCompletionItemProvider('graphql', {
    async provideCompletionItems(model: editor.ITextModel, position: Position) {
      return provideCompletionItems({ position, model, schema });
    },
  });
}

export function onChangeQuery({
  model,
  schema,
}: {
  model: editor.ITextModel;
  schema: GraphQLSchema;
}) {
  return diagnoseQueryValue(model, schema);
}

export type ProviderItemInput = {
  position: Position;
  model: editor.ITextModel; // query or schema
  schema: GraphQLSchema;
  token?: CancellationToken;
};

export async function provideHoverInfo({
  position,
  model,
  schema
}: ProviderItemInput): Promise<languages.Hover> {
  const graphQLPosition = new GraphQLPosition(
    position.lineNumber - 1,
    position.column,
  );
  graphQLPosition.setCharacter(position.column);
  graphQLPosition.line = position.lineNumber - 1;
  const hoverInfo = getHoverInformation(
    schema,
    model.getValue(),
    graphQLPosition,
  );
  if (!hoverInfo) {
    return {
      contents: [],
    };
  }
  return {
    contents: [{ value: `${hoverInfo}` }],
  };
}

export async function provideCompletionItems({
  position,
  model,
  schema
}: ProviderItemInput): Promise<
  languages.ProviderResult<languages.CompletionList>
> {
  const graphQLPosition = new GraphQLPosition(
    position.lineNumber - 1,
    position.column - 1,
  );
  graphQLPosition.setCharacter(position.column - 1);
  graphQLPosition.line = position.lineNumber - 1;
  const suggestions = await getAutocompleteSuggestions(
    schema,
    model.getValue(),
    graphQLPosition,
  );
  // @ts-ignore wants range
  return {
    // TODO: possibly return different kinds of completion items?
    // TODO: (optionally?) show all completion items at first?
    suggestions: suggestions.map(s => ({
      label: s.label,
      insertText: s.label,
      kind: 3,
    })),
  };
}

const diagnoseQueryValue = async (
  model: editor.ITextModel, // query or schema
  schema: GraphQLSchema,
): Promise<{
  valid: boolean;
  formattedDiagnostics: editor.IMarkerData[];
  diagnostics: any[];
}> => {
  let valid = false;
  const diagnostics = await getDiagnostics(model.getValue(), schema);
  const formattedDiagnostics: editor.IMarkerData[] = diagnostics.map(
    d => ({
      startLineNumber: d.range.start.line + 1,
      endLineNumber: d.range.end.line + 1,
      startColumn: d.range.start.character + 1,
      endColumn: d.range.end.character + 1,
      message: d.message,
      severity: MarkerSeverity.Error,
    }),
  );
  if (diagnostics.length < 1) {
    valid = true;
  }
  editor.setModelMarkers(model, 'linter', formattedDiagnostics);

  return {
    valid,
    formattedDiagnostics,
    diagnostics,
  };
};
