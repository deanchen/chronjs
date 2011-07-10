/* declare global configuration variables */
var PORT = process.env.PORT || 4000;
var FRONTPAGE_GROUP_NAMESPACE = ['section'];

/* require npm nodejs modules */
var fs = require('fs');
var express = require('express');
require('express-namespace');
var stylus = require('stylus');
var async = require('async');

/* require internal nodejs modules */
var globalFunctions = require('./thechronicle_modules/global-functions');
var api = require('./thechronicle_modules/api/lib/api');
var admin = require('./thechronicle_modules/admin/lib/admin');

/* express configuration */
var app = express.createServer();

var publicDir = '/public';
var viewsDir = '/views';

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .set('compress', true);
}

// add the stylus middleware, which re-compiles when
// a stylesheet has changed, compiling FROM src,
// TO dest. dest is optional, defaulting to src

app.use(stylus.middleware({
    src: __dirname + viewsDir
  , dest: __dirname + publicDir
  , compile: compile
}));

app.set('view engine', 'jade');

// the middleware itself does not serve the static
// css files, so we need to expose them with staticProvider
app.use(express.static(__dirname + publicDir));
app.use(express.bodyParser());

app.set('views', __dirname + viewsDir);

app.error(function(err, req, res, next){
	res.send(500);
  	globalFunctions.log('ERROR: ' + err.stack);
});

var homeModel = JSON.parse(fs.readFileSync("sample-data/frontpage.json"));

/*** FRONTEND ***/
app.get('/', function(req, res) {
	res.render('index', {layout: false, model: homeModel});
});

// image upload test - should be moved out of server.js into admin area some point
app.get('/test-upload', function(req, res) {
	res.render('test-upload');
});

var s3 = require('./thechronicle_modules/admin/lib/s3');
fs = require('fs');
app.post('/test-upload', function(req, resMain) {
	var imageData = req.body.imagedata;
	var imageName = req.body.imagename;
	var imageType = req.body.imagetype;

	if(imageType != 'image/jpeg' && imageType != 'image/png' && imageType != 'image/gif') {
		var err = "Invalid file type for " + imageName + ". Must be an image.";
		console.log(err);
		globalFunctions.showError(resMain, err);
	}
	else {
		imageName = globalFunctions.randomString(8)+"-"+imageName;	
	
		var buf = new Buffer(imageData, 'base64');
		fs.writeFile('image2.png', buf, function(err) {
			fs.readFile('image2.png', function (err, data) {
		 		if (err) {
				 throw err;
				}
				s3.put(data, imageName, imageType, function(err, url) {
				 	if(err) { 
						console.log(err);
						globalFunctions.showError(resMain, err);
					}
				 	else {
				       		api.image.createOriginal(imageName, url, '', imageType, {
							photographer: 'None',
							caption: 'None',
						        date: 'None',
						        location: 'None'
						 },
						 function(err2, res) {
						 	if(err2) {
								globalFunctions.showError(resMain, err2);
								console.log(err2);
						        }
							else {
								console.log('Image uploaded: ' + url + ' and stored in DB: ' + res);
								resMain.render('test-upload');
							}
						 });
					}
			       });
			});
		});
	}
});

app.get('/article-list', function(req, http_res) {
    api.group.list(FRONTPAGE_GROUP_NAMESPACE, function(err, groups) {
        if(err) {
            globalFunctions.showError(http_res, err);
        } else {
            api.group.docs(FRONTPAGE_GROUP_NAMESPACE, groups, function(get_err, get_res) {
                if(get_err) {
                    globalFunctions.showError(http_res, get_err);
                } else {
                    http_res.render('main', {
                        locals: {
                            groups: get_res
                        }
                    });
                }
            });
        }
    });
});

app.get('/article/:url', function(req, http_res) {
    var url = req.params.url;
    
    api.docForUrl(url, function(err, doc) {
        if(err) {
            globalFunctions.showError(http_res, err);
        } else {
            http_res.render('article', {
                locals: {doc: doc}
            });
        }
    });
});

app.get('/article/:url/edit', function(req, http_res) {
    var url = req.params.url;
    api.docForUrl(url, function(err, doc) {
        if(err) {
            globalFunctions.showError(http_res, err);
        } else {
            api.group.list(['section'], function(group_err, groups) {
                if(group_err) {
                    globalFunctions.showError(http_res, group_err);
                } else {
                    http_res.render('admin/edit', {
                        locals: {doc: doc,
                                 groups: groups}
                    });
                }
            });
        }
    });
});
/*** !FRONTEND ***/

/*** ADMIN ***/
app = admin.init(app);

/*** !ADMIN ***/

console.log('Listening on port ' + PORT);
app.listen(PORT);
