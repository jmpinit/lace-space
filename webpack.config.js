const path = require('path');

module.exports = {
  entry: './src/client/main.js',
  mode: 'development',
  devtool: 'eval-source-map',
  output: {
    path: path.resolve(__dirname, 'public/js/'),
    filename: 'app.js'
  }
};
