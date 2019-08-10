const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin;
const { CheckerPlugin } = require('awesome-typescript-loader');
const isDev = process.env.NODE_ENV === 'development';

const config = {
  entry: isDev
    ? [
        'webpack-dev-server/client?http://localhost:9000', // bundle the client for webpack-dev-server and connect to the provided endpoint
        'webpack/hot/only-dev-server', // bundle the client for hot reloading, only- means to only hot reload for successful updates
        './example.ts', // the entry point of our app
      ]
    : './example.ts',
  context: path.resolve(__dirname, 'src'),
  mode: isDev ? 'development' : 'production',
  devtool: 'inline-source-map',
  resolve: {
    extensions: [
      '.mjs',
      '.js',
      '.jsx',
      '.tsx',
      '.ts',
      '.json',
      '.gql',
      '.graphql',
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist', 'bundle'),
    filename: 'example.js',
  },
  devServer: {
    hot: true,
    contentBase: path.join(__dirname, 'dist', 'bundle'),
    compress: true,
    port: 9000,
    allowedHosts: ['www.bob.autoparts.com', 'autoparts.com'],
  },
  module: {
    rules: [
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      },
      {
        test: /\.ts$/,
        include: /src/,
        exclude: /node_modules/,
        use: [{ loader: 'awesome-typescript-loader' }],
      },
      {
        test: /\.css$/i,
        use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
      },
    ],
  },
  plugins: [
    // new TsConfigPathsPlugin({ configFileName: "./tsconfig.json" }),
    new CheckerPlugin(),
    new MonacoWebpackPlugin({
      languages: ['graphql', 'json', 'markdown']
    }),
    new HtmlWebpackPlugin({
      title: 'Example GraphQL IDE',
      template: '../test/index.html',
      filename: 'index.html',
    }),
    new webpack.ContextReplacementPlugin(
      /graphql-language-service-interface[\\/]dist$/,
      new RegExp(`^\\./.*\\.js$`),
    ),
    new webpack.ContextReplacementPlugin(
      /graphql-language-service-utils[\\/]dist$/,
      new RegExp(`^\\./.*\\.js$`),
    ),
    new webpack.ContextReplacementPlugin(
      /graphql-language-service-parser[\\/]dist$/,
      new RegExp(`^\\./.*\\.js$`),
    ),
  ],
};
if (isDev) {
  config.plugins.push(new BundleAnalyzerPlugin());
}

module.exports = config;
