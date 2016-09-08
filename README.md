# Mangostana

[![npm version](https://badge.fury.io/js/mangostana.svg)](https://badge.fury.io/js/mangostana)
[![Github All Releases](https://img.shields.io/github/downloads/Emiya0306/mongoose-mangostana/total.svg?maxAge=2592000)](https://github.com/Emiya0306/mangostana)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg?maxAge=2592000)](https://github.com/Emiya0306/mangostana)

A simple database process framework based on mongoose to deal with documents relationship.

** **

## Installation

The easiest way to get started is with npm package:

```bash
npm install --save mangostana
```

## Quick start

How to use it?

> Usage

```javascript
const mangostana = require('mangostana')

mongoose.connect('mongodb://localhost/test')
mangostana(mongoose)

const User = mongoose.model('user', { name: String })
const Article = mongoose.model('article', { title: String, content: String })

const user1 = new User({ name: 'user1' })
const user2 = new User({ name: 'user2' })
const user3 = new User({ name: 'user2' })
const article = new Article({ title: 'article', content: 'content' })

let user1Result, articleResult, user2Result, user3Result

Promise
    .all([
        user1.save(),
        article.save(),
        user2.save(),
        user3.save()
    ])
    .then((result) => {
        user1Result = result[0]
        articleResult = result[1]
        user2Result = result[2]
        user3Result = result[3]

        return user1Result.link(articleResult)  // link two document
    })
    .then(() => {
        return user1Result.getRelation('articles', {title: 'article'})
    })
    .then((relatedArticle) => {
        console.log('relatedArticle', relatedArticle)
    })
    .then(() => {
        return Promise.all([
            user1Result.link(user2Result).as('friends', true),
            user1Result.link(user3Result).as('friends', true)
        ])
    })
    .then((friends) => {
        return user1Result.getRelation('friends')
    })
    .then((friend) => {
        console.log('friend', friend)
    })
```

## API

### mangostana(mongoose)

Amount the mangostana to mongoose.

*Example*

```javascript
mangostana(mongoose)
```

### instance1.link(instance2)

Link the relation between two documents. If you want to link the same model between two documents, you need to use link.as.

*Example*

```javascript
userResult.link(articleResult)
```

### instance1.link(instance2).as('relationship', isTwo-way?)

Link the relation between two documents use special relationship. Just like user and user can be friends, also can be single friend.

*Example*

```javascript
userResult.link(articleResult).as('myFavourite', true)
```

### instance1.unlink(instance2)

Unlink the relation between two documents. If there are no relation, it will return null.

*Example*

```javascript
userResult.unlink(articleResult)
```

### instance1.getRelation('ModelName(plural)', {your query})

Get related documents which is related with this document. You can use your own query.

*Example*

```javascript
userResult.getRelation('friends')
userResult.getRelation('articles', {title: 'article'})
```

## In future

- Add `user.getRelation('friends').with('children').with('toys')`.

# Tests
Test can be run simply

```bash
npm run test
```

#Contributing
If you have any idea, please tell us. Welcome to give me pull request.
Enjoy