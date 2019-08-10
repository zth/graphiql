import { editor, KeyCode, KeyMod } from 'monaco-editor';

import {
  GraphQLSchema,
  buildClientSchema,
  IntrospectionQuery,
  getIntrospectionQuery,
} from 'graphql';

import 'whatwg-fetch';

import {
  onChangeQuery,
  setupQueryEditor,
  setupVariablesEditor,
} from 'monaco-graphql';

const exampleQuery = `fragment SpeciesItem on Species {
  language
  name
  averageHeight
  averageLifespan
}

fragment StarshipItem on Starship {
  name
  maxAtmospheringSpeed
  length
  hyperdriveRating
}

fragment FilmWithSpecies on Film {
  species(skip: $speciesSkip) {
    ...SpeciesItem
  }
}

fragment FilmWithShips on Film {
  starships(skip: $speciesSkip) {
    ...StarshipItem
  }
}

query NamedQuery($filmSkip: Int!, $speciesSkip: Int!) {
  films: allFilms(skip: $filmSkip) {
    title
    ...FilmWithSpecies
    ...FilmWithShips
  }
}`;

const exampleVariables = `{
  "speciesSkip": 5
}`;
class GraphQLIdeExample {
  url: string;
  queryModel: editor.ITextModel;
  resultsModel: editor.ITextModel;
  variablesModel: editor.ITextModel;
  schema?: GraphQLSchema;
  queryEditor: editor.IStandaloneCodeEditor;
  resultsEditor: editor.IStandaloneCodeEditor;
  variablesEditor: editor.IStandaloneCodeEditor;
  introspectionJSON?: IntrospectionQuery;
  constructor(url: string = 'https://swapi.graph.cool') {
    this.queryModel = editor.createModel(exampleQuery, 'graphql');
    this.variablesModel = editor.createModel(exampleVariables, 'json');
    this.resultsModel = editor.createModel('', 'json');

    this.queryEditor = editor.create(
      document.getElementById('container-query') as HTMLElement,
      {
        model: this.queryModel,
      },
    );

    this.variablesEditor = editor.create(
      document.getElementById('container-variables') as HTMLElement,
      {
        model: this.variablesModel,
      },
    );
    this.resultsEditor = editor.create(
      document.getElementById('container-results') as HTMLElement,
      {
        model: this.resultsModel,
        wordWrap: 'on',
      },
    );
    this.url = url;

    this.queryModel.onDidChangeContent(
      async (_event: editor.IModelContentChangedEvent) => {
        const { valid } = await onChangeQuery({
          model: this.queryModel,
          schema: this.schema as GraphQLSchema,
        });
        if (valid) {
          await this.runOperation();
        }
      },
    );
    const runAction: editor.IActionDescriptor = {
      id: 'run-op',
      label: 'Run Operation',
      keybindings: [KeyMod.CtrlCmd | KeyCode.Enter],
      run: async () => {
        await this.runOperation();
      },
    };
    this.queryEditor.addAction(runAction);
    this.variablesEditor.addAction(runAction);
    window.addEventListener('resize', this.onResize);
  }
  runOperation = async () => {
    const data = await fetch(this.url, {
      method: 'POST',
      body: JSON.stringify({
        query: this.queryModel.getValue(),
        variables: this.variablesModel.getValue(),
      }),
      headers: { 'content-type': 'application/json' },
    });
    const { data: result, errors } = await data.json();
    this.resultsModel.setValue(JSON.stringify(result || errors, null, 2));
  };
  onResize = () => {
    this.queryEditor.layout();
    this.variablesEditor.layout();
    this.resultsEditor.layout();
  };
  loadSchema = async () => {
    const schema = await fetch(this.url, {
      method: 'POST',
      body: JSON.stringify({
        query: getIntrospectionQuery(),
      }),
      headers: { 'content-type': 'application/json' },
    });
    const result = (await schema.json()) as { data: IntrospectionQuery };
    this.introspectionJSON = result.data;
    this.schema = buildClientSchema(this.introspectionJSON);
    setupQueryEditor(this.schema);
    await setupVariablesEditor(
      this.schema,
      this.queryModel,
      this.variablesModel,
    );
  };
}
const queryEditorInstance = new GraphQLIdeExample();

(async () => await queryEditorInstance.loadSchema())();
