import { languages, editor, Position }from 'monaco-editor';

import {
  GraphQLSchema,
  DocumentNode,
  typeFromAST,
  NamedTypeNode,
  GraphQLNamedType,
  parse,
  OperationDefinitionNode,
} from 'graphql';

/**
 * Provided a schema and a document, produces a `variableToType` Object.
 */
export function collectVariables(
  schema: GraphQLSchema,
  documentAST: DocumentNode,
) {
  const variableToType = Object.create(null);
  // Todo: use visitWithTypeInfo damnn riki
  documentAST.definitions.forEach(definition => {
    if (definition.kind === 'OperationDefinition') {
      const variableDefinitions = definition.variableDefinitions;
      if (variableDefinitions) {
        variableDefinitions.forEach(({ variable, type }) => {
          const inputType = typeFromAST(schema, type as NamedTypeNode);
          if (inputType) {
            variableToType[variable.name.value] = inputType;
          }
        });
      }
    }
  });
  return variableToType;
}

/**
 * Provided previous "queryFacts", a GraphQL schema, and a query document
 * string, return a set of facts about that query useful for GraphiQL features.
 *
 * If the query cannot be parsed, returns undefined.
 */
export function getQueryFacts(
  schema: GraphQLSchema,
  documentStr: string,
): void | {
  variableToType: { [type: string]: GraphQLNamedType };
  operations: OperationDefinitionNode[];
} {
  if (!documentStr) {
    return;
  }

  let documentAST;
  try {
    documentAST = parse(documentStr);
  } catch (e) {
    return;
  }

  const variableToType = schema ? collectVariables(schema, documentAST) : null;

  // Collect operations by their names.
  const operations: OperationDefinitionNode[] = [];
  documentAST.definitions.forEach(def => {
    if (def.kind === 'OperationDefinition') {
      operations.push(def);
    }
  });

  return { variableToType, operations };
}

// Given a variableToType object, a source text, and a JSON AST, produces a
// - list of CodeMirror annotations 
// + monaco diagnostics
//  for any variable validation errors.
// function validateVariables(
//   schema: GraphQLSchema,
//   queryModel: editor.ITextModel,
//   variablesModel: editor.ITextModel,
// ) {
//   const facts = getQueryFacts(schema, queryModel.getValue());
//   const diagnostics: editor.IMarkerData[] = [];
//   if (facts) {
//     const { variableToType, operations } = facts;
//     console.log(variableToType);
//   }

//   const formattedDiagnostics: monaco.editor.IMarkerData[] = diagnostics.map(
//     d => ({
//       startLineNumber: d.range.start.line + 1,
//       endLineNumber: d.range.end.line + 1,
//       startColumn: d.range.start.character + 1,
//       endColumn: d.range.end.character + 1,
//       message: d.message,
//       severity: monaco.MarkerSeverity.Error,
//     }),
//   );
//   if (diagnostics.length < 1) {
//     valid = true;
//   }

//   variablesAST.members.forEach(member => {
//     const variableName = member.key.value;
//     const type = variableToType[variableName];
//     if (!type) {
//       errors.push(
//         lintError(
//           editor,
//           member.key,
//           `Variable "$${variableName}" does not appear in any GraphQL query.`,
//         ),
//       );
//     } else {
//       validateValue(type, member.value).forEach(([node, message]) => {
//         errors.push(lintError(editor, node, message));
//       });
//     }
//   });

//   monaco.editor.setModelMarkers(variablesModel, 'linter', []);
// }

async function provideVariablesCompletionItems({
  // position,
  // model,
  queryModel,
  schema,
}: {
  position: Position;
  model: editor.ITextModel;
  queryModel: editor.ITextModel;
  schema: GraphQLSchema;
}): Promise<languages.CompletionList> {
  const facts = getQueryFacts(schema, queryModel.getValue());
  const suggestions: languages.CompletionItem[] = [];
  if (facts) {
    const { variableToType } = facts;
    Object.keys(variableToType).map(variable => {
      // @ts-ignore
      suggestions.push({
        label:
          variableToType[variable].description || variableToType[variable].name,
        insertText: variable,
        kind: 3,
      });
    });
  }
  return {
    suggestions,
  };
}

export class VariablesJSONProvider implements languages.CompletionItemProvider {
  schema: GraphQLSchema;
  queryModel: editor.ITextModel;
  constructor(
    schema: GraphQLSchema, 
    queryModel: editor.ITextModel
  ) {
    this.schema = schema;
    this.queryModel = queryModel;
  }
  public provideCompletionItems(
    model: editor.ITextModel,
    position: Position,
  ) {
    return provideVariablesCompletionItems({
      position,
      queryModel: this.queryModel,
      model,
      schema: this.schema,
    });
  }
}

export async function setupVariablesEditor(
  schema: GraphQLSchema,
  queryModel: editor.ITextModel,
  variablesModel: editor.ITextModel,
) {
  const jsonCompletionProvider = new VariablesJSONProvider(schema, queryModel);

  languages.registerCompletionItemProvider(
    'json',
    jsonCompletionProvider,
  );

  languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemas: [
      {
        uri: variablesModel.uri.toString(), // id of the first schema
        schema: {
          type: 'object',
          properties: {
            speciesSkip: {
              type: 'string',
            },
            filmsSkip: {
              type: 'string',
            },
          },
          required: ['speciesSkip', 'filmSkip'],
        },
      },
    ],
  });
}
