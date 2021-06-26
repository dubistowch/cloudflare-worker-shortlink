const path = require('path')

module.exports = {
    context: __dirname,
    target: "webworker",
    entry: "./index.js",
    mode: "production",
    module: {
        rules: [
            {
                test: /\.html$/i,
                exclude: /node_modules/,
                use: {
                  loader: 'html-loader'
                }
            },
        ],
    }
}