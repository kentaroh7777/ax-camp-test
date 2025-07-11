const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    'background/service-worker': './src/background/service-worker.ts',
    'content-scripts/gmail': './src/content-scripts/gmail/gmail-content-script.ts',
    'content-scripts/discord': './src/content-scripts/discord/discord-content-script.ts',
    'content-scripts/line': './src/content-scripts/line/line-content-script.ts',
    'popup/popup': './src/components/popup/PopupApp.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'manifest.json',
          to: 'manifest.json'
        },
        {
          from: 'public',
          to: '.'
        }
      ]
    })
  ],
  devtool: 'cheap-module-source-map'
};