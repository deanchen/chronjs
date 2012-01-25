/* require internal modules */
var config = require('../thechronicle_modules/config');
var api = require('../thechronicle_modules/api/lib/api');
var s3 = require('../thechronicle_modules/api/lib/s3');
var globalFunctions = require('../thechronicle_modules/global-functions');

var async = require('async');

var FAKE_WORDS = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipisicing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut',
    'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi'
];

var IMAGES = [
    {
        name: 'Duke.jpg',
        url: 'http://collegesportsnation.com/ipad-wallpapers/duke-university-ipad-wallpapers/duke-university-ipad-wallpaper.jpg',
        type: 'image/jpg'
    },
    {
        name: 'CoachK.jpg',
        url: 'http://community.statesmanjournal.com/blogs/hoophead/files/2011/03/saldc5-5yre4xzu7s52wfyvj0k_original.jpg',
        type: 'image/jpg'
    },
    {
        name: 'Google.jpg',
        url: 'http://www.toptechreviews.net/wp-content/uploads/2010/12/google_logo.jpg',
        type: 'image/jpg'
    }
];

var WORDS_FOR_BODY = 70;
var WORDS_FOR_TITLE = 4;
var WORDS_FOR_AUTHOR = 2;
var WORDS_FOR_TEASER = 7;
var NUM_ARTICLES = 25;

var ARTICLES_PER_LAYOUT_GROUP = 4;

var TAXONOMY = null;

// holds the IDs of the articles, once they have been found
var articleIDs = [];

config.init(function(err) {
    if(err) {
        console.log(err);
    }
    else if(!config.isSetUp()) {
	    console.log('You must run server.js to set up config options before you can generate an environment');
    }
    else if(config.get('COUCHDB_URL').indexOf("heroku") != -1 || config.get('COUCHDB_URL').indexOf("cloudant") != -1) {
        console.log("You can't create an environment using the production config options. Recommend use of db server chrondev.iriscouch.com");
    }
    else {
        TAXONOMY = config.get('TAXONOMY');
        delete(TAXONOMY["has"]); // extra key added to taxonomy that shouldn't be there

        console.log('creating environment...this could take a few minutes');

        // TODO: add image code    
        async.waterfall([
            function(callback) {
                api.init(callback);
            },
            function(callback) {
                s3.init(callback);
            },
            function(callback) {
    //            console.log("creating database...");
            
                // delete old version of db and then create it again to start the db fresh            
                api.recreateDatabase('dsfvblkjeiofkjd',callback);
            },
            function(callback) {
                console.log("creating search index...");
               
                // delete all articles for this db in the search index to start the index fresh
                api.search.removeAllDocsFromSearch(function(err) {
                    callback(err);
                });
            },
            function(callback) {
                console.log('creating image originals and versions...');
                createImages(callback);
            },
            function(images, callback) {
                console.log("populating site with fake articles...");
                addFakeArticles(images, callback);
            },
            function(callback) {
                console.log("creating layouts...");
                createLayoutGroups(callback);
            },
            function(callback) {
                console.log('environment created!');
                callback(null);
            }],
            function(err) {
                  if (err) console.log(err);
            }
        );
    }
});

function _getCropFunc(img, newImage, imgTypes, key) {
    return function (cb) {
        api.image.createCroppedVersion(img.name,imgTypes[key].width,imgTypes[key].height,0,0,imgTypes[key].width,imgTypes[key].height, function(err, result) {
           console.log(result);
           newImage[key] = result._versionAdded;
           cb(null);
        });
    };
}

function createImage(img, callback) {
    var origId;
    var newImage = {};

    async.waterfall([     
        function(callback) {
            globalFunctions.downloadUrlToPath(img.url, img.name, callback);
        },
        function(callback) {
            api.image.createOriginalFromFile(img.name, img.type, true, callback);
        },
        function(result, url, callback) {
            var imgTypes = config.get('IMAGE_TYPES');

            var functions = [];
            for(var key in imgTypes) {
                functions.push(_getCropFunc(img, newImage, imgTypes, key));
            }
 
            async.series(functions, callback);
        }
    ],
    function(err, res) {
        console.log(newImage);
        callback(err, newImage);
    });
}

function createImages(topCallback) {
    async.map(IMAGES, createImage, topCallback);
}

function addFakeArticles(images, callback) {
    var fakeArticles = [];

    for(var i = 0; i < NUM_ARTICLES; i ++) {
        var article = {};
        article.title = generateSentence(WORDS_FOR_TITLE);
        article.body = generateSentence(WORDS_FOR_BODY);
        article.authors = [generateSentence(WORDS_FOR_AUTHOR)];
        article.teaser = generateSentence(WORDS_FOR_TEASER);
        article.type = "article";
        article.taxonomy = generateTaxonomy();
        article.images = images[getRandomNumber(images.length)];
        
        fakeArticles[i] = article;
    }

    async.forEachSeries(fakeArticles, function(article, cb) {
        console.log("adding article with title: '" + article.title + "'...");
        
        api.addDoc(article, function(err, url, articleID) {
            if(err) console.log("article could not be added - " + err);
            else {
                console.log("article with url: '" + url + "' added.");
                articleIDs.push(articleID)
            }
            cb();
        });
    },
    callback);
}

function createLayoutGroups(callback) {
    var layoutGroups = api.group.getLayoutGroups();    
    var layoutPages = Object.keys(layoutGroups);

    async.forEachSeries(layoutPages,
        function(layoutPage, cb) {
            console.log('generating layout for ' + layoutPage);
            
            var namespace = layoutGroups[layoutPage].namespace;
            var groups = layoutGroups[layoutPage].groups;
            
            async.forEachSeries(groups,
                function(group, cb2) {
                    console.log('generating layout for ' + layoutPage + ' group ' + group);
                    
                    var articleIDsForThisGroup = []
                    for(var i = 0; i < ARTICLES_PER_LAYOUT_GROUP; i ++) {
                        var id = null;
                        while(true) {
                            id = articleIDs[getRandomNumber(articleIDs.length)];
                            
                            if(articleIDsForThisGroup.indexOf(id) == -1) break;
                        }                        
                        articleIDsForThisGroup.push(id);
                    }

                    var numAdded = 1;
                    async.forEachSeries(articleIDsForThisGroup,
                        function(id, cb3) {
                            api.group.add(namespace, group, id, numAdded, function(err) {
                                if(err) console.log(err);
                                else numAdded ++;
                                cb3();
                            });
                        },
                        cb2
                    );
                },
                cb
            );
        },
        callback
    );
}

function generateSentence(numWords) {
    var string = "";
    
    for(var i = 0; i < numWords; i ++) {
        if(i != 0) {
            string = string + " ";
        }
        string = string + FAKE_WORDS[getRandomNumber(FAKE_WORDS.length)];
    }

    return string;
}

function generateTaxonomy() {
    var taxonomy = [];
    var taxonomyLevelTree = TAXONOMY;
    
    taxonomyLevelTree = taxonomyLevelTree[getRandomNumber(Object.keys(taxonomyLevelTree).length)];
    taxonomy[0] = Object.keys(taxonomyLevelTree)[0];

    var i = 1;
    while(true) {       
        taxonomyLevelTree = taxonomyLevelTree[taxonomy[i-1]];
        
        if(Object.keys(taxonomyLevelTree).length == 0) break;
        
        taxonomyLevelTree = taxonomyLevelTree[getRandomNumber(Object.keys(taxonomyLevelTree).length)];
        taxonomy[i] = Object.keys(taxonomyLevelTree)[getRandomNumber(Object.keys(taxonomyLevelTree).length)];
        i ++;
    }

    return taxonomy;
}

function getRandomNumber(exclusiveMax) {
    return Math.floor(Math.random()*exclusiveMax);
}
