var path = require('path');

const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
var libraryName = 'markdown-components';

const loaders = [
  {
    test: /(\.jsx|\.js)$/,
    loader: 'babel-loader',
    exclude: /(node_modules|bower_components)/,
    query: {
      presets: ['es2015'],
    }
  },
  {
    test: /(\.jsx|\.js)$/,
    loader: 'eslint-loader',
    exclude: /node_modules/
  }
];

var webConfig = {
  target: 'web',
  entry: path.resolve(__dirname, 'src/index.js'),
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: libraryName + '.min.js',
    library: libraryName,
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: { loaders },
  plugins: [new UglifyJSPlugin({})]
};


var nodeConfig = {
  target: 'web',
  entry: path.resolve(__dirname, 'src/index.js'),
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: libraryName + '.js',
    library: libraryName,
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: { loaders }
};

module.exports = [webConfig, nodeConfig];
