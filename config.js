var configuration = {
    "profiles": {
        "production": {
            // production
            "COUCHDB_URL":"https://app578498.heroku:NNbL2x3Bu5vGLgComPjWxxET@app578498.heroku.cloudant.com",
            "COUCHDB_DATABASE":"production",
            "SOLR_CORE":"/43ff5b432fb",

            // staging
            //"COUCHDB_URL":"https://chrondev:pikachu@chrondev.iriscouch.com",
            //"COUCHDB_DATABASE":"production",
            //"SOLR_CORE":"/3f534ff3ff0",

	    	"LOGGLY_INPUT_KEY": "4d40e1e2-ef31-491f-b844-8b83aa38b30c",
	    	"LOGGLY_SUBDOMAIN": "thechronicle",

            "SERVER_PORT":"4000",
            "ADMIN_USERNAME":"dean",
            "ADMIN_PASSWORD":"dean",

            "S3_BUCKET":"chron_bucket1",
            "REDIS_URL":"redis://redistogo:0235bf0a2db5e6cc087683952f60c59c@icefish.redistogo.com:9249/",
            "SOLR_HOST":"index.websolr.com",
            "SOLR_PORT":"80",
            "SOLR_PATH":"/solr",
            "S3_KEY":"AKIAJIH3MOVTAMXCFKXA",
            "S3_SECRET":"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"
        }
    },
    "activeConfigurationProfile":"production"
};

exports.getConfiguration = function() {
    try {
        return configuration;
    } catch(err) {
        return null;
    }
}
