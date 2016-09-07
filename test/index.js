const mangostana = require('../')
const mongoose = require('mongoose')

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