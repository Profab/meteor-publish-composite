RethinkDB Publish Composite
========================

`Meteor.publishRethinkComposite(...)` provides a flexible way to publish a set of related documents from various RethinkDB tables using a reactive join. This makes it easy to publish a whole tree of documents at once. The published collections are reactive and will update when additions/changes/deletions are made.

This project differs from many other parent/child relationship mappers in its flexibility. The relationship between a parent and its children can be based on almost anything. For example, let's say you have a site that displays news articles. On each article page, you would like to display a list at the end containing a couple of related articles. You could use `rethinkPublishComposite` to publish the primary article, scan the body for keywords which are then used to search for other articles, and publish these related articles as children. Of course, the keyword extraction and searching are up to you to implement.

## What? Why? RethinkDB supports Joins

It does, but not for change-feeds, [yet](https://github.com/rethinkdb/rethinkdb/issues/3997). So this will only serve a temporary solution, where it'll publish all the necessary documents and then you'll be able to join the results on the client using [Reqlite](https://github.com/neumino/reqlite).

## Gotchas

Currently, this only supports RethinkDB tables where the primary key is `id`. Why must I say this? Because RethinkDB isn't like MongoDB in that it generates an `_id` (and only) primary key. In RethinkDB, when you create a table, you have the option to name your auto-generated primary key field. If you don't set it, it will default to `id`.

## Credit

The code was adapted from the `reywood:publish-composite` package. Thanks @reywood for your work!

## Installation

Right now this has not been published to Atmosphere yet, so just simply

```
$ cd /your/meteor/app/root/packages
$ git clone https://github.com/Profab/meteor-rethink-publish-composite.git
$ git checkout for-rethink
```

Eventually you can do:
```sh
$ meteor add profab:rethink-publish-composite
```

## Usage

This package defines one new Meteor function on the server:

#### Meteor.publishRethinkComposite(name, options)

Arguments

* **`name`** -- *string*

    The name of the publication

* **`options`** -- *object literal or callback function*

    An object literal specifying the configuration of the composite publication **or** a function that returns said object literal. If a function is used, it will receive the arguments passed to `Meteor.subscribe('myPub', arg1, arg2, ...)` (much like the `func` argument of [`Meteor.publish`](http://docs.meteor.com/#meteor_publish)). Basically, if your publication will take **no** arguments, pass an object literal for this argument. If your publication **will** take arguments, use a function that returns an object literal.

    The object literal must have a `find` property, and can optionally have `children` and `collectionName` properties. The `find` property's value must be a function that returns a **cursor** of your top level documents. The `children` property's value should be an array containing any number of object literals with this same structure. The `collectionName` property's value, if present, should be a string specifying an alternate collection name to publish the documents to (see [this blog post][blog-collection-name] for more details).

    ```javascript
    {
      find: function () {
        // Must return a cursor containing top level documents
      },
      children: [
        {
          find: function (topLevelDocument) {
            // Called for each top level document. Top level document is passed
            // in as an argument.
            // Must return a cursor of second tier documents.
          },
          children: [
            {
              find: function (secondTierDocument, topLevelDocument) {
                // Called for each second tier document. These find functions
                // will receive all parent documents starting with the nearest
                // parent and working all the way up to the top level as
                // arguments.
                // Must return a cursor of third tier documents.
              },
              children: [
               // Repeat as many levels deep as you like
              ]
            }
          ]
        },
        {
          find: function (topLevelDocument) {
            // Also called for each top level document.
            // Must return another cursor of second tier documents.
          }
          // The children property is optional at every level.
        }
      ]
    }
    ```


## Examples

### Example 1: A publication that takes **no** arguments.

First, we'll create our publication on the server.

```javascript
// Server
Meteor.publishRethinkComposite('topTenPosts', {
  find: function () {
    // Find top ten highest scoring posts
    return Posts.orderBy({ index: r.desc('score') }).limit(10);
  },
  children: [
    {
      find: function (post) {
        // Find post author. Even though we only want to return
        // one record here, we use "find" instead of "findOne"
        // since this function should return a cursor.
        return Authors.get(post.authorId);
      }
    },
    {
      find: function (post) {
        // Find top two comments on post
        return Comments.orderBy({ index: r.desc('score') }).filter({ postId: post.id }).limit(2);
      },
      children: [
        {
          find: function (comment, post) {
            // Find user that authored comment.
            return Users.get(comment.authorId);
          }
        }
      ]
    }
  ]
});
```

Next, we subscribe to our publication on the client.

```javascript
// Client
Meteor.subscribe('topTenPosts');
```

Now we can use the published data in one of our templates.

```handlebars
<template name="topTenPosts">
  <h1>Top Ten Posts</h1>
  <ul>
    {{#each posts}}
      <li>{{title}} -- {{postAuthor.profile.name}}</li>
    {{/each}}
  </ul>
</template>
```

```javascript
Template.topTenPosts.helpers({
  posts: function () {
    return Posts.run();
  },

  postAuthor: function () {
    // We use this helper inside the {{#each posts}} loop, so the context
    // will be a post object. Thus, we can use this.authorId.
    return Users.get(this.authorId).run();
  }
})
```

### Example 2: A publication that **does** take arguments

Note a function is passed for the `options` argument to `Meteor.publishComposite`.

```javascript
// Server
Meteor.publishRethinkComposite('postsByUser', function (userId, limit) {
  return {
    find: function () {
      // Find posts made by user. Note arguments for callback function
      // being used in query.
      return Posts.filter({ authorId: userId }).limit(limit);
    },
    children: [
      // This section will be similar to that of the previous example.
    ]
  }
});
```

```javascript
// Client
var userId = 1, limit = 10;
Meteor.subscribe('postsByUser', userId, limit);
```
