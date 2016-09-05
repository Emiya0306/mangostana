const mangostana = require('../')
const mongoose = require('mongoose')

mongoose.connect('mongodb://localhost/test')
mangostana(mongoose)

const User = mongoose.model('user', { name: String })
const Article = mongoose.model('article', { title: String, content: String })

const user1 = new User({ name: 'Hey! I\'m a foo!' })
const user2 = new User({ name: 'Hey! I\'m a bar!' })
const article = new Article({ title: 'article', content: 'content' })

let user1Result, articleResult, user2Result

Promise
    .all([
        user1.save(),
        article.save(),
        user2.save()
    ])
    .then((result) => {
        user1Result = result[0]
        articleResult = result[1]
        user2Result = result[2]

        return user1Result.link(articleResult)  // link two document
    })
    .then(() => {
        return user1Result.getRelation('articles', {title: 'article'})
    })
    .then((relatedArticle) => {
        console.log('relatedArticle', relatedArticle)
    })
    .then(() => {
        return user1Result.link(user2Result).as('friends', true)
    })
    .then((friends) => {
        console.log('friends', friends)
    })