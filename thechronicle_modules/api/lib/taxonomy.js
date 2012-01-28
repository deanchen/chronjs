var taxonomy = exports;

var _ = require('underscore');
var async = require('async');
var config = require('../../config');
var db = require('../../db-abstract');
var fs = require('fs');
var log = require('../../log');


// get all document under given taxonomy path ex. ["News", "University"]
taxonomy.docs = function (taxonomyPath, limit, callback) {
    db.taxonomy.docs(taxonomyPath, limit, callback);
};

taxonomy.getTaxonomyTree = function(callback) {
    buildTree(config.get("TAXONOMY"), callback);
};

taxonomy.getTaxonomySubtree = function(taxonomyPath, callback) {
    taxonomy.getTaxonomyTree(function(err, tree) {
	if (err)
	    callback(err);
	else {
	    taxonomyPath.forEach(function (section) {
		try {
		    tree = tree[section];
		} catch (err) {
		    tree = undefined;
		}
	    });
	    if (tree === undefined)
		callback("Taxonomy path not found: " + taxonomyPath);
	    else 
		callback(null, tree);
	}
    });
};

taxonomy.getParents = function(taxonomyPath, callback) {
    var parents = [];
    var taxonomyPath = _.clone(taxonomyPath);
    while (taxonomyPath.length > 1) {
        var parentName = taxonomyPath.pop();
        parents.push({path:'/' + taxonomyPath.join('/'), name:parentName});
    }
    callback(null, parents.reverse());
};

taxonomy.getChildren = function(taxonomyPath, callback) {
    var path = taxonomyPath.join('/');
    taxonomy.getTaxonomySubtree(taxonomyPath, function (err, tree) {
	if (err)
	    callback(err);
	else {
	    var children = _.map(tree, function (key, value) {
		var child = {};
		child[path + '/' + value] = value;
		return child;
	    });
	    callback(null, children);
	}
    });
};

taxonomy.getParentsAndChildren = function(taxonomyPath, callback) {
    async.series([
	function (cb) {
	    taxonomy.getParents(taxonomyPath, cb);
	},
	function (cb) {
	    taxonomy.getChildren(taxonomyPath, cb);
	}
    ], function (err, results) {
	if (err)
	    callback(err);
	else
	    callback(null, results[0], results[1]);
    });
};

taxonomy.getTaxonomyListing = function (callback) {
    taxonomy.getTaxonomyTree(function (err, tree) {
	var taxonomy = {};
	_.forEach(tree, function (value, key) {
	    var listing = {}, path = [key];
	    listing[JSON.stringify(path)] = key;
	    getTaxonomyListingHelper(value, listing, path, 1);
	    taxonomy[key] = listing;
	});
	callback(null, taxonomy);
    });
};

function buildTree(taxonomy, callback) {
    async.reduce(taxonomy, {},
		 function (tree, section, cb) {
		     // should only be one attribute in object
		     for (var key in section) {
			 buildTree(section[key], function (err, subtree) {
			     tree[key] = subtree;
			     cb(err, tree);
			 });
			 break;
		     }
		 },
		 function (err, tree) {
		     callback(err, tree);
		 });
}

function getTaxonomyListingHelper(tree, listing, path, depth) {
    _.forEach(tree, function (value, key) {
        var dashes = "";
        for (var i = 0; i < depth; i++)
	    dashes += "-";
	path.push(key);
	listing[JSON.stringify(path)] = dashes + "  " + key;
	getTaxonomyListingHelper(value, listing, path, depth + 1);
	path.pop();
    });
    return listing;
}