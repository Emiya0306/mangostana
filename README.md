# Mangostana

[![npm version](https://badge.fury.io/js/mangostana.svg)](https://badge.fury.io/js/mangostana)
[![Github All Releases](https://img.shields.io/github/downloads/mongoose/mongoose/total.svg?maxAge=2592000)](https://github.com/Emiya0306/mangostana)
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

const user = new User({ name: 'Hey! I\'m a foo!' })
const article = new Article({ title: 'article', content: 'content' })

let userResult, articleResult

Promise
    .all([
        user.save(),
        article.save()
    ])
    .then((result) => {
        userResult = result[0]
        articleResult = result[1]

        return userResult.link(articleResult)  // link two document
    })
    .then(() => {
        return userResult.getRelation('articles', {title: 'article'})
    })
    .then((relatedArticle) => {
        console.log(relatedArticle)
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

Link the relation between two documents. Now it is not support the documents which have the same model.

*Example*

```javascript
userResult.link(articleResult)
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
userResult.getRelation('articles', {title: 'article'})
```

## In future

- Add `user.link(user).as('friends')`, `user.unlink(user).as('friends')`.
- Add `user.getRelation('friends').with('children').with('toys')`.

# Tests
Test can be run simply

```bash
npm run test
```

#Contributing
If you have any idea, please tell us. Welcome to give me pull request.
Enjoy