/*
 * GET home page.
 */
var fs = require('fs')

exports.index = function(req, res){
  res.writeHead(200, {'Content-Type': 'text/html'});
  var contents = fs.readFileSync("./public/index.html", "UTF-8");
  res.end(contents);
//  res.render('index');
};