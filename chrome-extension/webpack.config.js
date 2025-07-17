import path from 'path';
import { fileURLToPath } from 'url';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
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
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.GMAIL_CLIENT_ID': JSON.stringify(process.env.GMAIL_CLIENT_ID || ''),
      'process.env.GMAIL_CLIENT_SECRET': JSON.stringify(process.env.GMAIL_CLIENT_SECRET || ''),
      'process.env.PROXY_SERVER_URL': JSON.stringify(process.env.PROXY_SERVER_URL || 'http://localhost:3000')
    }),
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