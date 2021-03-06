var util = require('../../util');
var config = require('../../config');
var log = require('../../log');
var async = require('async');
var fs = require('fs');
var api = require('../../api');
var _ = require("underscore");
var errs = require('errs');

var VALID_EXTENSIONS = {};
VALID_EXTENSIONS['image/jpeg'] = 'jpg';
VALID_EXTENSIONS['image/png'] = 'png';
VALID_EXTENSIONS['image/gif'] = 'gif';

var THUMB_DIMENSIONS = '100x100';

exports.manage = function (req, httpRes) {
    var beforeKey = req.query.beforeKey;
    var beforeID = req.query.beforeID;
    var afterUrl = req.query.afterUrl || req.headers.referer || '/admin';
    var forDocument = req.query.forDocument;

    api.image.getOriginals(25, beforeKey, beforeID, function (err, origs) {
        httpRes.render('admin/image', {
            locals:{
                origs:origs,
                afterUrl:afterUrl,
                docId:forDocument,
                hasPrevious:(beforeID != null)
            }
        });
    });
};

exports.upload = function (req, res) {
    res.render('admin/image/upload');
};

exports.uploadData = function (req, httpRes) {
    var imageData = req.body.imageData;
    var imageName = req.body.imageName.replace(/[\s\#]/g, "_");
    // create a unique name for the image to avoid s3 blob collisions
    imageName = util.randomString(8) + "-" + imageName;
    var thumbName = 'thumb_' + imageName;
    var imageType = req.body.imageType;
    var imageID = req.body.imageID;

    async.waterfall([
        function (callback) {
            if (!imageType in VALID_EXTENSIONS) {
                callback("Invalid file type for " + imageName + ". Must be an image.");
            }
            else {
                callback(null);
            }
        },
        function (callback) {
            var buf = new Buffer(imageData, 'base64');
            fs.writeFile(imageName, buf, callback);
        },
        function (callback) {
            api.image.createOriginalFromFile(imageName, imageType, true, callback);
        }
    ], function (err, result, url) {
        if (err) {
            log.error(errs.merge(err, {message: 'Image error'}));

            if (typeof(err) == "object") {
                err = "Error";
            }

            httpRes.send({error:err, imageID:imageID});
        }
        else {
            log.info('Image uploaded: ' + url + ' and stored in DB: ' + result);
            httpRes.send({imageID:imageID, imageName:imageName});
        }
    });
};

exports.articles = function (req, httpRes) {
    var id = req.query.id;
    var func = api.image.docsForVersion;
    if(req.query.orig && req.query.orig == '1')
        func = api.image.docsForOriginal;
                        
    func(id, function(err, res) {
        httpRes.send(res);
    });
};

exports.deleteImage = function (req, httpRes) {
    var id = req.query.id;
    if(req.query.orig && req.query.orig == '1') {
        api.image.deleteOriginal(id, function(err, res) {
            var ret = (err != null);
            httpRes.send({ok: ret});
        });
    } else {
        api.image.deleteVersion(id, true, function(err, res) {
            var ret = (err != null);
            httpRes.send({ok: ret});
        });
    }
};

exports.renderImage = function (req, httpRes, next) {
    var imageName = req.params.imageName; //get image name from req
    api.image.getOriginal(imageName, function (err, orig) {
        if (err) next(err);
        else {
            api.docsById(orig.value.imageVersions, function (err, versions) {
                if (err) next(err);
                else {
                    var imageTypes = api.image.IMAGE_TYPES;
                    httpRes.render('admin/image/image', {
                        locals: {
                            url:orig.value.url,
                            name:imageName,
                            id:orig.value._id,
                            caption:orig.value.caption,
                            location:orig.value.location,
                            photographer:orig.value.photographer,
                            date:orig.value.date,
                            versions:versions,
                            imageTypes:Object.keys(imageTypes),
                            afterUrl:req.query.afterUrl,
                            docId:req.query.docId,
                            imageDetails:imageTypes
                        }
                    });
                }
            });
        }
    });
};

exports.info = function (req, httpRes) {
    var id = req.body.id; //assign id from req
    var afterUrl = req.body.afterUrl;
    var docId = req.body.docId;

    var data = {};
    data.name = req.body.name; //fills entries of data from req
    data.caption = req.body.caption;
    data.photographer = req.body.photographer;
    data.location = req.body.location;

    // make sure date stays numeric so it can be sorted correctly
    data.date = parseInt(req.body.date, 10);
    if(isNaN(data.date)) data.date = req.body.date;

    api.image.edit(id, data, function () {  //passes the recently create "id" and "data" and an anonymous function to image.edit, which calls another function from db
        if (docId)
            if (afterUrl) httpRes.redirect('/admin/image/' + data.name + '?afterUrl=' + afterUrl + '&docId=' + docId);
        else httpRes.redirect('/admin/image/' + data.name + '?docId=' + docId);
        else httpRes.redirect('/admin/image/' + data.name);
    });
};

exports.crop = function (req, httpRes, next) {
    var imageName = req.body.name;
    var afterUrl = req.body.afterUrl;
    var docId = req.body.docId;
    var width = req.body.finalWidth;
    var height = req.body.finalHeight;

    if(req.body.x1 < 0 || req.body.y1 < 0) {
        next("Image is too small for this version size");
    }
    else {
        api.image.createCroppedVersion(imageName, width, height, req.body.x1, req.body.y1, req.body.x2, req.body.y2, function (err, orig) {
            if (err) next(err);
            else {
                if (docId)
                    if (afterUrl) httpRes.redirect('/admin/image/' + imageName + '?afterUrl=' + afterUrl + '&docId=' + docId);
                else httpRes.redirect('/admin/image/' + imageName + '?docId=' + docId);
                else httpRes.redirect('/admin/image/' + imageName);
            }
        });
    }
};

exports.removeImageFromDoc = function (req, res, next) {
    var imageId = req.params.imageId;
    var docId = req.query.fromDoc;   
    var afterUrl = req.query.afterUrl || req.headers.referer || '/admin';

    api.image.removeVersionFromDocument(docId, null, imageId, function(err, doc) {
        if (err) next(err);
        else res.redirect(afterUrl);
    });
};

exports.addImageToDoc = function (req, res, next) {
    var afterUrl = req.body.afterUrl || '/admin';
    
    api.image.addVersionsToDoc(req.body.docId, req.body.original, req.body.imageVersionId, req.body.imageType, function (err) {
        if (err) next(err);
        else res.redirect(afterUrl);
    });
};
