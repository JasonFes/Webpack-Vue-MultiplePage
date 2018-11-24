var path = require('path');
var webpack = require('webpack');
// 将样式提取到单独的 css 文件中，而不是打包到 js 文件或使用 style 标签插入在 head 标签中
var CleanWebpackPlugin = require('clean-webpack-plugin');
var MiniCssExtractPlugin = require('mini-css-extract-plugin');
var VueLoaderPlugin = require('vue-loader/lib/plugin');
// css、js压缩、优化插件
var UglifyJsPlugin = require('uglifyjs-webpack-plugin');
var OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

// 生成自动引用 js 文件的HTML
var HtmlWebpackPlugin = require('html-webpack-plugin');
var glob = require('glob');

var entries = getEntry('./source/**/*.js'); // 获得入口 js 文件
var chunks = Object.keys(entries);

module.exports = {
  entry: Object.assign(entries),
  output: {
    path: path.resolve(__dirname, 'Public'), // html, css, js 图片等资源文件的输出路径，将所有资源文件放在 Public 目录
    publicPath: '/Public/',                  // html, css, js 图片等资源文件的 server 上的路径
    filename: 'js/[name].[hash].js'         // 每个入口 js 文件的生成配置
  },
  resolve: {
    extensions: ['.js', '.vue'],
    alias: {
      'vue$': 'vue/dist/vue.esm.js' //完整版本的vue
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        // 使用提取 css 文件的插件，能帮我们提取 webpack 中引用的和 vue 组件中使用的样式
        use: [
          process.env.NODE_ENV !== 'production'
            ? 'vue-style-loader'
            : MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      },
      {
        // vue-loader，加载 vue 组件
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          extractCSS: true
        }
      },
      {
        test: /\.js$/,
        // 使用 es6 开发，这个加载器帮我们处理
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        // 图片加载器，较小的图片转成 base64
        loader: 'url-loader',
        query: {
          limit: 10000,
          name: './imgs/[name].[ext]?[hash:7]'
        }
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/[name].css'
    }),
    new VueLoaderPlugin(),
    new webpack.DllReferencePlugin({
      context: path.join(__dirname, '.'),  // 与DllPlugin中的那个context保持一致
      manifest: require('./Public/vendor-manifest.json')
    }),
  ],
  optimization: {
    splitChunks: {
      // cacheGroups: {
      //   vendors: {
      //     name: 'vendors',
      //     chunks: 'all',
      //     minChunks: chunks.length, 
      //   }
      // }
    }
  }
};

var prod = process.env.NODE_ENV === 'production';
module.exports.plugins = (module.exports.plugins || []);
if (prod) {
  module.exports.devtool = 'source-map';
  module.exports.plugins = module.exports.plugins.concat([
    new CleanWebpackPlugin([
      path.resolve(__dirname , './Public/js'),
      path.resolve(__dirname , './Public/css')
    ])
  ]);
  module.exports.optimization.minimizer = [
    new UglifyJsPlugin({ // 压缩js
      uglifyOptions: {
        compress: {
          warnings: false
        }
      },
      cache: true,
      parallel: true
    }),
    new OptimizeCSSAssetsPlugin({ // 压缩css
      cssProcessorOptions: {
        safe: true
      }
    })
  ]
} else {
  module.exports.devtool = 'eval-source-map';
  module.exports.output.publicPath = '/View/';
}

var pages = getEntry('./source/**/*.html');
for (var pathname in pages) {
  // 配置生成的 html 文件，定义路径等
  var conf = {
    filename: prod? '../Application/Home/View/' + pathname + '.html' : pathname + '.html', // html 文件输出路径
    template: pages[pathname], // 模板路径
    inject: true,              // js 插入位置
    minify: {
      removeComments: true,
      collapseWhitespace: false
    }
  };
  if (pathname in module.exports.entry) {
    conf.chunks = ['vendors', pathname];
    conf.hash = false;
  }
  // 需要生成几个 html 文件，就配置几个 HtmlWebpackPlugin 对象
  module.exports.plugins.push(new HtmlWebpackPlugin(conf));
}

// 根据项目具体需求，输出正确的 js 和 html 路径
function getEntry(globPath) {
  var entries = {},
    basename, tmp, pathname;

  glob.sync(globPath).forEach(function (entry) {
    basename = path.basename(entry, path.extname(entry));
    tmp = entry.split('/').splice(-3);
    pathname = tmp.splice(0, 1) + '/' + basename; // 正确输出 js 和 html 的路径
    entries[pathname] = entry;
  });
  console.log(entries);
  return entries;
}