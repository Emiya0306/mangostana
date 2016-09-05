const mangostana = require('../')
const mongoose = require('mongoose')

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
        console.log('relatedArticle', relatedArticle)
    })
    .then(() => {
        return userResult.link(articleResult).as('friends', true)
    })
    .then((friends) => {
        console.log('friends', friends)
    })