var admin = exports;

var adminApi = require('../../admin');
var api = require('../../api');
var log = require('../../log');


admin.index = function (req, res, next) {
    res.render('admin/index');
};

admin.newsletter = function (req, res, next) {
    api.newsletter.createNewsletter(function(err, campaignID) {
        if (err) next(err);
        else {
            res.render('admin/newsletter', {
                js: ['admin/newsletter?v=3'],
                locals: {campaignID: campaignID}
            });
        }
    });
};

admin.newsletterData = function(req, res, next) {
    var testEmail = req.body.testEmail;
    var campaignId = req.body.campaignID;
    adminApi.sendNewsletter(testEmail, campaignId, function (err) {
        if (err) res.send(err);
        else res.send("sent");
    });
};

admin.manage = function (req, res, next) {
    var db = api.getDatabaseName();
    var host = api.getDatabaseHost();
    var port = api.getDatabasePort() || "80";
    var db_url = 'http://' + host + ':' + port + '/_utils/document.html?' + db;

    var query = {};
    if (req.query.beforeKey) query.startkey = parseInt(req.query.beforeKey);
    if (req.query.beforeID) query.start_docid = req.query.beforeID;

    api.docsByDate(null, query, function (err, docs) {
        if (err) next(err);
        else res.render('admin/manage', {
            js: ['admin/manage?v=2'],
            locals:{
                docs:docs,
                hasPrevious:(req.query.beforeID != null),
                db_url: db_url
            }
        });
    });
};


admin.k4export = function (req, res, next) {
    res.render('admin/k4export', {
        locals:{
            failed:null,
            succeeded:null,
            taxonomy:null
        }
    });
};

admin.k4exportData = function (req, res, next) {
    adminApi.k4export(req.files.zip.path, function(err, results) {
        res.render('admin/k4export', {
	        css: ['css/msdropdown'],
            js: ['admin/k4export?v=7'],
            locals:{
                failed: results.k4.failed,
                succeeded: results.k4.success,
                taxonomy: results.taxonomy,
                imageData: results.images
	    }
        });
    });
};

admin.addArticle = function (req, res, next) {
    api.taxonomy.getTaxonomyListing(function (err, taxonomy) {
        res.render('admin/add', {
            locals:{
                groups:[],
                taxonomy:taxonomy
            }
        });
    });
};

admin.addArticleData = function (req, res, next) {
    api.addArticle(req.body.doc, function (err, url) {
        if (err) next(err);
        else res.redirect('/article/' + url);
    });
};

admin.editArticle = function (req, res, next) {
    var url = req.params.url;
    api.articleForUrl(url, function (err, doc) {
        if (err)
            next(err);
        else if (req.query.removeImage)
            api.image.removeVersionFromDocument(doc._id, null, req.query.removeImage, function(err, doc) {
                if (err) next(err);
                else res.redirect('/article/' + url + '/edit');
            });
        else
            api.taxonomy.getTaxonomyListing(function(err, taxonomy) {
                if (doc.authors)
                    doc.authors = doc.authors.join(", ");

                res.render('admin/edit', {
                    js:['admin/deleteArticle?v=2'],
                    locals:{
                        doc:doc,
                        groups:[],
                        images:doc.images || {},
                        url:url,
                        afterAddImageUrl: '/article/' + url + '/edit',
                        taxonomy:taxonomy
                    }
                });
            });
    });
};

admin.editArticleData = function (req, res, next) {
    adminApi.editArticle(req.body.doc, req.body.imageVersionId, function (err, url) {
        if (err) next(err);
        else res.redirect(req.body.afterUrl || ('/article/' + url));
    });
};

admin.image = adminApi.image;
admin.layout = adminApi.layout.renderLayout;