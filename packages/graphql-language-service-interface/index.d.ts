declare module 'graphql-language-service-interface' {
  import { GraphQLSchema, ValidationContext } from 'graphql';
  import { Position } from 'graphql-language-service-utils'
  import { Hover } from 'vscode-languageserver'
  export type CustomValidationRule = (context: ValidationContext) => Object;
  export type TokenPattern = string | ((char: string) => boolean) | RegExp;
  export interface CharacterStream {
    getStartOfToken: () => number;
    getCurrentPosition: () => number;
    eol: () => boolean;
    sol: () => boolean;
    peek: () => string | null;
    next: () => string;
    eat: (pattern: TokenPattern) => string | void;
    eatWhile: (match: TokenPattern) => boolean;
    eatSpace: () => boolean;
    skipToEnd: () => void;
    skipTo: (position: number) => void;
    match: (
      pattern: TokenPattern,
      consume: boolean | null,
      caseFold: boolean | null,
    ) => Array<string> | boolean;
    backUp: (num: number) => void;
    column: () => number;
    indentation: () => number;
    current: () => string;
  }

  export interface GLSDiagnostic {
    severity: number;
    message: string;
    source: string;
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
  }
  export function getDiagnostics(
    query: string,
    schema?: GraphQLSchema,
    customRules?: Array<CustomValidationRule>,
    isRelayCompatMode?: boolean,
  ): Promise<Array<GLSDiagnostic>>;

  export function getHoverInformation(
    schema: GraphQLSchema,
    queryText: string,
    cursor: Position,
    contextToken?: ContextToken,
  ): Hover['contents'];

  export type Token = {
    kind: string;
    value: string;
  };
  export interface Range {
    start: Position;
    end: Position;
    containsPosition: (position: Position) => boolean;
  }

  export type Rule = {
    style?: string;
    match?: (token: Token) => boolean;
    update?: (state: State, token: Token) => void;
    separator?: string | Rule;
    isList?: boolean;
    ofRule?: Rule | string;
  };

  export type ParseRule =
    | ((token: Token, stream: CharacterStream) => string | null)
    | Array<Rule | string>;

  export type State = {
    level: number;
    levels?: Array<number>;
    prevState?: State;
    rule?: ParseRule;
    kind?: string;
    name?: string;
    type?: string;
    step: number;
    needsSeperator: boolean;
    needsAdvance?: boolean;
    indentLevel?: number;
  };
  export type ContextToken = {
    start: number;
    end: number;
    string: string;
    state: State;
    style: string;
  };
  export type CompletionItem = {
    label: string;
    kind?: number;
    detail?: string;
    documentation?: string | null;
    // GraphQL Deprecation information
    isDeprecated?: boolean | null;
    deprecationReason?: string | null;
  };
  export function getAutocompleteSuggestions(
    schema: GraphQLSchema,
    queryText: string,
    cursor: Position,
    contextToken?: ContextToken,
  ): Array<CompletionItem>;
}
