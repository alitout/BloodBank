const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin =
  require('html-webpack-plugin');

const apiBaseUrl =
  process.env.API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  '/api';

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/main.jsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    publicPath: '/',
    clean: true,
  },
  devServer: {
    port: 5173,
    historyApiFallback: true,
    hot: true,
    static: {
      directory: path.resolve(__dirname, 'public'),
      publicPath: '/',
    },
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:3000',
        changeOrigin: true,
        pathRewrite: { '^/api': '/api' }
      }
    ]
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] } }],
              ['@babel/preset-react', { runtime: 'automatic' }]
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource'
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource'
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      __API_BASE_URL__:
        JSON.stringify(apiBaseUrl)
    }),

    new HtmlWebpackPlugin({
      template: './index.html',
      filename: 'index.html',
      inject: 'body'
    })
  ],
  devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
  performance: {
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  }
};
