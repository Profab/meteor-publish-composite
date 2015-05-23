Package.describe({
    name: "profab:rethink-publish-composite",
    summary: "Publish a set of related documents from multiple RethinkDB tables with a reactive 'join'.",
    version: "0.0.1",
    git: "https://github.com/Profab/meteor-rethink-publish-composite.git"
});

Package.on_use(function (api) {
    api.versionsFrom("METEOR@0.9.0");
    api.use("underscore", "server");
    api.add_files([
        "lib/doc_ref_counter.js",
        "lib/publication.js",
        "lib/subscription.js",
        "lib/publish_composite.js"
    ], "server");
});


/*Package.on_test(function(api) {
    api.use("reywood:publish-composite");
    api.use(["tinytest", "test-helpers"]);

    api.add_files([ "tests.js" ]);
});*/
