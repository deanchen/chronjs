var globalFunctions = require('../../global-functions');
var async = require('async');
var s3 = require('./s3.js');
var im = require('imagemagick');
var site = require('../../api/lib/site.js');

var VALID_EXTENSIONS = {};
VALID_EXTENSIONS['image/jpeg'] = 'jpg';
VALID_EXTENSIONS['image/png'] = 'png';
VALID_EXTENSIONS['image/gif'] = 'gif';

var IMAGE_TYPES = ['article', 'frontpage', 'slideshow'];
var CROP_SIZES = {
    thumbMedium: {
        width: 175,
        height: 115
    },
    thumbLarge: {
        width: 285,
        height: 184
    },
    thumbMediumSquare: {
        width: 183,
        height: 183
    },
    slideshow: {
        width: 636,
        height: 393
    }
};

var THUMB_DIMENSIONS = '100x100';

exports.bindPath = function(app) {
    return function() {
    app.get('/upload', site.checkAdmin,
        function(req, httpRes) {
            httpRes.render('upload', {
                layout: "layout-admin.jade"
            });
        });

        app.post('/upload', site.checkAdmin,
        function(req, httpRes) {
            var imageData = req.body.imageData;
            var imageName = req.body.imageName;
            // create a unique name for the image to avoid s3 blob collisions
            imageName = globalFunctions.randomString(8) + "-" + imageName;
            var thumbName = 'thumb_' + imageName;
            var imageType = req.body.imageType;
            var imageID = req.body.imageID;

            // use async library to call these functions in series, passing vars between them
            async.waterfall([
            function(callback) {
                if (!imageType in VALID_EXTENSIONS) {
                    callback("Invalid file type for " + imageName + ". Must be an image.");
                }
                else {
                    callback(null)
                }
            },
            function(callback) {
                var buf = new Buffer(imageData, 'base64');
                fs.writeFile(imageName, buf,
                function(err) {
                    callback(err);
                });
            },
            function(callback) {
                fs.readFile(imageName,
                function(err, data) {
                    callback(err, data);
                });
            },
            function(data, callback) {
                //put image in AWS S3 storage
                s3.put(data, imageName, imageType,
                function(err, url) {
                    callback(err, url);
                });
            },
            function(url, callback) {
                im.convert([imageName, '-thumbnail', THUMB_DIMENSIONS, thumbName],
                function(imErr, stdout, stderr) {
                    callback(imErr, url);
                });
            },
            function(url, callback) {
                fs.readFile(thumbName,
                function(err, data) {
                    callback(err, url, data);
                });
            },
            function(url, data, callback) {
                s3.put(data, thumbName, imageType,
                function(err, thumbUrl) {
                    callback(err, url, thumbUrl);
                });
            },
            function(url, thumbUrl, callback) {
                api.image.createOriginal(imageName, url, imageType, {
                    thumbUrl: thumbUrl,
                    photographer: 'None',
                    caption: 'None',
                    date: 'None',
                    location: 'None'
                },
                function(err, res) {
                    callback(err, res, url);
                });
            },
            //clean up files
            function(res, url, callback) {
                _deleteFiles([imageName, thumbName],
                function(err) {
                    callback(err, res, url);
                });
            }
            ],
            function(err, result, url) {
                if (err) {
                    globalFunctions.log(err);

                    if (typeof(err) == "object") {
                        err = "Error";
                    }

                    globalFunctions.sendJSONResponse(httpRes, {
                        error: err,
                        imageID: imageID
                    });
                }
                else {
                    globalFunctions.log('Image uploaded: ' + url + ' and stored in DB: ' + result);
                    globalFunctions.sendJSONResponse(httpRes, {
                        imageID: imageID,
                        imageName: imageName
                    });
                }
            });
        });

        app.get('/:imageName', site.checkAdmin,
        function(req, httpRes) {
            var imageName = req.params.imageName;
            api.image.getOriginal(imageName,
            function(err, orig) {
                if (err) globalFunctions.showError(httpRes, err);
                else {
                    api.docsById(orig.value.imageVersions,
                    function(err2, versions) {
                        if (err2) globalFunctions.showError(httpRes, err2);
                        else {
                            httpRes.render('admin/image', {
                                locals: {
                                    url: orig.value.url,
                                    name: imageName,
                                    id: orig.value._id,
                                    caption: orig.value.caption,
                                    location: orig.value.location,
                                    photographer: orig.value.photographer,
                                    date: orig.value.date,
                                    versions: versions,
                                    imageTypes: IMAGE_TYPES,
                                    article: req.query.article,
                                    cropSizes: CROP_SIZES
                                },
                                layout: "layout-admin.jade"
                            });
                        }
                    })
                }
            });
        });

        app.post('/info', site.checkAdmin,
        function(req, httpRes) {
            var data = {};
            var id = req.body.id;
            data.name = req.body.name;
            data.date = req.body.date;
            data.caption = req.body.caption;
            data.photographer = req.body.photographer;
            data.location = req.body.location;

            api.image.edit(id, data,
            function() {
                httpRes.redirect('/admin/image/' + data.name);
            });

        });

        app.post('/crop', site.checkAdmin,
        function(req, httpRes) {
            var imageName = req.body.name;
            var article = req.body.article;
            var geom = _getMagickString(
            parseInt(req.body.x1),
            parseInt(req.body.y1),
            parseInt(req.body.x2),
            parseInt(req.body.y2));
            var width = req.body.finalWidth;
            var height = req.body.finalHeight;
            var croppedName = '';

            async.waterfall([
            function(callback) {
                api.image.getOriginal(imageName, callback);
            },
            function(orig, callback) {
                croppedName = 'crop_' + orig.value.name;
                console.log(orig.value.url);
                _downloadUrlToPath(orig.value.url, orig.value.name,
                function(err) {
                    callback(err, orig);
                });
            },
            function(orig, callback) {
                im.convert([orig.value.name, '-crop', geom,
                '-resize', width.toString() + 'x' + height.toString(), croppedName],
                function(imErr, stdout, stderr) {
                    callback(imErr, orig);
                });
            },
            function(orig, callback) {
                fs.readFile(croppedName,
                function(err, buf) {
                    callback(err, orig, buf);
                });
            },
            function(orig, buf, callback) {
                var versionNum = orig.value.imageVersions.length + 1;
                var type = orig.value.contentType;
                var s3Name = versionNum + orig.value.name;
                s3.put(buf, s3Name, type,
                function(s3Err, url) {
                    callback(s3Err, orig, url);
                });
            },
            function(orig, url, callback) {
                api.image.createVersion(orig.id, url, width, height,
                function(err, res) {
                    callback(err, orig);
                });
            },
            function(orig, callback) {
                _deleteFiles([orig.value.name, croppedName],
                function(err) {
                    callback(err, orig);
                }
                );
            }
            ],
            function(err, orig) {
                if (err) {
                    globalFunctions.showError(httpRes, err);
                } else {
                    if (err) globalFunctions.showError(httpRes, err);
                    else if (article) httpRes.redirect('/admin/image/' + imageName + '?article=' + article);
                    else httpRes.redirect('/admin/image/' + imageName);
                }
            }
            );
        });
    }
}