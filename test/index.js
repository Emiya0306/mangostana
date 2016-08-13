const mangostana = require('../')
const test = require('./test')

mangostana.connect('mongodb://localhost/test')

mangostana.createModel('user', { name:  String })
mangostana.createModel('article', { title:  String, content: String })

const user = new mangostana.models.user({ name: 'Zildjian' })
const article1 = new mangostana.models.article({ title: 'article1', content: 'content1' })
const article2 = new mangostana.models.article({ title: 'article2', content: 'content2' })
const article3 = new mangostana.models.article({ title: 'article1', content: 'content3' })

var userResult, article1Result, article2Result, article3Result
var query = { title: 'article1', content: 'content3' }

user.save()
    .then((result) => {
        userResult = result
        return article1.save()
    })
    .then((result) => {
        article1Result = result
        return userResult.link(article1Result)
    })
    .then(() => {
        return article2.save()
    })
    .then((result) => {
        article2Result = result
        return userResult.link(article2Result)
    })
    .then(() => {
        return article3.save()
    })
    .then((result) => {
        article3Result = result
        return userResult.link(article3Result)
    })
    .then(() => {
        return userResult.getRelation('articles', query)
    })
    .then((result) => {
        console.log('userResult.getRelation("article")', result)
    })
    .catch((err) => console.log(err))


